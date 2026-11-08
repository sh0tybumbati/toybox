import test from 'node:test';
import assert from 'node:assert/strict';
import { migrate, sanitize } from '../src/systems/save.js';
import { starterCity } from '../src/data/buildings.js';

const v1 = {
  v: 1, room: 'kitchen',
  worn: { head: 'cap', handR: 'teddy', feet: 'cap' },        // 'cap' on feet is invalid
  char: { x: 300, lane: 520, scale: 1.2 },
  floors: { kitchen: [{ k: 'apple', x: 421, l: 552 }], bedroom: [{ k: 'car', x: 301, l: 552 }] },
};

test('v1 saves migrate to a one-character v13 save with a look', () => {
  const d = migrate(v1);
  assert.equal(d.v, 13);
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
  assert.equal(d.zone, '0.0');                       // the old kitchen is the first room on the home's ground floor
  assert.deepEqual(d.characters[0].worn, { head: 'cap', handR: 'teddy' });
  assert.equal(d.floors['0.0'][0].k, 'apple');
  assert.equal(d.floors['0.2'][0].k, 'car');        // the old bedroom
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
  assert.equal(d.characters[0].scale, undefined, 'size is not saved: people are always the room size');
  assert.deepEqual(d.floors['0.2'], [{ k: 'ball', x: 930, l: 445 }]);
  assert.deepEqual(d.floors['0.0'], []);
});

test('a v12 save round-trips through sanitize', () => {
  const d = sanitize(v1);
  assert.deepEqual(sanitize(JSON.parse(JSON.stringify(d))), d);
});

test('party is capped at 6, junk looks are repaired, an empty party gets the default', () => {
  const many = Array.from({ length: 9 }, (_, i) => ({ id: `c${i}`, name: `N${i}`, look: { skin: 'red', hair: { style: 'wat' } }, worn: {} }));
  const d = sanitize({ v: 3, room: 'bedroom', characters: many, floors: {} });
  assert.equal(d.characters.length, 6);
  assert.equal(d.characters[0].look.hair.style, 'short');
  assert.equal(typeof d.characters[0].look.skin, 'number');
  const empty = sanitize({ v: 3, room: 'bedroom', characters: [], floors: {} });
  assert.equal(empty.characters.length, 1);
  assert.equal(empty.characters[0].id, 'kid');
});

test('v3 saves gain night=false; night survives sanitize', () => {
  const d = sanitize({ v: 3, room: 'bedroom', characters: [], floors: {} });
  assert.equal(d.v, 13);
  assert.equal(d.night, false);
  assert.equal(d.coins, 0);
  assert.equal(d.furniture['0.0'], null);          // nothing saved yet: the room uses its default layout
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
  assert.deepEqual(d.floors['1.0'], []);
  assert.deepEqual(d.floors['2.0'], []);
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
        { type: 'hovercraft', x: 100, y: 500 },                               // unknown type
        { type: 'fridge', x: 'a', y: 500 },                             // bad coordinates
        { type: 'fridge', x: 300, y: 500, items: [{ s: 0, k: 'apple' }] }, // no slots: items ignored
      ],
      bedroom: [],                                                      // an empty room is valid (everything removed), though v12 hands back the stocked shelves
    },
  });
  assert.equal(d.furniture['1.0'], null);
  assert.deepEqual(d.furniture['0.2'].map(f => f.type), ['shelf', 'shelf']);
  const kept = d.furniture['0.0'].filter(f => f.type !== 'shelf');          // (the v12 shelves are added after the player's own pieces)
  assert.equal(kept.length, 2);
  const [cabinet, fridge] = kept;
  assert.ok(cabinet.x < 960 && cabinet.y <= 540);
  assert.deepEqual(cabinet.items, [{ s: 0, k: 'apple' }]);              // dup slot, bad slot and unknown item dropped
  assert.deepEqual(fridge.items, []);
});

test('pets: v8 saves gain none; junk kinds are dropped and the family is capped', () => {
  assert.deepEqual(sanitize({ v: 8, room: 'bedroom', characters: [], floors: {} }).pets, []);
  const d = sanitize({ v: 9, room: 'bedroom', characters: [], floors: {}, pets: ['dog', 'dragon', 'cat', 'rabbit', 'chick', 'hamster'] });
  assert.deepEqual(d.pets, ['dog', 'cat', 'rabbit']);
  assert.deepEqual(sanitize({ v: 9, room: 'bedroom', characters: [], floors: {}, pets: 'dog' }).pets, []);
});

test('v9 -> v10: the old rooms become rooms of the starter city; the player stays where they were', () => {
  const d = sanitize({ v: 9, room: 'park', characters: [{ id: 'kid', x: 400 }], floors: { park: [{ k: 'ball', x: 300, l: 500 }] }, furniture: { shop: [] } });
  assert.equal(d.zone, '1.0');
  assert.equal(d.city[1].name, 'Park');
  assert.deepEqual(d.floors['1.0'], [{ k: 'ball', x: 300, l: 500 }]);
  assert.deepEqual(d.furniture['2.0'], []);
  assert.equal(d.characters[0].x, 400);
});

test('city saves: custom buildings survive, junk is repaired, a ruined city falls back to the starter city', () => {
  const home = {
    name: 'My place', exterior: { wall: 'mint', trim: 'navy', roofStyle: 'dome', roofColor: 'plum' },
    floors: [
      { id: 0, rooms: [{ id: 0, type: 'empty', w: 1250 }, { id: 1, type: 'ghost', w: 960 }, { id: 0, type: 'kitchen', w: 960 }] },
      { id: 4, rooms: [{ id: 7, type: 'bedroom', w: 99999, extra: [{ type: 'ladder', x: 100, y: 500 }, { type: 'hovercraft', x: 1, y: 1 }] }] },
      { id: 4, rooms: [{ id: 8, type: 'living', w: 960 }] },
      { id: 9, rooms: [] },
    ],
  };
  const d = sanitize({ v: 13, zone: '0.4', city: [home, 'nope', null], characters: [{ id: 'kid', x: 5000 }], floors: {}, furniture: {}, looks: {
    '0.0': { wall: 'shells', floor: 'oak', windows: [{ x: 5, y: 80, w: 100, h: 100 }, { x: 'a' }] }, '0.7': { wall: 'nope', floor: null, windows: null }, '9.9': { wall: 'sage' } } });
  const b = d.city[0];
  assert.equal(b.name, 'My place');
  assert.equal(b.exterior.roofStyle, 'dome');
  assert.deepEqual(b.floors.map(f => f.id), [0, 4], 'duplicate and empty floors dropped');
  assert.deepEqual(b.floors[0].rooms.map(r => [r.id, r.type, r.w]), [[0, 'empty', 1200]], 'unknown rooms and duplicate ids dropped, width snapped to the step');
  assert.equal(b.floors[1].rooms[0].w, 1920);
  assert.deepEqual(b.floors[1].rooms[0].extra, [{ type: 'ladder', x: 100, y: 500 }]);
  assert.equal(d.city[1], null);
  assert.equal(d.zone, '0.4');
  assert.equal(d.characters[0].x, 1920 - 100, 'clamped to this floor');
  assert.deepEqual(d.looks['0.0'].windows, [{ x: 5, y: 80, w: 100, h: 100 }]);
  assert.equal(d.looks['0.7'].wall, null);
  assert.equal(d.looks['9.9'], undefined, 'looks for rooms that do not exist are dropped');
  assert.deepEqual(Object.keys(d.floors).sort(), ['0.0', '0.7']);
  const ruined = sanitize({ v: 10, zone: '3.3', city: ['x', 7, {}], characters: [], floors: {} });
  assert.equal(ruined.city[0].name, 'Home');
  assert.equal(ruined.zone, '0.0', 'an unknown zone falls back to the first building');
});

test('v10 -> v11: designs start empty; shirt and toy designs are validated and capped', () => {
  const old = sanitize({ v: 10, zone: '0.1', city: null, characters: [], floors: {} });
  assert.deepEqual(old.shirts, []); assert.deepEqual(old.toys, []);
  const d = sanitize({ v: 11, zone: '0.1', characters: [], floors: {},
    shirts: [{ color: 0xff0000, pattern: { id: 'stars', color: 0xffff00 } }, { color: 'x' }, { color: 0x00ff00, pattern: { id: 'plaid', color: 1 } }, ...Array(12).fill({ color: 1, pattern: null })],
    toys: [{ id: 'abc', name: 'Blob', body: 'bean', color: 1, partColor: 2, parts: ['ears'], face: 'smile' }, { id: 'abc', body: 'ball' }, { id: '??' }] });
  assert.equal(d.shirts.length, 8);
  assert.deepEqual(d.shirts[0], { color: 0xff0000, pattern: { id: 'stars', color: 0xffff00 } });
  assert.equal(d.shirts[1].pattern, null, 'a junk pattern is dropped, the shirt kept');
  assert.deepEqual(d.toys.map(t => t.id), ['abc'], 'duplicates and junk dropped');
});

test('toys on the floor survive loading because the toy is registered first', () => {
  const d = sanitize({ v: 11, zone: '0.1', characters: [], floors: { '0.2': [{ k: 'toy:zz1', x: 100, l: 500 }, { k: 'toy:ghost', x: 100, l: 500 }] },
    toys: [{ id: 'zz1', name: 'Zed', body: 'egg', color: 5, partColor: 6, parts: [], face: 'wow' }] });
  assert.deepEqual(d.floors['0.2'].map(f => f.k), ['toy:zz1']);
});

test('v11 -> v12: arranged homes and parks gain the stocked shelves and playground gear; untouched rooms stay on the defaults', () => {
  const d = sanitize({ v: 11, zone: '0.0', characters: [], floors: {}, city: starterCity(),
    furniture: { '0.0': [{ type: 'fridge', x: 300, y: 434, items: [] }], '1.0': [{ type: 'lamppost', x: 400, y: 434, items: [] }, { type: 'bench', x: 700, y: 480, items: [] }] } });
  const kitchen = d.furniture['0.0'].map(f => f.type);
  assert.deepEqual(kitchen.filter(t => t === 'shelf'), ['shelf', 'shelf'], 'the kitchen gets its two wall shelves');
  assert.ok(kitchen.includes('fridge'), 'and keeps what it had');
  const shelf = d.furniture['0.0'].find(f => f.type === 'shelf');
  assert.ok(shelf.items.length >= 3, 'the new shelf comes stocked');
  const park = d.furniture['1.0'].map(f => f.type);
  assert.ok(['tree', 'picnictable', 'sandbox'].every(t => park.includes(t)), 'the park gets its table, sandbox and tree');
  assert.equal(park.filter(t => t === 'bench').length, 1, 'but not a second bench');
  assert.equal(d.furniture['0.1'], null, 'rooms the player never arranged use the new defaults');
});
