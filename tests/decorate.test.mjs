import test from 'node:test';
import assert from 'node:assert/strict';
import { addWindow, moveWindow, resizeWindow, removeWindow, withLook, MAX_WINDOWS, WIN } from '../src/systems/decorate.js';
import { WALLPAPERS, FLOORS, defaultLook } from '../src/data/decor.js';
import { ROOMS } from '../src/data/rooms.js';

test('a new window goes in the biggest gap and never overlaps the others', () => {
  const one = addWindow([], 960);
  assert.equal(one.length, 1);
  const two = addWindow(one, 960), three = addWindow(two, 960);
  for (const list of [two, three]) {
    const s = [...list].sort((a, b) => a.x - b.x);
    for (let i = 1; i < s.length; i++) assert.ok(s[i].x >= s[i - 1].x + s[i - 1].w, 'no overlap');
  }
  assert.ok(three.every(w => w.x >= WIN.margin && w.x + w.w <= 960 - WIN.margin));
});

test('a room holds at most MAX_WINDOWS windows', () => {
  let w = [];
  for (let i = 0; i < MAX_WINDOWS; i++) w = addWindow(w, 1920);
  assert.equal(w.length, MAX_WINDOWS);
  assert.equal(addWindow(w, 1920), null);
});

test('windows stay inside the wall when moved or resized, and keep sensible sizes', () => {
  let w = addWindow([], 960);
  w = moveWindow(w, 0, -9999, -9999, 960);
  assert.equal(w[0].x, WIN.margin); assert.equal(w[0].y, WIN.top);
  w = moveWindow(w, 0, 99999, 99999, 960);
  assert.equal(w[0].x + w[0].w, 960 - WIN.margin); assert.equal(w[0].y, WIN.maxTop);
  for (let i = 0; i < 30; i++) w = resizeWindow(w, 0, WIN.step, WIN.step, 960);
  assert.equal(w[0].w, WIN.maxW); assert.equal(w[0].h, WIN.maxH);
  for (let i = 0; i < 30; i++) w = resizeWindow(w, 0, -WIN.step, -WIN.step, 960);
  assert.equal(w[0].w, WIN.minW); assert.equal(w[0].h, WIN.minH);
  assert.ok(w[0].x >= WIN.margin && w[0].x + w[0].w <= 960 - WIN.margin);
});

test('removing a window removes only that one', () => {
  const w = addWindow(addWindow([], 960), 960);
  assert.equal(removeWindow(w, 0).length, 1);
  assert.deepEqual(removeWindow(w, 0)[0], w[1]);
});

test('a saved look keeps only what differs from the room type, and vanishes when nothing does', () => {
  const type = ROOMS.bedroom, base = defaultLook(type, 960);
  let looks = withLook({}, '0.2', base, l => ({ ...l, wall: 'shells' }));
  assert.deepEqual(looks['0.2'], { wall: 'shells', floor: null, windows: null });
  looks = withLook(looks, '0.2', base, l => ({ ...l, floor: 'carpet', windows: [...l.windows, { x: 600, y: 80, w: 100, h: 100 }] }));
  assert.equal(looks['0.2'].floor, 'carpet'); assert.equal(looks['0.2'].windows.length, 2);
  looks = withLook(looks, '0.2', base, l => ({ wall: base.wall, floor: base.floor, windows: base.windows }));
  assert.equal(looks['0.2'], undefined, 'back to the default = nothing stored');
  assert.deepEqual(withLook({}, '1.0', base, l => l), {}, 'untouched rooms store nothing');
});

test('every wallpaper and floor has a swatch colour for the picker', () => {
  for (const [k, w] of Object.entries(WALLPAPERS)) assert.ok(Number.isInteger(w.swatch), `wallpaper ${k}`);
  for (const [k, f] of Object.entries(FLOORS)) assert.ok(Number.isInteger(f.swatch), `floor ${k}`);
});
