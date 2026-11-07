// Furniture placement and storage-slot maths. Pure (no Phaser), so it's tested.
import { W } from '../config.js';

export const MAX_FURNITURE = 14;       // pieces per room
export const SLOT_SCALE = 0.55;        // stored items are shown at this scale

// Keep a piece of furniture where it belongs. `groundY` is its bottom edge.
// Floor pieces stand on the floor; wall pieces hang between the ceiling and the skirting.
export function clampPlacement(def, x, groundY, worldW = W) {
  const down = v => Math.floor(v / 10) * 10, up = v => Math.ceil(v / 10) * 10;
  const [xLo, xHi] = [up(def.w / 2 + 10), down(worldW - def.w / 2 - 10)];
  const [yLo, yHi] = def.mount === 'wall' ? [up(def.h + 60), 410] : [430, 540];
  const snap = v => Math.round(v / 10) * 10;                           // 10px grid; bounds are on the grid too
  return { x: Math.min(xHi, Math.max(xLo, snap(x))), y: Math.min(yHi, Math.max(yLo, snap(groundY))) };
}

// Index of the free slot nearest to (px, py) (both in the slots' coordinate space), or -1 if full.
// `occupied[i]` is truthy when slot i is taken.
export function nearestFreeSlot(slots, occupied, px, py) {
  let best = -1, bestD = Infinity;
  slots.forEach((s, i) => {
    if (occupied[i]) return;
    const d = Math.hypot(s.x - px, s.y - py);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

export const accepts = (def, kind) => !def.accepts || def.accepts.includes(kind);
