import test from 'node:test';
import assert from 'node:assert/strict';
import { SEASON_DAYS, SEASONS, YEAR_DAYS, seasonOf, dayInSeason, weatherAt, hash01, weatherLabel } from '../src/systems/hard/weather.js';
import { warmthRate, tick, status, newNeeds, cleanNeeds } from '../src/systems/hard/needs.js';
import { roughHour, scavengeFind } from '../src/systems/hard/street.js';
import { newGame, step, ask, over, presentability, DURATION, PATIENCE, KINDS } from '../src/systems/hard/begging.js';
import { START_NEEDS, WARM, ACTIONS } from '../src/data/hard/needs.js';

const seeded = seed => { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

test('a season is 28 game days and a year is four of them', () => {
  assert.equal(SEASON_DAYS, 28); assert.equal(YEAR_DAYS, 112);
  assert.deepEqual([0, 27, 28, 56, 84, 111, 112].map(seasonOf), ['Spring', 'Spring', 'Summer', 'Autumn', 'Winter', 'Winter', 'Spring']);
  assert.equal(dayInSeason(0), 1); assert.equal(dayInSeason(27), 28); assert.equal(dayInSeason(28), 1);
  assert.deepEqual(SEASONS.length, 4);
});

test('weather is repeatable, seasonal, and coldest in winter nights', () => {
  assert.deepEqual(weatherAt(10, 800), weatherAt(10, 800));
  assert.ok(hash01(1) >= 0 && hash01(1) < 1 && hash01(1) !== hash01(2));
  const avg = (from, hour) => { let t = 0; for (let d = from; d < from + SEASON_DAYS; d++) t += weatherAt(d, hour * 60).temp; return t / SEASON_DAYS; };
  assert.ok(avg(28, 14) > avg(0, 14) && avg(0, 14) > avg(84, 14), 'summer > spring > winter');
  assert.ok(avg(84, 4) < avg(84, 15), 'colder at 4am than at 3pm');
  assert.ok(avg(84, 4) < 3, 'winter nights are freezing-ish');
  const kinds = new Set(); for (let d = 0; d < 112; d++) for (const h of [2, 8, 14, 20]) kinds.add(weatherAt(d, h * 60).kind);
  assert.ok(kinds.has('rain') && kinds.has('snow') && kinds.has('clear') && kinds.has('cloudy'));
  for (let d = 0; d < 112; d++) if (weatherAt(d, 600).kind === 'snow') assert.ok(weatherAt(d, 600).temp <= 1, 'snow only when freezing');
  assert.match(weatherLabel({ kind: 'rain', temp: 7 }), /7°C/);
});

test('warmth: indoors you warm up; outdoors it depends on the cold and the wet; asleep outside is colder', () => {
  assert.equal(warmthRate(null), 0);
  assert.equal(warmthRate({ outdoors: false, temp: -10, kind: 'snow' }), WARM.indoor);
  assert.ok(warmthRate({ outdoors: true, temp: 22, kind: 'clear' }) > 0, 'a warm day outside is fine');
  const cold = warmthRate({ outdoors: true, temp: 0, kind: 'clear' }), wet = warmthRate({ outdoors: true, temp: 0, kind: 'rain' });
  assert.ok(cold < -8 && wet < cold);
  assert.ok(warmthRate({ outdoors: true, temp: 0, kind: 'clear' }, 'floor') < cold);
  const n = { ...START_NEEDS, warmth: 80 }; tick(n, 10 * 60, { env: { outdoors: true, temp: 0, kind: 'clear' } });
  assert.equal(n.warmth, 0, 'ten hours in the cold: frozen');
  assert.ok(status(n).cold && status(n).freezing);
  const warm = { ...START_NEEDS, warmth: 10 }; tick(warm, 3 * 60, { env: { outdoors: false, temp: -5, kind: 'clear' } });
  assert.ok(warm.warmth >= 40);
  assert.equal(newNeeds().warmth, START_NEEDS.warmth);
  assert.equal(cleanNeeds({ warmth: 500 }).warmth, 100);
});

test('being cold wears the mood down too', () => {
  const a = { ...START_NEEDS, warmth: 80, mood: 80 }, b = { ...START_NEEDS, warmth: 5, mood: 80 };
  tick(a, 60); tick(b, 60);
  assert.ok(a.mood > b.mood);
});

test('sleeping rough: moved on only in the small hours, in public, with police on; robbed only with survival on and cash to take', () => {
  const on = { police: true, survival: true }, never = () => 0, always = () => 0.999;
  assert.deepEqual(roughHour({ hour: 3, cash: 1000, toggles: on }, never).map(e => e.type), ['moveOn', 'theft']);
  assert.deepEqual(roughHour({ hour: 12, cash: 1000, toggles: on }, never).map(e => e.type), ['theft'], 'not moved on in the daytime');
  assert.deepEqual(roughHour({ hour: 3, cash: 0, toggles: on }, never).map(e => e.type), ['moveOn'], 'nothing to steal');
  assert.deepEqual(roughHour({ hour: 3, cash: 1000, toggles: { police: false, survival: false } }, never), [], 'switched off');
  assert.deepEqual(roughHour({ hour: 3, cash: 1000, toggles: on }, always), [], 'and often nothing happens');
  assert.equal(roughHour({ hour: 12, cash: 1000, toggles: on }, never)[0].amount, 300);
  assert.deepEqual(roughHour({ hour: 3, cash: 1000, publicPlace: false, toggles: on }, never).map(e => e.type), ['theft']);
});

test('bins hold scraps, a little cash, or nothing', () => {
  const kinds = new Set(); const r = seeded(7);
  for (let i = 0; i < 200; i++) { const f = scavengeFind(r); kinds.add(f.kind); if (f.kind === 'food') assert.ok(f.nutrition >= 6 && f.nutrition <= 15); if (f.kind === 'cash') assert.ok(f.amount >= 50 && f.amount < 250); }
  assert.deepEqual([...kinds].sort(), ['cash', 'food', 'nothing']);
});

test('begging: ask when they look at you; ask at the wrong time and people get annoyed', () => {
  const g = newGame({ hygiene: 100, mood: 100 }, seeded(3));
  let earned = 0, annoyed = 0, dt = 0.05;
  for (let t = 0; t < DURATION && !over(g); t += dt) {
    step(g, dt);
    const p = g.passers.find(q => q.looking && !q.asked);
    if (p) { const r = ask(g, p.id); if (r.result === 'coin') earned += r.amount; }
  }
  assert.ok(earned > 0 && earned === g.earned, `earned ${earned}`);
  assert.equal(g.patience, PATIENCE, 'asking at the right moment never annoys');
  const h = newGame({}, seeded(5));
  let early = null;
  for (let i = 0; i < 100 && !early; i++) { step(h, 0.05); early = h.passers.find(p => !p.looking && !p.asked); }
  assert.ok(early, 'someone is walking by, not looking');
  assert.equal(ask(h, early.id).result, 'annoyed');
  assert.equal(h.patience, PATIENCE - 1);
  assert.equal(ask(h, 99999).result, 'none');
  for (let i = 0; i < 600 && !over(h); i++) { step(h, 0.05); const x = h.passers.find(p => !p.asked && !p.looking); if (x) ask(h, x.id); }
  assert.ok(over(h), 'out of patience ends it');
});

test('a clean, cheerful beggar does better than a filthy, miserable one', () => {
  const run = needs => { let total = 0; for (let seed = 1; seed <= 25; seed++) { const g = newGame(needs, seeded(seed)); for (let t = 0; t < DURATION && !over(g); t += 0.05) { step(g, 0.05); const p = g.passers.find(q => q.looking && !q.asked); if (p) ask(g, p.id); } total += g.earned; } return total; };
  assert.ok(presentability({ hygiene: 100, mood: 100 }) > presentability({ hygiene: 0, mood: 0 }));
  assert.ok(run({ hygiene: 100, mood: 100 }) > run({ hygiene: 0, mood: 0 }) * 1.2);
  assert.ok(KINDS.kind.give > KINDS.neutral.give && KINDS.neutral.give > KINDS.hurried.give);
});

test('the new actions exist: rough sleeping, scavenging, begging, day labour and the meal line', () => {
  for (const a of ['rough', 'scavenge', 'beg', 'labour', 'queue']) assert.ok(ACTIONS[a], a);
  assert.equal(ACTIONS.beg.minigame, 'beg'); assert.equal(ACTIONS.work.minigame, 'stack');
});
