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
