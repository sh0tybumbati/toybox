import test from 'node:test';
import assert from 'node:assert/strict';
import { CAREERS, CAREER_IDS, COURSES, HOBBY_CAP, LATE } from '../src/data/hard/careers.js';
import { addSkill, arrive, autoPerformance, cleanWork, decay, finishShift, hire, hobbySession, listings, missingForNext, newWork, nextShift, payslip, promote, promotionOffered, shiftNow, shiftPay, takeCourse, tickShifts, weeklyPay, whyNotHire, worked } from '../src/systems/hard/careers.js';

const env = (o = {}) => ({ day: 20, hygiene: 80, phone: true, dirty: false, record: false, ...o });
const worker = (career = 'retail') => { const w = newWork(); hire(w, career, 0, CAREERS[career].employers[0], 1); return w; };

test('every rung names a real course and a known kind of shift, with rungs rising in skill and shifts', () => {
  for (const id of CAREER_IDS) {
    const c = CAREERS[id];
    assert.equal(c.rungs.length, 4);
    c.rungs.forEach((r, i) => {
      if (r.course) assert.ok(COURSES[r.course], `${id} rung ${i} course ${r.course}`);
      assert.ok(['stack', 'till', 'beds', 'auto'].includes(r.play));
      if (i) { assert.ok(r.skill > c.rungs[i - 1].skill); assert.ok(r.shifts > c.rungs[i - 1].shifts); }
    });
  }
  for (const c of Object.values(COURSES)) assert.ok(c.price > 0 && c.hours === 6);
});

test('weekly pay at five shifts rises by rung and lands in the balance bands (careers-spec 1.2, 3)', () => {
  const bands = [6750, 9000, 12500], top = { retail: 17500, trades: 18250, farming: 16500, public: 19500 };
  for (const id of CAREER_IDS) {
    const weekly = [0, 1, 2, 3].map(i => weeklyPay(id, i));
    weekly.forEach((n, i) => { const target = i === 3 ? top[id] : bands[i]; assert.ok(i === 0 || n > weekly[i - 1], `${id} rises`); assert.ok(Math.abs(n - target) / target <= 0.1, `${id} rung ${i}: ${n} vs ${target}`); });
  }
});

test('lateness: pay share and strikes by minutes late, three strikes in 14 days sack, spread out they do not', () => {
  assert.deepEqual([0, 30, 90, 130].map(m => LATE.find(r => m <= r.upTo).pay), [1, 0.7, 0.4, 0]);
  const w = worker();
  assert.deepEqual([0, 30, 90, 130].map(m => arrive(newWork(), m, 5).strikes), [0, 1, 1, 2]);
  assert.equal(arrive(w, 30, 10).sacked, false);
  assert.equal(arrive(w, 90, 11).sacked, false);
  const last = arrive(w, 30, 12);
  assert.equal(last.sacked, true); assert.equal(w.job, null); assert.equal(w.sackedAt.market, 12);
  const slow = worker();
  arrive(slow, 30, 1); arrive(slow, 30, 16); const third = arrive(slow, 30, 31);
  assert.equal(third.sacked, false, 'strikes 15 days apart fall away');
  const none = worker(); assert.equal(arrive(none, 0, 3).pay, 1); assert.equal(none.strikes.length, 0);
});

test('promotion needs the skill, the shifts and the certificate; accepting changes the pay', () => {
  const w = worker();
  assert.equal(promotionOffered(w), false);
  w.skills.retail = 30; w.job.shifts = 10;
  assert.deepEqual(missingForNext(w), ['Food hygiene']);
  takeCourse(w, 'hygiene'); assert.equal(promotionOffered(w), true);
  for (const bad of [() => { w.skills.retail = 20; }, () => { w.skills.retail = 30; w.job.shifts = 9; }]) { bad(); assert.equal(promotionOffered(w), false); }
  w.skills.retail = 30; w.job.shifts = 10;
  const before = shiftPay(w, 100, 0);
  assert.equal(promote(w), true); assert.equal(w.job.rung, 1); assert.equal(w.job.shifts, 0);
  assert.ok(shiftPay(w, 100, 0) > before);
  assert.equal(promote(w), false, 'the next rung is not yet earned');
});

test('hiring refuses what the spec says and always takes an entry rung otherwise', () => {
  const w = newWork();
  assert.equal(whyNotHire(w, 'retail', 0, 'market', env()), '');
  assert.match(whyNotHire(w, 'retail', 1, 'market', env()), /Food hygiene/);
  w.certs.push('hygiene'); assert.match(whyNotHire(w, 'retail', 1, 'market', env()), /skill 25/);
  w.skills.retail = 25; assert.equal(whyNotHire(w, 'retail', 1, 'market', env()), '');
  assert.match(whyNotHire(w, 'retail', 0, 'market', env({ phone: false })), /number/);
  assert.match(whyNotHire(w, 'retail', 0, 'market', env({ hygiene: 39 })), /clean/);
  assert.match(whyNotHire(w, 'retail', 0, 'market', env({ dirty: true })), /clean/);
  w.sackedAt.market = 15; assert.match(whyNotHire(w, 'retail', 0, 'market', env()), /back/);
  assert.equal(whyNotHire(w, 'retail', 0, 'market', env({ day: 22 })), '');
  assert.match(whyNotHire(newWork(), 'public', 0, 'council', env({ record: true })), /record/);
  assert.equal(whyNotHire(newWork(), 'retail', 0, 'postoffice', env({ record: true })), '', 'a record only blocks careers that say so');
  assert.match(whyNotHire(worker(), 'retail', 0, 'market', env()), /already/);
});

test('skill: +3, +1 or +0 a shift, falls only after four weeks away, hobbies are capped', () => {
  const w = worker();
  assert.equal(worked(w, 110, 0, 2), 3); assert.equal(worked(w, 80, 0, 3), 1); assert.equal(worked(w, 100, 90, 4), 0);
  assert.equal(w.skills.retail, 4); assert.equal(w.job.shifts, 3);
  w.job = null; w.skills.retail = 10;
  decay(w, 4 + 27); assert.equal(w.skills.retail, 10, 'under four weeks: nothing');
  decay(w, 4 + 28); assert.equal(w.skills.retail, 9);
  decay(w, 4 + 30); assert.equal(w.skills.retail, 9, 'once a week, not every day');
  decay(w, 4 + 35); assert.equal(w.skills.retail, 8);
  const h = newWork();
  for (let n = 0; n < 20; n++) hobbySession(h, 'cooking');
  assert.equal(h.hobby.retail, HOBBY_CAP); assert.equal(h.skills.retail, HOBBY_CAP);
  assert.equal(hobbySession(h, 'nothing'), 0);
  assert.equal(addSkill(h, 'retail', 500), 100);
});

test('shift pay and auto performance stay in their bands', () => {
  const w = worker();
  assert.equal(shiftPay(w, 100, 0), 1350); assert.equal(shiftPay(w, 130, 0), 1760); assert.equal(shiftPay(w, 100, 30), 950); assert.equal(shiftPay(w, 100, 200), 0);
  for (const skill of [0, 50, 100]) for (const roll of [0, 0.5, 1]) { const p = autoPerformance(skill, () => roll); assert.ok(p >= 70 && p <= 130); }
  assert.ok(autoPerformance(80, () => 0.5) > autoPerformance(0, () => 0.5));
});

test('the board is the same all day, always has an entry job you can take, and shows what is out of reach', () => {
  const w = newWork();
  for (let day = 0; day < 40; day++) {
    const a = listings(w, day), b = listings(w, day);
    assert.deepEqual(a, b); assert.equal(a.length, 4);
    assert.ok(a.some(l => l.rung === 0 && !l.why), `day ${day} has an entry rung`);
    assert.ok(a.some(l => l.why), `day ${day} shows one out of reach`);
  }
  assert.ok(listings(w, 3, { record: true }).filter(l => !l.why).every(l => l.career !== 'public'));
});

test('saves: a pre-careers hard block loads empty, bad data is cleaned', () => {
  assert.deepEqual(cleanWork(undefined), newWork());
  const w = cleanWork({ skills: { retail: 999, nope: 4 }, certs: ['hygiene', 'hygiene', 'zzz'], strikes: [3, 'x'], job: { career: 'retail', rung: 9, employer: 'market' }, sackedAt: { market: 4, 'BAD!': 1 } });
  assert.equal(w.skills.retail, 100); assert.deepEqual(w.certs, ['hygiene']); assert.deepEqual(w.strikes, [3]); assert.equal(w.job, null); assert.deepEqual(w.sackedAt, { market: 4 });
  const ok = cleanWork({ job: { career: 'retail', rung: 1, employer: 'shelter', shifts: 4, since: 2 } });
  assert.equal(ok.job.rung, 1); assert.equal(ok.job.shifts, 4);
});

test('the rota: the shift appears on its days, a no-show earns two strikes, working it pays and counts', () => {
  const w = worker('retail');                       // Mon-Fri 09:00
  assert.deepEqual(tickShifts(w, 0 * 1440 + 8 * 60), []);
  assert.equal(w.shift.start, 9 * 60);
  assert.equal(shiftNow(w, 8 * 60 + 30, 'market').late, 0, 'early is not late');
  assert.equal(shiftNow(w, 8 * 60 + 30, 'shelter'), null, 'wrong workplace');
  assert.equal(shiftNow(w, 6 * 60, 'market'), null, 'too early to start');
  assert.equal(nextShift(w, 10 * 60).day, 0, 'under way: still today');
  const r = finishShift(w, 100, 30, 0);
  assert.equal(nextShift(w, 10 * 60).day, 1, 'done: tomorrow');
  assert.equal(r.pay, 950); assert.equal(r.strikes, 1); assert.equal(w.owed, 950); assert.equal(w.job.shifts, 1);
  assert.equal(shiftNow(w, 10 * 60, 'market'), null, 'done today');
  assert.equal(payslip(w), 950); assert.equal(w.owed, 0);
  const idle = worker('retail');
  tickShifts(idle, 1 * 1440); const ev = tickShifts(idle, 1 * 1440 + 9 * 60 + 130);
  assert.deepEqual(ev, [{ type: 'noshow', strikes: 2, sacked: false }]);
  assert.equal(idle.strikes.length, 2);
  assert.deepEqual(tickShifts(idle, 1 * 1440 + 9 * 60 + 200), [], 'only once');
  const sat = worker('retail'); tickShifts(sat, 5 * 1440 + 8 * 60); assert.equal(sat.shift, null, 'no shift on a Saturday');
  assert.equal(nextShift(sat, 5 * 1440 + 8 * 60).day, 7);
});

test('every adult scenario has the workplaces; an older adult town gets the Council Hall, the College and work at the Garden Centre', async () => {
  const { SCENARIOS, upgradeHardCity } = await import('../src/data/hard/scenarios.js');
  const { migrate, sanitize } = await import('../src/systems/save.js');
  const { newHardSave } = await import('../src/data/hard/start.js');
  const { EMPLOYER_NAMES } = await import('../src/data/hard/careers.js');
  const types = city => city.filter(Boolean).flatMap(b => b.floors.flatMap(f => f.rooms.map(r => r.type)));
  for (const [id, sc] of Object.entries(SCENARIOS)) {
    const city = sc.city(), here = types(city);
    for (const career of CAREER_IDS) for (const e of CAREERS[career].employers) assert.ok(here.includes(e), `${id}: a ${e} for ${career}`);
    assert.ok(here.includes('college'), `${id} college`);
    const props = city.filter(Boolean).flatMap(b => b.floors.flatMap(f => f.rooms.flatMap(r => (r.extra || []).map(x => x.type))));
    assert.ok(props.includes('classroom'));
    for (const e of Object.keys(EMPLOYER_NAMES).filter(k => k !== 'college')) assert.ok(city.filter(Boolean).some(b => b.floors[0].rooms[0].type === e && (b.floors[0].rooms[0].extra || []).some(x => x.type === 'worksite')), `${id}: ${e} has a work site`);
  }
  const old = SCENARIOS.flat.city().map(b => (b && (b.name === 'Council Hall' || b.name === 'College') ? null : b));
  const g = old.find(b => b && b.floors[0].rooms[0].type === 'nursery'); g.floors[0].rooms[0].extra = [];
  const up = upgradeHardCity(old);
  assert.ok(up.some(b => b && b.name === 'Council Hall') && up.some(b => b && b.name === 'College'));
  assert.ok(up.find(b => b && b.floors[0].rooms[0].type === 'nursery').floors[0].rooms[0].extra.some(x => x.type === 'worksite'));
  const save = newHardSave({ scenario: 'flat' });
  const v13 = { ...save, v: 13, city: old };
  assert.equal(migrate(v13).v, 16);
  const loaded = sanitize(v13);
  assert.deepEqual(loaded.hard.work, {}); assert.deepEqual(loaded.hard.slips, []);
  assert.ok(loaded.city.some(b => b && b.name === 'College'));
  const kid = migrate({ v: 13, zone: '0.0', city: [], coins: 3, characters: [] });
  assert.equal(kid.v, 16); assert.equal(kid.hard, undefined);
});
