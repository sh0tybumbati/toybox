import test from 'node:test';
import assert from 'node:assert/strict';
import { FLATPACK, furnKey, furnType, newAssembly, place, coinsFor } from '../src/systems/ikea.js';
import { PROP_TYPES } from '../src/data/props.js';
import { ROOMS } from '../src/data/rooms.js';
import { BLUEPRINTS } from '../src/data/buildings.js';
import { cleanParcels } from '../src/systems/mail.js';
import { starterCity } from '../src/data/buildings.js';
import { CATALOG } from '../src/data/items.js';

test('every flat-pack is a real piece of furniture, only sold at the store', () => {
  for (const [type, f] of Object.entries(FLATPACK)) {
    assert.ok(PROP_TYPES[type], `${type} exists`);
    assert.ok(f.price >= 1 && f.parts >= 3);
    assert.ok(!['home', 'storage', 'play', 'town'].includes(PROP_TYPES[type].cat), `${type} is not in the free catalogue`);
  }
  assert.ok(ROOMS.ikea && BLUEPRINTS.ikea && PROP_TYPES.flatpack.game === 'ikea');
});

test('parcel keys for furniture round-trip, and junk is rejected', () => {
  assert.equal(furnType(furnKey('sofa')), 'sofa');
  assert.equal(furnType('furn:castle'), null);
  assert.equal(furnType('apple'), null);
  assert.equal(furnType(undefined), null);
});

test('parts are tapped in number order; slips are counted', () => {
  const a = newAssembly('sofa', () => 0.3);
  assert.deepEqual([...a.layout].sort(), [1, 2, 3, 4, 5]);
  assert.equal(place(a, 2), 'wrong');
  const r = [1, 2, 3, 4, 5].map(n => place(a, n));
  assert.deepEqual(r, ['ok', 'ok', 'ok', 'ok', 'done']);
  assert.equal(a.mistakes, 1);
  assert.deepEqual([0, 1, 2, 3].map(coinsFor), [2, 1, 1, 0]);
});

test('furniture parcels survive the save clean-up when they are real', () => {
  const city = starterCity(), isKey = k => Boolean(CATALOG[k]) || furnType(k) !== null;
  assert.deepEqual(cleanParcels([{ k: 'furn:sofa', to: 1, from: 2 }, { k: 'furn:nope', to: 1 }], isKey, city), [{ k: 'furn:sofa', to: 1, from: 2 }]);
});
