import test from 'node:test';
import assert from 'node:assert/strict';
import { GIGS, GIG_IDS, ARRIVE_WITHIN, LATE_UNTIL, SHIFT_MINUTES } from '../src/data/hard/gigs.js';
import { pickGig, standing, payFor, cleanGig, travelMinutes } from '../src/systems/hard/gig.js';
import { newGame, step, drop, performance, WIDTH, START_W, MIN_W } from '../src/systems/hard/stacker.js';
import { SLOTS } from '../src/data/buildings.js';

test('the board offers the same gig all day, different ones on different days, each at a real kind of place', () => {
  assert.deepEqual(pickGig(5, 7 * 60), { ...pickGig(5, 7 * 60) });
  assert.equal(pickGig(5, 100).id, pickGig(5, 900).id);
  assert.ok(new Set(Array.from({ length: 30 }, (_, d) => pickGig(d, 0).id)).size >= 3, 'variety');
  for (const g of GIGS) assert.ok(['market', 'postoffice', 'shelter', 'park'].includes(g.site) && g.pay > 0, g.id);
  const g = pickGig(2, 1000); assert.equal(g.due, 1000 + ARRIVE_WITHIN);
  assert.ok(SHIFT_MINUTES >= 60);
});

test('on time pays in full, late pays less, and much too late there is no work', () => {
  const g = { ...pickGig(1, 0), pay: 1000, taken: 0, due: 150 };
  assert.deepEqual([standing(g, 100), standing(g, 150), standing(g, 151), standing(g, 150 + LATE_UNTIL), standing(g, 150 + LATE_UNTIL + 1)], ['ontime', 'ontime', 'late', 'late', 'gone']);
  const best = payFor(g, 100, 10), poor = payFor(g, 100, 0), late = payFor(g, 160, 10), later = payFor(g, 150 + LATE_UNTIL, 10);
  assert.equal(best, 1300); assert.equal(poor, 700);
  assert.ok(late < best * 0.65 && later < late && later >= 500, `late ${late}, later ${later}`);
  assert.equal(payFor(g, 400, 10), 0, 'they found someone else');
  assert.ok(payFor(g, 100, 99) === best && payFor(g, 100, -3) === poor, 'performance is clamped');
});

test('saved gigs are repaired', () => {
  const g = pickGig(3, 500);
  assert.deepEqual(cleanGig(g), g);
  assert.equal(cleanGig({ id: 'nonsense', taken: 1, due: 2 }), null); assert.equal(cleanGig(null), null); assert.equal(cleanGig({ id: 'unload', taken: 'x', due: 2 }), null);
  assert.equal(cleanGig({ ...g, pay: 999999 }).pay, GIGS.find(x => x.id === g.id).pay, 'pay comes from the data, not the save');
});

test('walking across the city takes game time', () => {
  assert.ok(travelMinutes(SLOTS[0], SLOTS[1]) >= 5 && travelMinutes(SLOTS[0], SLOTS[1]) <= 15);
  assert.ok(travelMinutes(SLOTS[0], SLOTS[11]) > travelMinutes(SLOTS[0], SLOTS[1]));
  assert.equal(travelMinutes(SLOTS[0], SLOTS[0]), 5, 'even next door is five minutes');
  assert.equal(travelMinutes(null, SLOTS[1]), 0);
});

test('crate stacking: a good drop stays, a sloppy one is trimmed, a miss ends it', () => {
  const g = newGame(() => 0.5);
  assert.equal(g.stack.length, 1); assert.equal(g.w, START_W);
  g.x = g.stack[0].x;                                              // dead on
  assert.equal(drop(g), 'perfect'); assert.equal(g.w, START_W); assert.equal(g.score, 1);
  g.x = g.stack[g.stack.length - 1].x + 40;                        // off by 40: trimmed
  assert.equal(drop(g), 'ok'); assert.equal(g.w, START_W - 40); assert.equal(g.score, 2);
  g.x = WIDTH - g.w; g.stack[g.stack.length - 1].x = 0; g.stack[g.stack.length - 1].w = 20;
  assert.equal(drop(g), 'miss'); assert.ok(g.over);
  assert.equal(drop(g), 'miss', 'nothing after the end');
});

test('the swinging crate bounces between the walls and speeds up; the pay performance rewards stacking and neatness', () => {
  const g = newGame();
  const seen = new Set();
  for (let i = 0; i < 400; i++) { step(g, 0.02); seen.add(g.dir); assert.ok(g.x >= 0 && g.x + g.w <= WIDTH + 0.001); }
  assert.equal(seen.size, 2, 'it turns round');
  const s0 = g.speed; g.x = g.stack[0].x; drop(g); assert.ok(g.speed > s0);
  const a = { score: 4, perfect: 0 }, b = { score: 4, perfect: 3 }, c = { score: 20, perfect: 9 };
  assert.ok(performance(b) > performance(a)); assert.equal(performance(c), 10);
  assert.ok(MIN_W > 0);
});
