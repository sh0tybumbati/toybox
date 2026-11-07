// Who hugs whom, and who fits on which bed. Pure (plain objects in, answers out) so it's tested.
import { FLOOR_BOTTOM } from '../config.js';
import { clamp } from '../util.js';

export const HUG_RANGE_X = 90;         // dropped this close to a friend (px) and you hug
export const HUG_RANGE_LANE = 50;
export const HUG_GAP = 54;              // distance between two huggers' centres
export const HUG_MS = 1900;

const free = c => !c.held && !c.hugging && !c.sleeping;

// The closest friend `c` could hug right now, or null.
export function hugPartner(chars, c) {
  let best = null, bestD = Infinity;
  for (const o of chars) {
    if (o === c || !free(o)) continue;
    const dx = Math.abs(o.x - c.x), dl = Math.abs(o.lane - c.lane);
    if (dx > HUG_RANGE_X || dl > HUG_RANGE_LANE) continue;
    const d = dx + dl;
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

// Where two huggers end up: centred on their midpoint, `a` on its own side. Returns
// { a: {x, lane, tilt}, b: {...} }; tilt is the lean in degrees (toward the partner).
export function hugSpots(a, b) {
  const side = b.x >= a.x ? 1 : -1;                       // which side of `a` the partner is on
  const mid = (a.x + b.x) / 2, lane = clamp((a.lane + b.lane) / 2, 0, FLOOR_BOTTOM);
  return {
    a: { x: mid - side * HUG_GAP / 2, lane, tilt: 6 * side },
    b: { x: mid + side * HUG_GAP / 2, lane, tilt: -6 * side },
  };
}

// Is a character standing at feet (x, lane) over a bed (`bed` = { x, y (bottom edge), def: { w, h } })?
export function overBed(bed, x, lane) {
  const { w, h } = bed.def, cy = bed.y;                    // Prop.y is the centre of its box
  return Math.abs(x - bed.x) <= w / 2 && lane >= cy - h / 2 - 30 && lane <= cy + h / 2 + 30;
}

// The first free bed under (x, lane), or undefined.
export const bedAt = (props, x, lane) => props.find(p => p.def.behaviour === 'bed' && !p.sleeper && overBed(p, x, lane));
