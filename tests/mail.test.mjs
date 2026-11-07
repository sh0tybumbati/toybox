import test from 'node:test';
import assert from 'node:assert/strict';
import { destinations, addParcel, takeParcels, cleanParcels, MAX_PARCELS } from '../src/systems/mail.js';
import { starterCity } from '../src/data/buildings.js';
import { CATALOG } from '../src/data/items.js';

test('you can post to any building, by lot', () => {
  const city = starterCity();
  assert.deepEqual(destinations(city).map(d => d.name), ['Home', 'Park', 'Shop']);
  assert.deepEqual(destinations(city).map(d => d.slot), [0, 1, 2]);
});

test('parcels pile up to a limit, and are handed over when you reach their building', () => {
  let p = [];
  p = addParcel(p, 'apple', 0); p = addParcel(p, 'ball', 2); p = addParcel(p, 'cake', 0);
  const { delivered, rest } = takeParcels(p, 0);
  assert.deepEqual(delivered, ['apple', 'cake']);
  assert.deepEqual(rest, [{ k: 'ball', to: 2 }]);
  assert.deepEqual(takeParcels(rest, 1).delivered, []);
  let full = [];
  for (let i = 0; i < MAX_PARCELS; i++) full = addParcel(full, 'apple', 0);
  assert.equal(addParcel(full, 'apple', 0), null, 'the van is full');
});

test('saved parcels drop junk: unknown items, buildings that are gone, extras', () => {
  const city = starterCity();
  const clean = cleanParcels([{ k: 'apple', to: 1 }, { k: 'ghost', to: 1 }, { k: 'ball', to: 9 }, null, { k: 'cake', to: 'x' }], k => Boolean(CATALOG[k]), city);
  assert.deepEqual(clean, [{ k: 'apple', to: 1 }]);
  assert.deepEqual(cleanParcels('nope', () => true, city), []);
});
