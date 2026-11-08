import test from 'node:test';
import assert from 'node:assert/strict';
import { SLOTS, starterCity, BUILDABLE, BLUEPRINTS, isHouse } from '../src/data/buildings.js';
import { LISTINGS, LOT_PRICE, BUILD_PRICE } from '../src/data/hard/property.js';
import { buildOnLot, buyHouse, editRights, listings, lotPrice, sellPrice, whyNotBuyHouse, whyNotBuyLot } from '../src/systems/hard/property.js';
import { HOUSING } from '../src/data/hard/housing.js';
import { newHome, tickBills } from '../src/systems/hard/bills.js';

test('the starter town has every public place built; only houses can be built', () => {
  const city = starterCity();
  assert.equal(city.length, SLOTS.length);
  assert.ok(SLOTS.length >= 20);
  const names = city.filter(Boolean).map(b => b.name);
  for (const n of ['Home', 'Park', 'Shop', 'Supermarket', 'Post Office', 'Arcade', 'Shirt Factory', 'Toy Workshop', 'Furniture Store', 'Fishing Pond', 'Campsite']) assert.ok(names.includes(n), n);
  assert.ok(city.filter(b => !b).length >= 8, 'plenty of empty lots for houses');
  assert.deepEqual(BUILDABLE.sort(), ['apartments', 'blank', 'cottage']);
  for (const k of BUILDABLE) assert.equal(BLUEPRINTS[k].cost, 0, 'kid mode: building is free');
  assert.ok(isHouse(city[0]) && !isHouse(city[1]));
});

test('lots sit on the map without crowding', () => {
  for (const a of SLOTS) for (const b of SLOTS) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 120);
});

test('buying a house for sale: it must be listed, you must afford it, and then it is yours', () => {
  const city = starterCity();
  for (const [slot, b] of listings()) city[slot] = b;
  assert.ok(LISTINGS.every(l => city[l.slot] && city[l.slot].forSale === l.price));
  const l = LISTINGS[0];
  assert.match(whyNotBuyHouse(city, l.slot, l.price - 1), /more/);
  assert.equal(buyHouse(city, l.slot, 1), null);
  assert.equal(whyNotBuyHouse(city, 1, 1e9), 'not for sale');
  const r = buyHouse(city, l.slot, l.price + 500);
  assert.deepEqual(r, { cash: 500, price: l.price });
  assert.equal(city[l.slot].owned, true); assert.equal(city[l.slot].forSale, undefined);
  assert.equal(whyNotBuyHouse(city, l.slot, 1e9), 'already yours');
});

test('buying an empty lot builds a house on it, owned', () => {
  const city = starterCity();
  assert.equal(whyNotBuyLot(city, 5, 'cottage', 1e9), '');
  assert.equal(lotPrice('cottage'), LOT_PRICE + BUILD_PRICE.cottage);
  assert.match(whyNotBuyLot(city, 5, 'cottage', 10), /more/);
  assert.equal(whyNotBuyLot(city, 1, 'cottage', 1e9), 'lot is taken');
  assert.equal(whyNotBuyLot(city, 5, 'arcade', 1e9), 'not a house');
  const r = buildOnLot(city, 5, 'cottage', 1e6);
  assert.equal(r.cash, 1e6 - lotPrice('cottage'));
  assert.equal(city[5].owned, true); assert.equal(city[5].name, 'Cottage'); assert.equal(city[5].cost, undefined);
});

test('what you may change: everything you own, only the furniture of a home you rent, nothing else', () => {
  const city = starterCity();
  assert.equal(editRights(city[1], null, 1), '');
  assert.equal(editRights(city[1], { slot: 0 }, 1), '');
  assert.equal(editRights(city[0], { slot: 0 }, 0), 'furniture');
  city[1].owned = true;
  assert.equal(editRights(city[1], null, 1), 'full');
  assert.equal(editRights(null, null, 3), '');
  assert.ok(sellPrice(city[0]) > 0);
});

test('a house you own has only its utilities, and being late never throws you out of it', () => {
  assert.deepEqual(HOUSING.owned.bills.map(b => b[0]), ['utilities']);
  const h = { home: newHome('owned', 3, 0), bills: [], billId: 0, debt: 0, lockedOut: null };
  tickBills(h, 0);
  tickBills(h, 60);
  assert.ok(h.home, 'still home');
  assert.ok(h.bills[0].late, 'the first bill went late');
});
