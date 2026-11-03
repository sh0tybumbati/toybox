import test from 'node:test';
import assert from 'node:assert/strict';
import { migrate, sanitize } from '../src/systems/save.js';

const v1 = {
  v: 1, room: 'kitchen',
  worn: { head: 'cap', handR: 'teddy', feet: 'cap' },        // 'cap' on feet is invalid
  char: { x: 300, lane: 520, scale: 1.2 },
  floors: { kitchen: [{ k: 'apple', x: 421, l: 552 }], bedroom: [{ k: 'car', x: 301, l: 552 }] },
};

test('v1 saves migrate to a one-character v8 save with a look', () => {
  const d = migrate(v1);
  assert.equal(d.v, 8);
  assert.equal(d.night, false);
  assert.equal(d.coins, 0);
  assert.deepEqual(d.furniture, {});                // nothing saved yet: rooms use their default layout
  assert.deepEqual(d.recipes, []);
  assert.ok(d.characters[0].look && d.characters[0].name);
  assert.equal(d.characters.length, 1);
  assert.equal(d.characters[0].id, 'kid');
  assert.equal(d.characters[0].x, 300);
});

test('sanitize keeps valid data and drops invalid worn items', () => {
  const d = sanitize(v1);
  assert.equal(d.room, 'kitchen');
  assert.deepEqual(d.characters[0].worn, { head: 'cap', handR: 'teddy' });
  assert.equal(d.floors.kitchen[0].k, 'apple');
  assert.equal(d.floors.bedroom[0].k, 'car');
});

test('sanitize rejects junk and clamps numbers', () => {
  assert.equal(sanitize(null), null);
  assert.equal(sanitize('nope'), null);
  assert.equal(sanitize({ v: 99 }), null);
  assert.equal(sanitize({ v: 2, room: 'moon' }), null);
  const d = sanitize({
    v: 2, room: 'bedroom',
    characters: [{ id: 'kid', x: -5000, lane: 9999, scale: 50, worn: {} }, { nope: true }],
    floors: { bedroom: [{ k: 'ghost', x: 1, l: 1 }, { k: 'ball', x: 99999, l: 0 }, null] },
  });
  assert.equal(d.characters.length, 1);
  assert.equal(d.characters[0].x, 100);
  assert.equal(d.characters[0].lane, 580);
  assert.equal(d.characters[0].scale, 1.5);
  assert.deepEqual(d.floors.bedroom, [{ k: 'ball', x: 930, l: 445 }]);
  assert.deepEqual(d.floors.kitchen, []);
});

test('a v8 save round-trips through sanitize', () => {
  const d = sanitize(v1);
  assert.deepEqual(sanitize(JSON.parse(JSON.stringify(d))), d);
});

test('party is capped at 4, junk looks are repaired, an empty party gets the default', () => {
  const many = Array.from({ length: 9 }, (_, i) => ({ id: `c${i}`, name: `N${i}`, look: { skin: 'red', hair: { style: 'wat' } }, worn: {} }));
  const d = sanitize({ v: 3, room: 'bedroom', characters: many, floors: {} });
  assert.equal(d.characters.length, 4);
  assert.equal(d.characters[0].look.hair.style, 'short');
  assert.equal(typeof d.characters[0].look.skin, 'number');
  const empty = sanitize({ v: 3, room: 'bedroom', characters: [], floors: {} });
  assert.equal(empty.characters.length, 1);
  assert.equal(empty.characters[0].id, 'kid');
});

test('v3 saves gain night=false; night survives sanitize', () => {
  const d = sanitize({ v: 3, room: 'bedroom', characters: [], floors: {} });
  assert.equal(d.v, 8);
  assert.equal(d.night, false);
  assert.equal(d.coins, 0);
  assert.equal(d.furniture.kitchen, null);          // nothing saved yet: the room uses its default layout
  assert.deepEqual(d.recipes, []);
  assert.equal(sanitize({ v: 5, room: 'bedroom', night: true, characters: [], floors: {} }).night, true);
});

test('coins and unlocked items: v4 gains defaults, junk is repaired', () => {
  const old = sanitize({ v: 4, room: 'bedroom', night: false, characters: [], floors: {} });
  assert.equal(old.coins, 0);
  assert.deepEqual(old.unlocked, []);
  const d = sanitize({ v: 5, room: 'shop', coins: 12.9, unlocked: ['dog', 'dog', 'apple', 'nope', 'unicorn'], characters: [], floors: {} });
  assert.equal(d.coins, 12);
  assert.deepEqual(d.unlocked, ['dog', 'unicorn']);          // only premium keys, deduplicated
  assert.equal(sanitize({ v: 5, room: 'shop', coins: -5, characters: [], floors: {} }).coins, 0);
  assert.equal(sanitize({ v: 5, room: 'shop', coins: 'lots', characters: [], floors: {} }).coins, 0);
});

test('saves from before the park and shop get empty floors for them', () => {
  const d = sanitize(v1);
  assert.deepEqual(d.floors.park, []);
  assert.deepEqual(d.floors.shop, []);
});

test('discovered recipes: v5 gains an empty list, unknown ids are dropped', () => {
  assert.deepEqual(sanitize({ v: 5, room: 'bedroom', coins: 0, unlocked: [], characters: [], floors: {} }).recipes, []);
  const d = sanitize({ v: 6, room: 'kitchen', recipes: ['pancakes', 'pancakes', 'nonsense', 'sushi'], characters: [], floors: {} });
  assert.deepEqual(d.recipes, ['pancakes', 'sushi']);
});

test('furniture saves: valid pieces kept and clamped, junk dropped, rooms without data stay null', () => {
  const d = sanitize({
    v: 7, room: 'kitchen', characters: [], floors: {},
    furniture: {
      kitchen: [
        { type: 'cabinet', x: 9999, y: 9999, items: [{ s: 0, k: 'apple' }, { s: 0, k: 'ball' }, { s: 99, k: 'apple' }, { s: 1, k: 'ghost' }, null] },
        { type: 'sofa', x: 100, y: 500 },                               // unknown type
        { type: 'fridge', x: 'a', y: 500 },                             // bad coordinates
        { type: 'fridge', x: 300, y: 500, items: [{ s: 0, k: 'apple' }] }, // no slots: items ignored
      ],
      bedroom: [],                                                      // an empty room is valid (everything removed)
    },
  });
  assert.equal(d.furniture.park, null);
  assert.deepEqual(d.furniture.bedroom, []);
  assert.equal(d.furniture.kitchen.length, 2);
  const [cabinet, fridge] = d.furniture.kitchen;
  assert.ok(cabinet.x < 960 && cabinet.y <= 540);
  assert.deepEqual(cabinet.items, [{ s: 0, k: 'apple' }]);              // dup slot, bad slot and unknown item dropped
  assert.deepEqual(fridge.items, []);
});
