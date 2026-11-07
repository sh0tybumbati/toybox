// Fake-3D physics, kept free of Phaser so it can be unit-tested.
//
// A body has: x (screen x), lane (floor y its bottom touches), z (height above
// the lane), plus vx, vz, ly velocities. The caller turns that into a screen y.
import { W, FLOOR_TOP, FLOOR_BOTTOM, GRAVITY, BIN } from '../config.js';
import { clamp } from '../util.js';

const WALL_MARGIN = 30;

// Release velocity from pointer samples ({t in ms, x, y}); only the last 100ms count.
export function throwVelocity(samples, now) {
  const s = samples.filter(p => now - p.t < 100);
  let vx = 0, vy = 0;
  if (s.length >= 2) {
    const a = s[0], b = s[s.length - 1], dt = (b.t - a.t) / 1000;
    if (dt > 0.01) { vx = (b.x - a.x) / dt; vy = (b.y - a.y) / dt; }
  }
  return {
    vx: clamp(vx, -1400, 1400),
    vz: clamp((0 - vy) * 0.6, -600, 900), // flick up = hop, flick down = slam
    ly: clamp(vy * 0.25, -150, 150),     // slight drift in depth along the floor
  };
}

// While feet are over the floor band the body is "on the floor plane" and its
// lane tracks it; above the band it keeps the last lane (the shadow stays behind).
export function laneForFeet(lane, feetY) {
  return feetY >= FLOOR_TOP ? Math.min(feetY, FLOOR_BOTTOM) : lane;
}

// Advance one body by dt seconds. Returns the impact speed (px/s) if it just
// hit the floor hard enough to bounce, otherwise 0.
export function stepBody(b, dt, worldW = W) {
  let impact = 0;

  if (b.z > 0 || b.vz !== 0) {
    b.vz -= GRAVITY * (b.gscale || 1) * dt;
    b.z += b.vz * dt;
    if (b.z <= 0) {
      const hit = -b.vz;
      b.z = 0;
      if (hit > 160) {
        impact = hit;
        b.vz = hit * (b.bounce || 0.38);       // bounce, losing energy
        if (b.vz < 120) b.vz = 0;
      } else {
        b.vz = 0;
      }
    }
  }

  if (b.throwable) {
    const airborne = b.z > 0;
    b.x += b.vx * dt;
    b.vx *= Math.pow(airborne ? 0.6 : 0.04, dt);        // air drag vs floor friction
    if (b.x < WALL_MARGIN)     { b.x = WALL_MARGIN;     b.vx = Math.abs(b.vx) * 0.6; }
    if (b.x > worldW - WALL_MARGIN) { b.x = worldW - WALL_MARGIN; b.vx = -Math.abs(b.vx) * 0.6; }
    b.lane = clamp(b.lane + b.ly * dt, FLOOR_TOP, FLOOR_BOTTOM);
    b.ly *= Math.pow(0.05, dt);
  }
  return impact;
}

export const isMoving = b => b.z > 0 || Math.abs(b.vx) > 1;

// `bins` = the x of every bin in the zone (each room has one).
export const inBin = (b, bins = [BIN.x]) => b.lane >= BIN.minLane && bins.some(x => Math.abs(b.x - x) < BIN.halfW);
