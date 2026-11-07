import test from 'node:test';
import assert from 'node:assert/strict';
import { clampPlacement, nearestFreeSlot, accepts, MAX_FURNITURE, SLOT_SCALE } from '../src/systems/slots.js';
import { PROP_TYPES } from '../src/data/props.js';
import { ROOMS, defaultFurniture } from '../src/data/rooms.js';
import { W } from '../src/config.js';

const behaviours = new Set(['dispenser', 'oven', 'switch', 'bell', 'storage', 'bed', 'pets', 'connector']);

test('every furniture type is catalogue-ready', () => {
  for (const [id, def] of Object.entries(PROP_TYPES)) {
    assert.ok(def.name, `${id} name`);
    assert.ok(['floor', 'wall'].includes(def.mount), `${id} mount`);
    assert.ok(behaviours.has(def.behaviour), `${id} behaviour`);
    assert.ok(def.w > 0 && def.h > 0 && typeof def.draw === 'function', id);
  }
});

test('storage slots sit inside their furniture and don\'t overlap each other', () => {
  const storage = Object.entries(PROP_TYPES).filter(([, d]) => d.behaviour === 'storage');
  assert.ok(storage.length >= 4, 'cabinet, closet, bookcase, trunk');
  const itemSize = 64 * SLOT_SCALE;
  for (const [id, def] of storage) {
    assert.ok(def.slots.length >= 3, id);
    def.slots.forEach((s, i) => {
      assert.ok(Math.abs(s.x) + itemSize / 2 <= def.w / 2 && Math.abs(s.y) + itemSize / 2 <= def.h / 2 + 12, `${id} slot ${i} inside`);
      def.slots.slice(i + 1).forEach((o, j) => {
        assert.ok(Math.hypot(s.x - o.x, s.y - o.y) >= itemSize - 1, `${id} slots ${i}/${i + 1 + j} overlap`);
      });
    });
  }
});

test('clampPlacement keeps floor pieces on the floor and wall pieces on the wall', () => {
  const fridge = PROP_TYPES.fridge, sw = PROP_TYPES.lightswitch;
  const a = clampPlacement(fridge, -500, 0);
  assert.equal(a.x, Math.ceil((fridge.w / 2 + 10) / 10) * 10);
  assert.equal(a.y, 430);
  assert.equal(clampPlacement(fridge, 480, 9999).y, 540);
  assert.ok(clampPlacement(fridge, 99999, 500).x <= W - fridge.w / 2);
  assert.equal(clampPlacement(sw, 480, 9999).y, 410);                     // can't sit on the floor
  assert.equal(clampPlacement(sw, 480, 0).y, Math.ceil((sw.h + 60) / 10) * 10);
  const again = clampPlacement(fridge, a.x, a.y);
  assert.deepEqual(again, a);                                             // idempotent
});

test('nearestFreeSlot picks the closest free slot, skips taken ones, -1 when full', () => {
  const slots = [{ x: -40, y: 0 }, { x: 0, y: 0 }, { x: 40, y: 0 }];
  assert.equal(nearestFreeSlot(slots, [], 35, 5), 2);
  assert.equal(nearestFreeSlot(slots, [null, null, {}], 35, 5), 1);
  assert.equal(nearestFreeSlot(slots, [{}, {}, null], -100, 0), 2);
  assert.equal(nearestFreeSlot(slots, [{}, {}, {}], 0, 0), -1);
});

test('accepts: null means anything, a list restricts kinds', () => {
  assert.ok(accepts(PROP_TYPES.cabinet, 'toy') && accepts(PROP_TYPES.cabinet, 'food'));
  assert.ok(accepts(PROP_TYPES.closet, 'hat') && !accepts(PROP_TYPES.closet, 'food'));
});

test('default furniture is valid and fits the placement rules', () => {
  for (const room of Object.keys(ROOMS)) {
    const list = defaultFurniture(room);
    assert.ok(list.length <= MAX_FURNITURE, room);
    for (const f of list) {
      const def = PROP_TYPES[f.type];
      assert.ok(def, `${room}: ${f.type}`);
      const c = clampPlacement(def, f.x, f.y);
      assert.ok(Math.abs(c.x - f.x) <= 10 && Math.abs(c.y - f.y) <= 10, `${room}: ${f.type} sits where the rules allow`);
      assert.deepEqual(f.items, []);
    }
  }
});
