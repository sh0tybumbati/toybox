// Walking, kept free of Phaser so it can be unit-tested.
//
// A walker has x, lane (the floor y its feet touch) and an optional `goal` { x, lane }.
// stepWalk() moves it toward the goal and reports what happened.
import { W, FLOOR_TOP, FLOOR_BOTTOM } from '../config.js';
import { clamp } from '../util.js';

export const WALK_SPEED = 190;          // px/s along the floor
export const STRIDE = 56;               // px of ground covered per full step cycle (one foot)
const ARRIVE = 4;                       // close enough

// A tap that lands anywhere on the floor band becomes a walk target.
export const isFloorTap = (x, y) => y >= FLOOR_TOP - 10 && y <= FLOOR_BOTTOM + 20;

// Where a walker may actually stand (characters keep clear of the walls and the very front).
export const clampGoal = (x, y, margin = 100, worldW = W) => ({ x: clamp(x, margin, worldW - margin), lane: clamp(y, FLOOR_TOP, FLOOR_BOTTOM) });

// Move `w` toward w.goal by up to speed*dt. Returns { moved: px travelled, arrived, dir: -1|0|1 }.
// Sets w.facing to the last horizontal direction walked, and clears w.goal on arrival.
export function stepWalk(w, dt, speed = WALK_SPEED) {
  if (!w.goal) return { moved: 0, arrived: false, dir: 0 };
  const dx = w.goal.x - w.x, dl = w.goal.lane - w.lane, dist = Math.hypot(dx, dl);
  if (dist <= ARRIVE) {
    w.x = w.goal.x; w.lane = w.goal.lane; w.goal = null;
    return { moved: 0, arrived: true, dir: 0 };
  }
  const step = Math.min(dist, speed * dt);
  w.x += (dx / dist) * step;
  w.lane += (dl / dist) * step;
  const dir = Math.abs(dx) < 1 ? 0 : Math.sign(dx);
  if (dir) w.facing = dir;
  const arrived = step >= dist - 0.001;
  if (arrived) { w.x = w.goal.x; w.lane = w.goal.lane; w.goal = null; }
  return { moved: step, arrived, dir };
}

// Pose for a walk cycle at `phase` (radians, advances by 2π per stride pair).
// Returns the vertical bob, each foot's lift/shift and each arm's swing angle.
export function walkPose(phase, amount = 1) {
  const s = Math.sin(phase), c = Math.cos(phase);
  return {
    bob: -Math.abs(s) * 7 * amount,
    footL: { dx: s * 16 * amount, lift: Math.max(0, c) * 9 * amount },
    footR: { dx: -s * 16 * amount, lift: Math.max(0, -c) * 9 * amount },
    armL: -s * 0.35 * amount,
    armR: s * 0.35 * amount,
    lean: 0.05 * amount,
  };
}
