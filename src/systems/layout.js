// Tidying the layout of buildings (pure functions on building data). A bathroom is its own small room, so no shower stands in
// a kitchen or a bedroom; the public buildings get furniture that belongs in them. Used by the v14 -> v15 save migration and by
// readyHouse (systems/hard/property.js).
import { roomDefW, MAX_ROOMS } from '../data/buildings.js';
import { scaleX } from '../data/rooms.js';
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

// ---- batch 1 (homes): refreshing rooms the player has not touched --------------------------------------------------
// What these rooms started with before the home layouts were refined (save v15 and earlier). A saved room that still equals this is
// untouched, so it can take the new layout without losing anything of the player's.
export const OLD_HOME_PROPS = {
  kitchen: [
    { type: 'shelf', x: 165, y: 309, stock: ['apple', 'banana', 'cookie', 'pizza'] }, { type: 'shelf', x: 795, y: 309, stock: ['burger', 'taco', 'donut'] },
    { type: 'fridge', x: 372, y: 434 }, { type: 'oven', x: 590, y: 434 }, { type: 'pantry', x: 200, y: 520 }, { type: 'table', x: 745, y: 540 },
    { type: 'chair', x: 590, y: 540 }, { type: 'lightswitch', x: 890, y: 168 },
  ],
  living: [
    { type: 'shelf', x: 165, y: 309, stock: ['puzzle', 'guitar', 'backpack'] }, { type: 'shelf', x: 795, y: 309, stock: ['ball', 'duck', 'kite'] },
    { type: 'bookcase', x: 372, y: 434 }, { type: 'armchair', x: 640, y: 530 }, { type: 'lightswitch', x: 890, y: 168 },
  ],
  bedroom: [
    { type: 'shelf', x: 165, y: 309, stock: ['teddy', 'ball', 'car', 'box'] }, { type: 'shelf', x: 795, y: 309, stock: ['cap', 'crown', 'shades'] },
    { type: 'wardrobe', x: 372, y: 434 }, { type: 'chest', x: 590, y: 434 }, { type: 'bed', x: 480, y: 540 }, { type: 'lightswitch', x: 890, y: 168 },
  ],
};
const sig = list => list.map(p => `${p.type}@${p.x}@${p.y}#${(p.items || []).map(i => (i ? `${i.s}:${i.k}` : '')).join(',')}`).sort().join('|');
// Is this saved furniture list exactly the old default for the room (its type's pieces plus its `extra`)?
export function isOldDefault(type, w, extra, saved) {
  const old = OLD_HOME_PROPS[type];
  if (!old || !Array.isArray(saved) || saved.some(p => !p || typeof p !== 'object')) return false;
  const mine = [...old, ...(extra || [])].map(p => ({ type: p.type, x: scaleX(p.x, w), y: p.y, items: (p.stock || []).map((k, s) => ({ s, k })) }));
  return sig(mine) === sig(saved);
}

// A mailbox that stood where the pantry now is moves just inside the door.
export const MAILBOX_X = 170;
export function moveMailbox(room) {
  for (const p of room.extra || []) if (p.type === 'mailbox' && p.x === 250) p.x = MAILBOX_X;
}

// The computer stood in the living room (where the sofa and TV now are): it moves to a bedroom on the same floor, if there is one.
export function moveComputer(floor, free = () => true) {
  const bed = floor.rooms.find(r => (r.type === 'bedroom' || r.type === 'kidsroom') && free(r));
  if (!bed) return;
  for (const r of floor.rooms) {
    if (r.type !== 'living' || !r.extra || !free(r)) continue;
    const at = r.extra.findIndex(p => p.type === 'computer');
    if (at < 0) continue;
    const [pc] = r.extra.splice(at, 1);
    if (!r.extra.length) delete r.extra;
    bed.extra = [...(bed.extra || []), { ...pc, x: 720 }];
  }
}
