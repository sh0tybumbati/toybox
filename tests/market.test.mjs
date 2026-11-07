import test from 'node:test';
import assert from 'node:assert/strict';
import { PRICES, priceOf, deliveryFee } from '../src/systems/market.js';
import { addParcel, takeParcels, cleanParcels } from '../src/systems/mail.js';
import { ROOMS } from '../src/data/rooms.js';
import { CATALOG } from '../src/data/items.js';
import { starterCity } from '../src/data/buildings.js';

test('everything on the supermarket shelves has a price, and only real items are priced', () => {
  for (const sh of ROOMS.market.shelves) for (const k of sh.items) assert.ok(priceOf(k) >= 1, `${k} has a price`);
  for (const k of Object.keys(PRICES)) assert.ok(CATALOG[k], `${k} is a real item`);
  assert.equal(priceOf('teddy'), 0, 'other shelves stay free');
});

test('the delivery fee grows with distance, and is never free', () => {
  const slots = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 800, y: 0 }];
  assert.equal(deliveryFee(0, 1, slots), 1);
  assert.equal(deliveryFee(0, 2, slots), 3);
  assert.equal(deliveryFee(0, 9, slots), 1, 'unknown lot: the base fee');
  assert.ok(deliveryFee(0, 1) >= 1);
});

test('groceries remember which building the van set off from', () => {
  let p = addParcel([], 'milk', 2, 1);
  p = addParcel(p, 'ball', 2);
  assert.deepEqual(p, [{ k: 'milk', to: 2, from: 1 }, { k: 'ball', to: 2 }]);
  assert.deepEqual(takeParcels(p, 2).delivered, ['milk', 'ball']);
  const city = starterCity();
  assert.deepEqual(cleanParcels([{ k: 'milk', to: 2, from: 1 }, { k: 'milk', to: 2, from: 9 }], k => Boolean(CATALOG[k]), city),
    [{ k: 'milk', to: 2, from: 1 }, { k: 'milk', to: 2 }]);
});
