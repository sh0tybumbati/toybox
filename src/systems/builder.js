// The building-maker's rules, as pure functions on building data (data/buildings.js). Each
// function changes the building in place and returns what it made / the new value, or
// null/false when the change isn't allowed. Costs are charged by the caller (BUILD_COST).
import { ROOMS } from '../data/rooms.js';
import { ROOM_W, MAX_FLOORS, MAX_ROOMS } from '../data/buildings.js';
import { clamp } from '../util.js';

export const MAX_FLOOR_W = 5760;                      // keep any floor to about six screens
export const isBuildableRoom = type => Boolean(ROOMS[type] && ROOMS[type].buildable);

export const floorWidth = f => f.rooms.reduce((n, r) => n + r.w, 0);
// Floor ids and room ids are separate counters (zone = slot.floorId, section = slot.roomId); each is unique within its building.
const nextFloorId = b => 1 + Math.max(-1, ...b.floors.map(f => f.id));
const nextRoomId = b => 1 + Math.max(-1, ...b.floors.flatMap(f => f.rooms.map(r => r.id)));
export const findFloor = (b, floorId) => b.floors.find(f => f.id === floorId) || null;
export const findRoom = (b, roomId) => { for (const f of b.floors) { const r = f.rooms.find(x => x.id === roomId); if (r) return { floor: f, room: r }; } return null; };

// A new room of `type` at the end of a floor (or null if full / too wide / not a buildable type).
export function addRoom(b, floorId, type) {
  const f = findFloor(b, floorId);
  if (!f || !isBuildableRoom(type) || f.rooms.length >= MAX_ROOMS || floorWidth(f) + ROOM_W.def > MAX_FLOOR_W) return null;
  const room = { id: nextRoomId(b), type, w: ROOM_W.def };
  f.rooms.push(room);
  return room;
}

// Remove a room; a floor always keeps at least one.
export function removeRoom(b, roomId) {
  const hit = findRoom(b, roomId);
  if (!hit || hit.floor.rooms.length <= 1) return false;
  hit.floor.rooms = hit.floor.rooms.filter(r => r.id !== roomId);
  return true;
}

// Stretch a room by `steps` x ROOM_W.step (negative to shrink); returns the new width.
export function resizeRoom(b, roomId, steps) {
  const hit = findRoom(b, roomId);
  if (!hit) return null;
  const want = clamp(hit.room.w + steps * ROOM_W.step, ROOM_W.min, ROOM_W.max);
  const room = hit.room, others = floorWidth(hit.floor) - room.w;
  room.w = Math.min(want, MAX_FLOOR_W - others);
  return room.w;
}

// Swap a room with its neighbour (dir -1 = left, +1 = right).
export function moveRoom(b, roomId, dir) {
  const hit = findRoom(b, roomId);
  if (!hit) return false;
  const rooms = hit.floor.rooms, i = rooms.indexOf(hit.room), j = i + dir;
  if (j < 0 || j >= rooms.length) return false;
  [rooms[i], rooms[j]] = [rooms[j], rooms[i]];
  return true;
}

// A new floor on top, starting as one empty room.
export function addFloor(b) {
  if (b.floors.length >= MAX_FLOORS) return null;
  const floor = { id: nextFloorId(b), rooms: [{ id: nextRoomId(b), type: 'empty', w: ROOM_W.def }] };
  b.floors.push(floor);
  return floor;
}

// Remove a floor and everything on it (a building keeps at least one).
export function removeFloor(b, floorId) {
  if (b.floors.length <= 1 || !findFloor(b, floorId)) return false;
  b.floors = b.floors.filter(f => f.id !== floorId);
  return true;
}

export function setExterior(b, patch) {
  b.exterior = { ...b.exterior, ...patch };
  return b.exterior;
}



