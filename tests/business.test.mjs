import test from 'node:test';
import assert from 'node:assert/strict';
import { BIZ, BIZ_BLUEPRINTS, BIZ_TYPES, MAX_STAFF, MARKUPS, STAFF_PAY_DAYS } from '../src/data/hard/business.js';
import { bizDaily, candidate, capacityOf, cleanBiz, collect, fire, hire, newBiz, priceFactor, raise, repFactor, setMarkup, shiftedOn, walkOut, workShift } from '../src/systems/hard/business.js';
import { acquireLot, lotPrice, whyNotBuyLot } from '../src/systems/hard/property.js';
import { starterCity, BLUEPRINTS } from '../src/data/buildings.js';
import { whyNotLet } from '../src/systems/hard/landlord.js';
import { LOT_PRICE } from '../src/data/hard/property.js';

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const worker = (skill = 50, rel = 100, wage = 6000) => ({ name: 'W', role: 'Assistant', skill, rel, wage, next: 7, happy: 70, sick: false });
const hired = (n, skill) => { const b = newBiz('shop', 0); for (let i = 0; i < n; i++) b.staff.push(worker(skill)); return b; };

test('three businesses, each with its own premises blueprint', () => {
  assert.deepEqual(BIZ_TYPES, ['shop', 'workshop', 'farm']);
  for (const t of BIZ_TYPES) { const bp = BLUEPRINTS[BIZ[t].blueprint]; assert.ok(bp && bp.biz === t && bp.cost === null, t); assert.equal(BIZ_BLUEPRINTS[BIZ[t].blueprint], t); }
  assert.ok(BIZ.farm.cogs < BIZ.shop.cogs, 'a farm keeps more of what it sells');
});

test('capacity: skilled staff who turn up, your own shift, and a limit', () => {
  assert.equal(capacityOf([], false), 0);
  assert.equal(capacityOf([worker(50)], false), 0.5);
  assert.equal(capacityOf([worker(100)], false), 1);
  assert.equal(capacityOf([worker(50, 100)], true), 0.5 + 0.6);
  assert.equal(capacityOf([{ ...worker(100), sick: true }], false), 0, 'someone off sick adds nothing');
  assert.equal(capacityOf([worker(100), worker(100), worker(100)], true), 1.3);
});

test('prices: a little over the going rate earns more, a lot over earns less than that', () => {
  assert.equal(priceFactor(0), 1);
  assert.ok(priceFactor(20) > 1 && priceFactor(-20) < 1);
  assert.ok(priceFactor(40) < priceFactor(30) + 0.05);
  assert.ok(repFactor(100) > repFactor(0));
  assert.deepEqual([0, 1, 2].map(() => 0).length, 3);
});

test('a day: no staff and no shift earns nothing and costs reputation; a shift or staff earns', () => {
  const none = newBiz('shop', 0), r0 = bizDaily(none, 1, () => 0.99);
  assert.equal(r0.revenue, 0); assert.ok(none.rep < 50);
  const solo = newBiz('shop', 0), r1 = bizDaily(solo, 1, () => 0.99, { shifted: true });
  assert.equal(r1.revenue, Math.round(BIZ.shop.base * 0.6)); assert.equal(solo.till, r1.revenue - r1.cogs); assert.ok(r1.profit > 0);
  const staffed = hired(2, 60), r2 = bizDaily(staffed, 1, () => 0.99);
  assert.ok(r2.revenue > 0 && staffed.till > 0);
  assert.deepEqual(r2.events.filter(e => e.type === 'sick'), [], 'reliable staff show up');
  const flaky = hired(1, 60); flaky.staff[0].rel = 0;
  assert.equal(bizDaily(flaky, 1, () => 0).revenue, 0, 'an unreliable worker can call in sick');
});

test('wages come out of the till each week; what the till cannot cover is owed, and unpaid staff walk out', () => {
  const b = hired(1, 60); b.staff[0].wage = 6000; b.till = 100000;
  const r = bizDaily(b, 7, () => 0.99);
  assert.equal(r.owed, 0); assert.equal(b.staff[0].next, 7 + STAFF_PAY_DAYS);
  assert.ok(b.till < 100000 + r.revenue);
  const poor = hired(1, 0); poor.staff[0].wage = 6000; poor.till = 1000;
  const r2 = bizDaily(poor, 7, () => 0.99);
  assert.equal(r2.owed, 5000, 'the till paid what it had'); assert.equal(r2.unpaid.length, 1);
  assert.equal(walkOut(poor, r2.unpaid)[0].type, 'quit'); assert.equal(poor.staff.length, 0);
});

test('hiring: a vacancy draws applicants, you hire up to three, and a wage below the going rate makes people unhappy and then quit', () => {
  const b = newBiz('shop', 0); b.vacancy = true;
  const ev = bizDaily(b, 1, seq(0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5));
  assert.ok(ev.events.some(e => e.type === 'candidate')); assert.equal(b.candidates.length, 1);
  const c = candidate(seq(0.5, 0.5, 0.5, 0.5, 0.5, 0.5), 3); assert.ok(c.wage > 4000 && c.skill > 15 && c.rel >= 0);
  const s = hire(b, 0, 2); assert.equal(s.next, 2 + STAFF_PAY_DAYS); assert.equal(b.staff.length, 1);
  for (let i = 0; i < 2; i++) { b.candidates.push(candidate(() => 0.5, 2)); hire(b, 0, 2); }
  assert.equal(b.staff.length, MAX_STAFF); assert.equal(b.vacancy, false, 'full: the vacancy closes'); assert.equal(hire(b, 0, 2), null);
  const w = raise(b, 0); assert.ok(w > 0);
  assert.equal(fire(b, 0).name.length > 0, true); assert.equal(b.staff.length, MAX_STAFF - 1);
  const cheap = hired(1, 100); cheap.staff[0].wage = 1000; cheap.staff[0].happy = 1;
  const r = bizDaily(cheap, 1, () => 0.99); assert.ok(r.events.some(e => e.type === 'quit'));
});

test('markup steps along the list, your shift counts once a day, and the till is collected', () => {
  const b = newBiz('farm', 0);
  assert.equal(setMarkup(b, 2), 20); assert.equal(setMarkup(b, 99), MARKUPS[MARKUPS.length - 1]); assert.equal(setMarkup(b, -99), MARKUPS[0]);
  assert.equal(workShift(b, 5), true); assert.equal(workShift(b, 5), false); assert.equal(shiftedOn(b, 5), true); assert.equal(shiftedOn(b, 4), false);
  b.till = 1234; assert.equal(collect(b), 1234); assert.equal(b.till, 0); b.till = -50; assert.equal(collect(b), 0);
});

test('buying a lot for a business: the lot plus the fit-out, owned, with a desk, and it is not a house to let', () => {
  const city = starterCity();
  const key = BIZ.shop.blueprint;
  assert.equal(lotPrice(key), LOT_PRICE + BIZ.shop.fitout);
  assert.equal(whyNotBuyLot(city, 5, key, 1e9), ''); assert.match(whyNotBuyLot(city, 5, key, 10), /more/);
  acquireLot(city, 5, key, 12);
  const b = city[5];
  assert.equal(b.owned, true); assert.equal(b.biz.type, 'shop'); assert.equal(b.biz.open, 12); assert.ok(b.floors[0].rooms[0].extra.some(p => p.type === 'bizdesk'));
  assert.equal(whyNotLet(b, null, 5), 'it is a business');
  acquireLot(city, 8, BIZ.farm.blueprint); assert.ok(city[8].floors[0].rooms[0].extra.filter(p => p.type === 'gardenbed').length >= 2);
});

test('saved businesses are cleaned', () => {
  assert.equal(cleanBiz(null), null); assert.equal(cleanBiz({ type: 'casino' }), null);
  const b = cleanBiz({ type: 'shop', till: 5.7, rep: 900, markup: 33, staff: [worker(500, 500), null, worker(), worker(), worker()], candidates: [{ name: 'x', skill: 40, wage: 5000, day: 2 }], last: { day: 3, revenue: 10, profit: -4 } });
  assert.equal(b.rep, 100); assert.equal(b.markup, 0); assert.equal(b.staff.length, MAX_STAFF); assert.equal(b.staff[0].skill, 100); assert.equal(b.candidates.length, 1); assert.equal(b.last.profit, -4);
});
