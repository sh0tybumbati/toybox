// Things to stand on: furniture tops and other items. Pure (no Phaser), so it is tested.
// A surface is { x0, x1, lane, h, owner, people }: bodies over [x0, x1], on (about) the same floor lane, land
// on it at height `h` above that lane. `owner` is the prop or item it belongs to. A body "rests" on a surface
// when it is at that height; `b.base` is the owner it rests on (null for the floor).
export const LANE_TOL = 36;        // how far in depth a body can be from a surface and still land on it
export const REACH = 170;          // a drop from higher than this above a surface doesn't snap to it
export const KEEP = 60;           // lifted off a surface and put down over it again: it stays on it unless dropped well below the edge
export const STACK_MAX = 6;        // items that can be piled on top of each other

const over = (b, s) => b.x >= s.x0 && b.x <= s.x1 && Math.abs(b.lane - s.lane) <= LANE_TOL;
const restsOn = (a, b) => { for (let o = a, n = 0; o && n < 12; o = o.base, n++) if (o === b) return true; return false; };
export const stackDepth = b => { let n = 0; for (let o = b.base; o && n < 20; o = o.base) n++; return n; };

// A piece of furniture's top as a surface (or null if it has none). Floor furniture only.
export function propSurface(prop) {
  const d = prop.def;
  if (!d.surface || d.mount !== 'floor') return null;
  return { x0: prop.x - d.w / 2 + 6, x1: prop.x + d.w / 2 - 6, lane: prop.y + d.h / 2, h: d.h / 2 - d.surface.top, owner: prop, people: d.surface.people !== false };
}

// An item's top as a surface, for stacking (a still item that isn't worn, shelved or stored).
export function itemSurface(item) {
  return { x0: item.x - item.stackW / 2, x1: item.x + item.stackW / 2, lane: item.lane, h: item.z + item.stackH, owner: item, people: false };
}

const usable = (b, s) => s.owner !== b && !(s.people === false && b.person) && !restsOn(s.owner, b) && !(s.owner.base !== undefined && stackDepth(s.owner) >= STACK_MAX - 1 && !b.person);

// The highest surface under `b` that it is at (or above) when at height `z`: { h, owner }, owner null = the floor.
export function restOn(b, surfaces, z = b.z) {
  let best = { h: 0, owner: null };
  for (const s of surfaces) if (s.h <= z + 2 && s.h > best.h && over(b, s) && usable(b, s)) best = s;
  return best;
}

// Let go with the feet at screen `feetY`: if that is above a surface that b is over, adopt its lane so it lands on it
// (a little below the edge is fine for the surface it was lifted from).
export function adopt(b, feetY, surfaces) {
  let best = null;
  for (const s of surfaces) {
    if (b.x < s.x0 || b.x > s.x1 || !usable(b, s)) continue;
    const topY = s.lane - s.h;
    if (feetY <= topY + (s.owner === b.base ? KEEP : 4) && feetY >= topY - REACH && (!best || s.h > best.h)) best = s;
  }
  return best;
}
