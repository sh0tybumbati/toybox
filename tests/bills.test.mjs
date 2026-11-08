import test from 'node:test';
import assert from 'node:assert/strict';
import { HOUSING, TIERS, LATE_FEE, HOMES, billLabel } from '../src/data/hard/housing.js';
import { newHome, tickBills, totalDue, overdue, unseen, pay, rent, cleanBills, cleanHome } from '../src/systems/hard/bills.js';
import { BLUEPRINTS } from '../src/data/buildings.js';

const fresh = (tier = 'flat', next = 0) => ({ home: newHome(tier, 0, next), bills: [], billId: 0, debt: 0, lockedOut: null });

test('motels and flats bill weekly, houses monthly, and the money works out', () => {
  assert.deepEqual(TIERS, ['motel', 'flat', 'house']);
  assert.equal(HOUSING.motel.cycle, 7); assert.equal(HOUSING.flat.cycle, 7); assert.equal(HOUSING.house.cycle, 28);
  for (const t of TIERS) assert.ok(HOUSING[t].due >= 1 && HOUSING[t].grace >= 1 && HOUSING[t].bills.length >= 1, t);
  const perDay = t => HOUSING[t].bills.reduce((n, [, a]) => n + a, 0) / HOUSING[t].cycle;
  assert.ok(perDay('motel') < 1200 * 0.5, 'a motel room costs under half a day-labour wage per day');
  assert.ok(perDay('house') > perDay('flat') && perDay('flat') > perDay('motel') * 0.9, 'higher levels cost more');
  assert.equal(billLabel('rent', 'house'), 'Mortgage and tax'); assert.equal(billLabel('rent', 'flat'), 'Rent');
});

test('the homes you can live in are the flat, the cottage/house and the motel', () => {
  assert.deepEqual(Object.keys(HOMES).sort(), ['cottage', 'flat', 'motel']);
  for (const bp of Object.keys(HOMES)) assert.ok(BLUEPRINTS[bp], bp);
});

test('bills are issued every cycle, due a few days later, and a late one costs 10% more', () => {
  const h = fresh('flat', 0);
  assert.deepEqual(tickBills(h, 0).map(e => e.type), ['issued']);
  assert.equal(h.bills.length, 2); assert.equal(totalDue(h.bills), 4900);
  assert.equal(h.home.next, 7);
  assert.equal(h.bills[0].due, 3);
  assert.deepEqual(tickBills(h, 3), [], 'on the due day nothing happens yet');
  const ev = tickBills(h, 4);
  assert.deepEqual(ev.map(e => e.type), ['late', 'late']);
  assert.equal(h.bills[0].amount, 4200 + Math.ceil(4200 * LATE_FEE));
  assert.deepEqual(tickBills(h, 5), [], 'a late fee is charged once');
  assert.equal(overdue(h.bills, 5).length, 2); assert.equal(unseen(h.bills).length, 2);
});

test('unpaid, a motel tenant is late, then evicted: the locks change and what was owed becomes debt', () => {
  const h = fresh('motel', 0);
  tickBills(h, 0);
  assert.deepEqual(tickBills(h, 3).map(e => e.type), ['late']);
  assert.deepEqual(tickBills(h, 5), [], 'still in the grace days');
  const owed = totalDue(h.bills);
  const out = tickBills(h, 6).find(e => e.type === 'evicted');
  assert.ok(out, 'evicted on day 6');
  assert.equal(h.home, null); assert.equal(h.lockedOut, 0); assert.deepEqual(h.bills, []);
  assert.equal(h.debt, owed); assert.equal(out.owed, owed);
  assert.deepEqual(tickBills(h, 40), [], 'no home, no bills');
});

test('a tenant who pays stays: the next week brings the next bills', () => {
  const h = fresh('flat', 0);
  tickBills(h, 0);
  h.bills = pay(h.bills, 99999).bills;
  assert.deepEqual(tickBills(h, 6), []);
  assert.deepEqual(tickBills(h, 7).map(e => e.type), ['issued']);
  assert.equal(h.bills.length, 2); assert.equal(h.home.next, 14);
});

test('a monthly house is billed once every 28 days, due 10 days later', () => {
  const h = fresh('house', 0);
  tickBills(h, 0); assert.equal(h.bills.length, 2); assert.equal(h.bills[0].due, 10);
  h.bills = pay(h.bills, 999999).bills;
  for (let d = 1; d < 28; d++) assert.deepEqual(tickBills(h, d), [], `nothing on day ${d}`);
  tickBills(h, 28); assert.equal(h.bills.length, 2); assert.equal(h.home.next, 56);
});

test('paying: oldest first, only what you can afford, or just the ones you pick', () => {
  const bills = [{ id: 1, kind: 'rent', amount: 3200, due: 5 }, { id: 2, kind: 'utilities', amount: 700, due: 2 }, { id: 3, kind: 'rent', amount: 3200, due: 12 }];
  const all = pay(bills, 10000);
  assert.equal(all.paid, 7100); assert.equal(all.cash, 2900); assert.equal(all.bills.length, 0);
  const some = pay(bills, 4000);
  assert.deepEqual(some.bills.map(b => b.id), [3], 'utilities (oldest) and the first rent: 3900'); assert.equal(some.cash, 100);
  assert.deepEqual(pay(bills, 5000, [3]).bills.map(b => b.id).sort(), [1, 2], 'just the one picked');
  assert.equal(pay(bills, 100).paid, 0);
});

test('renting a room: you pay the first period now and the next bill comes a cycle later', () => {
  const r = rent('motel', 4, 5000, 10);
  assert.equal(r.cost, 3200); assert.equal(r.cash, 1800); assert.deepEqual(r.home, { slot: 4, tier: 'motel', next: 17 });
  assert.equal(rent('motel', 4, 3000, 10), null, 'not enough cash');
  assert.equal(rent('flat', 1, 4900, 0).cost, 4900);
});

test('saved bills and homes are repaired', () => {
  assert.deepEqual(cleanBills([{ id: 1, kind: 'rent', amount: 99.7, issued: 0, due: 3 }, { kind: 'x' }, null]), [{ id: 1, kind: 'rent', amount: 99, issued: 0, due: 3, late: false, seen: false }]);
  assert.deepEqual(cleanHome({ slot: 2, tier: 'flat', next: 9.9 }), { slot: 2, tier: 'flat', next: 9 });
  assert.equal(cleanHome({ slot: 2, tier: 'castle', next: 1 }), null); assert.equal(cleanHome({ slot: 99, tier: 'flat', next: 1 }), null); assert.equal(cleanHome(null), null);
});
