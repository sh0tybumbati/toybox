import test from 'node:test';
import assert from 'node:assert/strict';
import { stepWalk, walkPose, clampGoal, isFloorTap, WALK_SPEED } from '../src/systems/walk.js';
import { W, FLOOR_TOP, FLOOR_BOTTOM } from '../src/config.js';

test('a walker with no goal stays put', () => {
  const w = { x: 100, lane: 480, goal: null };
  assert.deepEqual(stepWalk(w, 0.1), { moved: 0, arrived: false, dir: 0 });
  assert.equal(w.x, 100);
});

test('walking moves at the set speed and faces the way it goes', () => {
  const w = { x: 200, lane: 500, goal: { x: 600, lane: 500 }, facing: 1 };
  const r = stepWalk(w, 0.1);
  assert.ok(Math.abs(r.moved - WALK_SPEED * 0.1) < 1e-6);
  assert.equal(r.dir, 1);
  assert.ok(Math.abs(w.x - (200 + WALK_SPEED * 0.1)) < 1e-6);
  const back = { x: 600, lane: 500, goal: { x: 100, lane: 500 }, facing: 1 };
  stepWalk(back, 0.1);
  assert.equal(back.facing, -1);
});

test('it arrives exactly on the goal without overshooting, then clears the goal', () => {
  const w = { x: 100, lane: 480, goal: { x: 130, lane: 500 } };
  let arrived = false;
  for (let i = 0; i < 100 && !arrived; i++) arrived = stepWalk(w, 1 / 30).arrived;
  assert.ok(arrived);
  assert.equal(w.x, 130); assert.equal(w.lane, 500); assert.equal(w.goal, null);
});

test('goals are kept on the floor and away from the walls', () => {
  assert.deepEqual(clampGoal(-50, 100), { x: 100, lane: FLOOR_TOP });
  assert.deepEqual(clampGoal(5000, 5000), { x: W - 100, lane: FLOOR_BOTTOM });
  assert.ok(isFloorTap(400, 500));
  assert.ok(!isFloorTap(400, 100));
});

test('walk pose: feet alternate, bob stays upward, amount 0 is standing still', () => {
  const p = walkPose(Math.PI / 4);
  assert.ok(p.bob <= 0);
  assert.ok(p.footL.dx > 0 && p.footR.dx < 0);
  assert.ok(p.armL < 0 && p.armR > 0);
  const still = walkPose(1.234, 0);
  assert.equal(Math.abs(still.footL.dx), 0); assert.equal(Math.abs(still.armL), 0); assert.equal(Math.abs(still.bob), 0);
});
