import test from 'node:test';
import assert from 'node:assert/strict';
import { newCusts, wants, stillWants, texters, atCorner, offer, sell, collect, stageOf, customersDaily, cleanCusts, creditLimit } from '../src/systems/hard/customers.js';
import { newHabit, use, useEffect, drain, habitDaily, cleanHabits } from '../src/systems/hard/habit.js';
import { mix } from '../src/systems/hard/lab.js';
import { CUSTOMERS, CUSTOMER_IDS } from '../src/data/hard/customers.js';

const plain = mix('nightbloom', 3), amber = mix('nightbloom', 2, ['amber']), mint = mix('nightbloom', 2, ['mint']), cut = mix('nightbloom', 3, ['cut']);
const DAY = Array.from({ length: 30 }, (_, i) => i + 5);

test('there are six named adults with their own tastes', () => {
  assert.equal(CUSTOMER_IDS.length, 6);
  assert.equal(new Set(CUSTOMER_IDS.map(id => CUSTOMERS[id].name)).size, 6);
  assert.ok(new Set(CUSTOMER_IDS.map(id => CUSTOMERS[id].likes)).size >= 4);
});

test('wanting is deterministic per day, varies across days and people, and never exceeds a few units', () => {
  const c = newCusts();
  assert.equal(wants('dex', c.dex, 9), wants('dex', c.dex, 9));
  const counts = DAY.map(d => CUSTOMER_IDS.filter(id => wants(id, c[id], d) > 0).length);
  assert.ok(Math.min(...counts) < Math.max(...counts));
  for (const d of DAY) for (const id of CUSTOMER_IDS) assert.ok(wants(id, c[id], d) <= 3);
});

test('strangers only turn up at the corner by chance; people who know you text, and come when you have the phone', () => {
  const c = newCusts();
  assert.deepEqual(texters(c, 12), []);
  c.dex = { ...c.dex, trust: 3 }; c.pip = { ...c.pip, hook: 35 };
  const day = DAY.find(d => stillWants('dex', c.dex, d) > 0 && stillWants('pip', c.pip, d) > 0);
  assert.ok(texters(c, day).includes('dex') && texters(c, day).includes('pip'));
  assert.ok(atCorner(c, day, true).includes('dex'));
});

test('tastes: the nurse pays more for calm, the courier for strength, the bar owner refuses cut stock', () => {
  const st = newCusts();
  assert.ok(offer('marta', st.marta, mint).price > offer('marta', st.marta, plain).price);
  assert.ok(offer('dex', st.dex, amber).price > offer('dex', st.dex, plain).price);
  assert.equal(offer('odalys', st.odalys, cut).ok, false);
  assert.equal(offer('odalys', st.odalys, mix('nightbloom', 1, ['mint'])).ok, true);
  assert.equal(offer('pip', st.pip, cut).ok, true, 'the student takes the cheap stuff');
});

test('selling pays cash up to the wallet, builds trust, hooks them, and only what they want today', () => {
  const day = DAY.find(d => wants('dex', newCusts().dex, d) > 0);
  const st = newCusts().dex, want = wants('dex', st, day);
  const r = sell('dex', st, amber, 5, day);
  assert.equal(r.sold, Math.min(want, Math.floor(3500 / offer('dex', st, amber).price)));
  assert.equal(r.cash, r.sold * offer('dex', st, amber).price);
  assert.ok(r.st.trust === 1 && r.st.hook > 0);
  assert.equal(stillWants('dex', r.st, day), want - r.sold);
});

test('calming product hooks less; hooked customers want more and pay a little extra', () => {
  const day = DAY.find(d => wants('dex', newCusts().dex, d) > 0);
  const a = sell('dex', newCusts().dex, plain, 1, day), b = sell('dex', newCusts().dex, mint, 1, day);
  assert.ok(a.st.hook > b.st.hook);
  assert.equal(stageOf(0), 'fine'); assert.equal(stageOf(45), 'hooked'); assert.equal(stageOf(90), 'desperate');
  const hooked = { ...newCusts().jo, hook: 50, trust: 3 };
  assert.ok(offer('jo', hooked, plain).price > offer('jo', newCusts().jo, plain).price);
});

test('credit: a broke customer can take it on the tab, within a limit, and pays it back later', () => {
  const jo = { ...newCusts().jo, hook: 60, trust: 4 };
  const day = DAY.find(d => wants('jo', jo, d) >= 2);
  const poor = { ...jo, owes: 0 };
  const r = sell('jo', poor, amber, 3, day, true);
  assert.ok(r.sold >= 1);
  assert.ok(r.st.owes <= creditLimit('jo'));
  const back = collect('jo', { ...r.st, owes: 500 });
  assert.deepEqual([back.cash, back.st.owes], [500, 0]);
});

test('customers who go without come down slowly; saves are cleaned', () => {
  const c = newCusts(); c.rufus = { ...c.rufus, hook: 20, last: 1 };
  assert.equal(customersDaily(c, 10).rufus.hook, 18);
  assert.equal(customersDaily(c, 2).rufus.hook, 20, 'not yet');
  assert.equal(cleanCusts({ dex: { trust: 99, hook: -4, owes: 'x' }, nobody: {} }).dex.trust, 10);
  assert.equal(Object.keys(cleanCusts(null)).length, 6);
});

test('using it yourself: a lift, a growing hook, then your needs and mood suffer and a day without hurts', () => {
  const e = useEffect(plain);
  assert.ok(e.needs.mood > 20 && e.hook > 0);
  assert.ok(useEffect(mint).hook < e.hook, 'calm is gentler');
  let h = newHabit();
  assert.equal(drain(h.hook), null);
  for (let i = 0; i < 12; i++) h = use(h, plain, 100 + i);
  assert.ok(h.hook >= 40 && drain(h.hook).mood < 0 && drain(h.hook).energy < 0);
  assert.ok(drain(80).mood < drain(40).mood);
  const day = habitDaily(h, h.last + 1500);
  assert.equal(day.withdrawal, true); assert.equal(day.habit.hook, h.hook - 3);
  assert.equal(habitDaily(h, h.last + 100).withdrawal, false, 'used recently');
  assert.deepEqual(cleanHabits({ a: { hook: 200, last: 5 }, b: { hook: 0 } }, ['a', 'b']), { a: { hook: 100, last: 5 } });
});
