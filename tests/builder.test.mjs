import test from 'node:test';
import assert from 'node:assert/strict';
import { addRoom, removeRoom, resizeRoom, moveRoom, addFloor, removeFloor, setExterior, floorWidth, findRoom, MAX_FLOOR_W } from '../src/systems/builder.js';
import { newBuilding, ROOM_W, MAX_FLOORS, MAX_ROOMS } from '../src/data/buildings.js';

const fresh = () => newBuilding('blank');
const floorIds = b => b.floors.map(f => f.id);
const roomIds = b => b.floors.flatMap(f => f.rooms.map(r => r.id));
const unique = a => new Set(a).size === a.length;

test('rooms are added at the end of a floor, with fresh ids; only buildable types', () => {
  const b = fresh();
  const r = addRoom(b, 0, 'kitchen');
  assert.equal(r.w, ROOM_W.def);
  assert.deepEqual(b.floors[0].rooms.map(x => x.type), ['empty', 'kitchen']);
  assert.ok(unique(roomIds(b)));
  assert.equal(addRoom(b, 0, 'shop'), null, 'the shop is not a room you can build');
  assert.equal(addRoom(b, 0, 'nope'), null);
  assert.equal(addRoom(b, 99, 'kitchen'), null);
});

test('a floor takes at most MAX_ROOMS rooms and stays within the width limit', () => {
  const b = fresh();
  while (addRoom(b, 0, 'living'));
  assert.equal(b.floors[0].rooms.length, MAX_ROOMS);
  assert.ok(floorWidth(b.floors[0]) <= MAX_FLOOR_W);
});

test('stretching is stepped and clamped, and never pushes a floor past its limit', () => {
  const b = fresh(), id = b.floors[0].rooms[0].id;
  assert.equal(resizeRoom(b, id, 1), 960 + ROOM_W.step);
  assert.equal(resizeRoom(b, id, 100), ROOM_W.max);
  assert.equal(resizeRoom(b, id, -100), ROOM_W.min);
  assert.equal(resizeRoom(b, 999, 1), null);
  while (addRoom(b, 0, 'living'));
  b.floors[0].rooms.slice(1).forEach(r => resizeRoom(b, r.id, 100));
  resizeRoom(b, id, 100);
  assert.ok(floorWidth(b.floors[0]) <= MAX_FLOOR_W);
});

test('removing: a floor keeps one room, a building keeps one floor', () => {
  const b = fresh(), only = b.floors[0].rooms[0].id;
  assert.equal(removeRoom(b, only), false);
  const extra = addRoom(b, 0, 'bedroom');
  assert.equal(removeRoom(b, extra.id), true);
  assert.equal(removeFloor(b, 0), false);
  const top = addFloor(b);
  assert.equal(b.floors.length, 2);
  assert.equal(removeFloor(b, top.id), true);
  assert.equal(removeFloor(b, 42), false);
});

test('floors stack up to MAX_FLOORS, each starting as one empty room', () => {
  const b = fresh();
  while (addFloor(b));
  assert.equal(b.floors.length, MAX_FLOORS);
  assert.ok(b.floors.every(f => f.rooms.length >= 1));
  assert.ok(unique(floorIds(b)) && unique(roomIds(b)), 'ids stay unique');
});

test('rooms can be shuffled left and right; the exterior can be repainted', () => {
  const b = fresh();
  const k = addRoom(b, 0, 'kitchen');
  assert.equal(moveRoom(b, k.id, -1), true);
  assert.equal(b.floors[0].rooms[0].id, k.id);
  assert.equal(moveRoom(b, k.id, -1), false);
  assert.equal(findRoom(b, k.id).floor, b.floors[0]);
  assert.deepEqual(setExterior(b, { roofStyle: 'dome' }).roofStyle, 'dome');
  assert.equal(b.exterior.wall, 'cream', 'only what you pass changes');
});
