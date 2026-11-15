// Tidying the layout of buildings (pure functions on building data). A bathroom is its own small room, so no shower stands in
// a kitchen or a bedroom; the public buildings get furniture that belongs in them. Used by the v14 -> v15 save migration and by
// readyHouse (systems/hard/property.js).
import { roomDefW, MAX_ROOMS } from '../data/buildings.js';
import { MAX_FLOOR_W, floorWidth } from './builder.js';

const nextRoomId = b => 1 + Math.max(-1, ...b.floors.flatMap(f => f.rooms.map(r => r.id)));
const hasBathroom = f => f.rooms.some(r => r.type === 'bathroom');
const SOME_SLEEP = ['bedroom', 'motel'];

// A shower that was dropped in some other room: take it out (the room's own `extra` list).
export function stripLooseShowers(b) {
  let n = 0;
  for (const f of b.floors) for (const r of f.rooms) {
    if (r.type === 'bathroom' || !r.extra) continue;
    const keep = r.extra.filter(p => p.type !== 'shower');
    n += r.extra.length - keep.length;
    if (keep.length) r.extra = keep; else delete r.extra;
  }
  return n;
}

// Every floor with a bedroom gets a bathroom of its own, and a home with none at all gets one on the ground floor.
// Returns the rooms added (room objects).
export function ensureBathrooms(b) {
  const added = [];
  const give = f => {
    if (hasBathroom(f) || f.rooms.length >= MAX_ROOMS || floorWidth(f) + roomDefW('bathroom') > MAX_FLOOR_W) return;
    const room = { id: nextRoomId(b), type: 'bathroom', w: roomDefW('bathroom') };
    f.rooms.push(room); added.push(room);
  };
  for (const f of b.floors) if (f.rooms.some(r => SOME_SLEEP.includes(r.type))) give(f);
  if (!b.floors.some(hasBathroom)) give(b.floors[0]);
  return added;
}
