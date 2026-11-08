import test from 'node:test';
import assert from 'node:assert/strict';
import { PACKS, PACK_IDS, BAG_CAP, PACK_MAX, STAPLES } from '../src/data/hard/food.js';
import { buyPack, carriedBy, cleanPacks, foodCap, freeSlots, slotsOf, tierOf, whyNotPack } from '../src/systems/hard/pack.js';
import { PROP_TYPES } from '../src/data/props.js';

test('with no bag you have pockets; bags are bigger, and the biggest sets the limit', () => {
  assert.equal(slotsOf({}, 'a'), BAG_CAP);
  assert.equal(tierOf({ a: 'nope' }, 'a'), 'pockets');
  assert.ok(PACKS.backpack.slots > PACKS.pockets.slots && PACKS.bigpack.slots > PACKS.backpack.slots);
  assert.equal(PACK_MAX, PACKS.bigpack.slots);
  assert.deepEqual(PACK_IDS, ['pockets', 'backpack', 'bigpack']);
});

test('carrying product takes slots from the person carrying it', () => {
  const goods = [{ at: 'carry', by: 'a' }, { at: 'home' }, { at: 'carry', by: 'b' }, { at: 'carry', by: 'a' }];
  assert.equal(carriedBy(goods, 'a'), 2); assert.equal(carriedBy(goods, 'b'), 1);
  assert.equal(foodCap({}, goods, 'a'), BAG_CAP - 2);
  assert.equal(freeSlots({}, goods, 'a', [1]), BAG_CAP - 3);
  assert.equal(foodCap({}, [{ at: 'carry', by: 'a' }, { at: 'carry', by: 'a' }, { at: 'carry', by: 'a' }, { at: 'carry', by: 'a' }, { at: 'carry', by: 'a' }], 'a'), 0);
});

test('buying a bag: only an upgrade, only with the cash, and it is that person\'s', () => {
  assert.equal(whyNotPack({}, 'a', 'backpack', 100) .endsWith('more'), true);
  assert.equal(buyPack({}, 'a', 'backpack', 100), null);
  const r = buyPack({}, 'a', 'backpack', 5000);
  assert.deepEqual(r, { packs: { a: 'backpack' }, cash: 5000 - PACKS.backpack.price });
  assert.equal(slotsOf(r.packs, 'a'), 10); assert.equal(slotsOf(r.packs, 'b'), BAG_CAP);
  assert.equal(whyNotPack(r.packs, 'a', 'backpack', 1e6), 'you have it');
  assert.equal(whyNotPack(r.packs, 'a', 'pockets', 1e6), 'you have a bigger bag');
  assert.equal(buyPack(r.packs, 'a', 'pockets', 1e6), null);
  assert.equal(buyPack(r.packs, 'a', 'bigpack', 1e6).packs.a, 'bigpack');
});

test('saved bags are cleaned', () => {
  assert.deepEqual(cleanPacks({ a: 'bigpack', b: 'pockets', c: 'rocket', d: 5 }), { a: 'bigpack' });
  assert.deepEqual(cleanPacks('x'), {});
  assert.deepEqual(cleanPacks({ a: 'backpack', z: 'bigpack' }, ['a']), { a: 'backpack' });
});

test('the staples exist as furniture, so older adult saves get them', () => {
  for (const list of Object.values(STAPLES)) for (const p of list) assert.ok(PROP_TYPES[p.type], p.type);
});
