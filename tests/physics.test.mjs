import test from 'node:test';
import assert from 'node:assert/strict';
import { stepBody, throwVelocity, laneForFeet, inBin, isMoving } from '../src/systems/physics.js';
import { W, FLOOR_TOP, FLOOR_BOTTOM, BIN } from '../src/config.js';

const body = (o = {}) => ({ x: 400, lane: 500, z: 0, vx: 0, vz: 0, ly: 0, throwable: true, ...o });
const run = (b, seconds, dt = 1 / 60) => { let impacts = []; for (let t = 0; t < seconds; t += dt) { const i = stepBody(b, dt); if (i) impacts.push(i); } return impacts; };

test('a dropped body falls, bounces with less energy each time, then rests', () => {
  const b = body({ z: 200 });
  const impacts = run(b, 6);
  assert.ok(impacts.length >= 2, 'bounced at least twice');
  assert.ok(impacts[1] < impacts[0], 'each bounce is weaker');
  assert.equal(b.z, 0);
  assert.equal(b.vz, 0);
});

test('bounce factor and gravity scale are respected', () => {
  const ball = body({ z: 200, bounce: 0.72 }), brick = body({ z: 200, bounce: 0.2 });
  assert.ok(run(ball, 6).length > run(brick, 6).length);
  const balloon = body({ z: 200, gscale: 0.2 }), rock = body({ z: 200 });
  run(balloon, 0.3); run(rock, 0.3);
  assert.ok(balloon.z > rock.z, 'balloon falls slower');
});

test('friction stops a sliding body and walls bounce it back', () => {
  const slide = body({ vx: 600 });
  run(slide, 3);
  assert.ok(Math.abs(slide.vx) < 1);
  const wall = body({ x: W - 40, vx: 900 });
  run(wall, 0.1);
  assert.ok(wall.x <= W - 30 && wall.vx < 0, 'reflected off the right wall');
});

test('non-throwable bodies (characters) only move vertically', () => {
  const c = body({ throwable: false, vx: 500, z: 100 });
  run(c, 2);
  assert.equal(c.x, 400);
  assert.equal(c.z, 0);
});

test('lane stays inside the floor band', () => {
  const b = body({ ly: 500 });
  run(b, 3);
  assert.ok(b.lane <= FLOOR_BOTTOM && b.lane >= FLOOR_TOP);
});

test('throwVelocity: fast flick gives velocity, a pause before release gives none', () => {
  const now = 1000;
  const flick = [{ t: 940, x: 100, y: 300 }, { t: 960, x: 130, y: 290 }, { t: 990, x: 190, y: 270 }];
  const v = throwVelocity(flick, now);
  assert.ok(v.vx > 1000 || v.vx === 1400, 'moving right');
  assert.ok(v.vz > 0, 'moving up throws upward');
  const stale = [{ t: 500, x: 100, y: 300 }, { t: 520, x: 400, y: 300 }];
  assert.deepEqual(throwVelocity(stale, now), { vx: 0, vz: 0, ly: 0 });
  assert.equal(throwVelocity([], now).vx, 0);
});

test('laneForFeet only follows the pointer over the floor band', () => {
  assert.equal(laneForFeet(500, 200), 500);
  assert.equal(laneForFeet(500, 530), 530);
  assert.equal(laneForFeet(500, 9999), FLOOR_BOTTOM);
});

test('inBin and isMoving', () => {
  assert.ok(inBin({ x: BIN.x, lane: BIN.lane }));
  assert.ok(!inBin({ x: BIN.x, lane: BIN.minLane - 1 }));
  assert.ok(!inBin({ x: BIN.x - BIN.halfW - 1, lane: BIN.lane }));
  assert.ok(isMoving({ z: 5, vx: 0 }) && isMoving({ z: 0, vx: 50 }) && !isMoving({ z: 0, vx: 0 }));
});

import { propSurface, itemSurface, restOn, adopt } from '../src/systems/support.js';

const table = { x: 400, y: 450, def: { w: 200, h: 100, mount: 'floor', surface: { top: -10 } } };       // base lane 500, top 60 above it
const thing = (o = {}) => ({ x: 400, lane: 500, z: 0, vx: 0, vz: 0, ly: 0, throwable: true, ...o });

test('a furniture top is a surface at the right height and place', () => {
  const s = propSurface(table);
  assert.equal(s.h, 60); assert.equal(s.lane, 500); assert.ok(s.x0 > 300 && s.x1 < 500);
  assert.equal(propSurface({ ...table, def: { ...table.def, surface: undefined } }), null);
  assert.equal(propSurface({ ...table, def: { ...table.def, mount: 'wall' } }), null);
});

test('something dropped over a table lands on it and stays; away from it, it falls to the floor', () => {
  const s = [propSurface(table)], a = thing({ z: 200 }), b = thing({ x: 700, z: 200 });
  for (let i = 0; i < 120; i++) { stepBody(a, 1 / 60, 960, s); stepBody(b, 1 / 60, 960, s); }
  assert.equal(a.z, 60, 'rests on the tabletop'); assert.equal(a.base, table);
  assert.equal(b.z, 0); assert.equal(b.base, null);
  assert.ok(!isMoving(a), 'resting on a table is not moving');
});

test('walking into a table from the side does not lift you onto it; losing the table drops what was on it', () => {
  const s = [propSurface(table)], low = thing({ z: 0 });
  stepBody(low, 1 / 60, 960, s);
  assert.equal(low.z, 0);
  const on = thing({ z: 60 }); stepBody(on, 1 / 60, 960, s);
  assert.equal(on.z, 60);
  for (let i = 0; i < 120; i++) stepBody(on, 1 / 60, 960, []);          // the table is gone
  assert.equal(on.z, 0);
});

test('items stack: one lands on another, and nothing rests on what rests on it', () => {
  const bottom = { ...thing(), stackW: 40, stackH: 40, z: 0 }, top = { ...thing({ z: 150 }), stackW: 40, stackH: 40 };
  for (let i = 0; i < 120; i++) stepBody(top, 1 / 60, 960, [itemSurface(bottom)]);
  assert.equal(top.z, 40); assert.equal(top.base, bottom);
  top.base = bottom; bottom.base = null;
  assert.equal(restOn(bottom, [itemSurface(top)], 100).owner, null, 'the bottom one cannot land on the one above it');
});

test('letting go above a tabletop picks the tabletop; people ignore beds and sofas', () => {
  const s = [propSurface(table)], b = thing({ lane: 540 });
  assert.equal(adopt(b, 400, s).owner, table, 'feet above the top: lands on it');
  assert.equal(adopt(b, 480, s), null, 'feet below the top edge: the floor in front');
  assert.equal(adopt(b, 100, s), null, 'far above: not snapped');
  const sofa = propSurface({ ...table, def: { ...table.def, surface: { top: -10, people: false } } });
  assert.ok(adopt(b, 400, [sofa]));
  assert.equal(adopt({ ...b, person: true }, 400, [sofa]), null);
});
