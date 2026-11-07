import test from 'node:test';
import assert from 'node:assert/strict';
import { CUSTOMERS, CHANGE_COINS, newOrder, checkChange, coinsFor } from '../src/systems/cashier.js';
import { PRICES } from '../src/systems/market.js';

test('an order is two to four priced things, paid for with a note that leaves some change', () => {
  for (let i = 0; i < 200; i++) {
    const o = newOrder();
    assert.ok(o.items.length >= 2 && o.items.length <= 4);
    assert.ok(o.items.every(k => PRICES[k]));
    assert.equal(o.total, o.items.reduce((s, k) => s + PRICES[k], 0));
    assert.ok(o.paid > o.total && [5, 10].includes(o.paid));
    assert.equal(o.change, o.paid - o.total);
  }
});

test('any change can be made from the coins in the till', () => {
  for (let c = 1; c <= 9; c++) {
    const can = Array.from({ length: c + 1 }, () => false); can[0] = true;
    for (let v = 1; v <= c; v++) can[v] = CHANGE_COINS.some(k => v >= k && can[v - k]);
    assert.ok(can[c], `change of ${c}`);
  }
  assert.equal(CUSTOMERS, 5);
});

test('change is checked, and slips cost coins', () => {
  const o = { change: 4 };
  assert.deepEqual([checkChange(o, 4), checkChange(o, 3), checkChange(o, 6)], ['right', 'short', 'over']);
  assert.deepEqual([0, 1, 2, 5].map(coinsFor), [2, 1, 0, 0]);
});
