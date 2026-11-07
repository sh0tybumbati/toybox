// Squash and stretch, as pure maths (art/reference/: things are rubbery and bend when you grab, throw or sit
// on them). Two ingredients:
//   * flightStretch: stretch along the direction of motion, squash across it, keeping the area (volume) the same
//   * jelly: a damped spring you poke with an impulse, for the wobble after a bump
import { clamp } from '../util.js';

// How much to stretch something moving at (vx, vy) px/s. Returns { x, y } scale factors (1,1 = at rest).
// The dominant direction stretches: a fast fall or throw upward makes it tall and thin, a sideways throw wide and flat.
export function flightStretch(vx, vy, { max = 0.24, ref = 1500 } = {}) {
  const speed = Math.hypot(vx, vy);
  if (speed < 1) return { x: 1, y: 1 };
  const amount = max * (1 - Math.exp(-speed / ref));            // eases toward `max`, never beyond
  const along = 1 + amount, across = 1 / along;                  // area-preserving
  return Math.abs(vy) >= Math.abs(vx) ? { x: across, y: along } : { x: along, y: across };
}

// Ease a stretch toward its target (so it doesn't flicker frame to frame). rate = how quickly (per second).
export function easeStretch(cur, target, dt, rate = 18) {
  const k = 1 - Math.exp(-rate * dt);
  cur.x += (target.x - cur.x) * k;
  cur.y += (target.y - cur.y) * k;
  return cur;
}

// A jelly wobble. state = { x (displacement), v (velocity) }; poke(state, impulse) kicks it (negative = squash first).
export const newJelly = () => ({ x: 0, v: 0 });
export function poke(j, impulse) { j.v += impulse; return j; }
export function stepJelly(j, dt, k = 240, damp = 8.5) {
  j.v += (-k * j.x - damp * j.v) * dt;
  j.x += j.v * dt;
  if (Math.abs(j.x) < 0.0004 && Math.abs(j.v) < 0.004) { j.x = 0; j.v = 0; }
  return j;
}
// The scale a jelly displacement makes: taller when positive, and wider when it is squashed.
export const jellyScale = j => ({ x: 1 - j.x * 0.7, y: 1 + clamp(j.x, -0.5, 0.6) });
