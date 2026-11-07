// Playground riding maths. Pure (no Phaser), so it's tested. A play prop (data/props.js `ride`) has moving
// `parts` (a swing seat, a seesaw plank) that rock about a pivot and carry riders on `seats`, or a `slide`
// that riders climb and slide down. All coordinates are local to the prop's centre.

export const SLIDE_MS = 2200;            // up the ladder and down the chute
export const CLIMB_SHARE = 0.42;         // how much of that is the climb
export const RAMP = 2.5;                 // rocking fades in/out over about 0.4s

// Angle (radians) of a moving part at `t` seconds; `k` (0..1) is how much it is rocking.
export const partAngle = (part, t, k) => (part.motion ? k * part.motion.amp * Math.sin(2 * Math.PI * (part.motion.hz * t + part.motion.phase)) : 0);

// Where a point (x, y) ends up when its part is rotated by `a` about the part's pivot.
export function rotateAbout(pivot, x, y, a) {
  const dx = x - pivot.x, dy = y - pivot.y, c = Math.cos(a), s = Math.sin(a);
  return { x: pivot.x + dx * c - dy * s, y: pivot.y + dx * s + dy * c };
}

// The first seat nobody has, as { part, seat } indices, or null. `taken` is a list of { part, seat }.
export function freeSeat(ride, taken) {
  const parts = (ride && ride.parts) || [];
  for (let p = 0; p < parts.length; p++) {
    for (let s = 0; s < parts[p].seats.length; s++) if (!taken.some(t => t.part === p && t.seat === s)) return { part: p, seat: s };
  }
  return null;
}

export const seatCount = ride => ((ride && ride.parts) || []).reduce((n, p) => n + p.seats.length, 0);

// A rider's hip position (prop-local) on a seat at the given part angle.
export const seatPoint = (ride, part, seat, a) => rotateAbout(ride.parts[part].pivot, ride.parts[part].seats[seat].x, ride.parts[part].seats[seat].y, a);

// Where a slide rider is at progress u (0..1): up the ladder, then down the chute (speeding up).
// `lean` is the tilt in degrees: upright climbing, leaning back as they slide.
export function slidePoint(slide, u) {
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  if (u < CLIMB_SHARE) return { ...lerp(slide.base, slide.top, u / CLIMB_SHARE), lean: 0 };
  const t = (u - CLIMB_SHARE) / (1 - CLIMB_SHARE);
  const p = lerp(slide.top, slide.end, t * t * (3 - 2 * t) * 0.5 + t * t * 0.5);
  const dx = slide.end.x - slide.top.x, dy = slide.end.y - slide.top.y;
  return { ...p, lean: -Math.atan2(dy, dx) * 180 / Math.PI * 0.5 };
}
