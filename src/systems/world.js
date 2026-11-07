// The world as pure data: which zone (a floor of a building) is which, where its rooms sit,
// and the ids that saves use. No Phaser here, so it's tested.
//
// city:     array of buildings / null, one per lot (data/buildings.js SLOTS)
// zone:     "slot.floorId" — one floor of one building, a single wide panorama
// section:  one room of a zone, with a stable id "slot.roomId"
import { BLUEPRINTS } from '../data/buildings.js';
import { ROOMS } from '../data/rooms.js';

export const zoneKey = (slot, floorId) => `${slot}.${floorId}`;
export const sectionId = (slot, roomId) => `${slot}.${roomId}`;

export function parseZone(key) {
  const m = /^(\d+)\.(\d+)$/.exec(String(key));
  return m ? { slot: Number(m[1]), floorId: Number(m[2]) } : null;
}

export const floorLabel = index => (index === 0 ? 'Ground floor' : `Floor ${index}`);

// Everything about a zone, or null if it doesn't exist in this city.
export function zoneInfo(city, key) {
  const p = parseZone(key);
  const b = p && city[p.slot];
  const index = b ? b.floors.findIndex(f => f.id === p.floorId) : -1;
  if (index < 0) return null;
  let offset = 0;
  const sections = b.floors[index].rooms.map((r, i) => {
    const s = { id: sectionId(p.slot, r.id), type: r.type, roomId: r.id, index: i, offset, w: r.w, extra: r.extra || [] };
    offset += r.w;
    return s;
  });
  return {
    key, slot: p.slot, floorId: p.floorId, floorIndex: index, building: b, name: b.name,
    floorCount: b.floors.length, floorLabel: floorLabel(index), sections, width: offset,
  };
}

// Every section that exists in the city.
export function allSections(city) {
  const out = [];
  city.forEach((b, slot) => {
    if (b) b.floors.forEach(f => f.rooms.forEach(r => out.push({ id: sectionId(slot, r.id), type: r.type, slot, floorId: f.id, roomId: r.id, w: r.w, extra: r.extra || [] })));
  });
  return out;
}

// Which section of `zone` is world x inside, and where within it?
export function sectionAt(zone, x) {
  let hit = zone.sections[zone.sections.length - 1];
  for (const s of zone.sections) if (x < s.offset + s.w) { hit = s; break; }
  return { section: hit, local: x - hit.offset };
}

// The floors of the building a zone is in, top floor first (for the lift panel).
export function floorsOf(city, key) {
  const z = zoneInfo(city, key);
  if (!z) return [];
  return z.building.floors.map((f, i) => ({ floorId: f.id, index: i, label: floorLabel(i), zone: zoneKey(z.slot, f.id) })).reverse();
}

// Where a lot's building is entered: its ground floor.
export function entryZone(city, slot) {
  const b = city[slot];
  return b ? zoneKey(slot, b.floors[0].id) : null;
}

// Connectors (elevator / stairs / ladder) are furniture. `kinds` lists the connector prop types in
// a section's furniture; `reachableFloors` says which other floors a connector on `floorId` leads to:
// an elevator reaches every floor that has an elevator, stairs and ladders only the floor above or
// below that has the same kind. `kindsOnFloor(floor)` -> Set of connector types present there.
export const CONNECTORS = { elevator: { reach: 'any' }, stairs: { reach: 'adjacent' }, ladder: { reach: 'adjacent' } };

export function reachableFloors(building, floorId, kind, kindsOnFloor) {
  const rule = CONNECTORS[kind];
  const here = building.floors.findIndex(f => f.id === floorId);
  if (!rule || here < 0) return [];
  return building.floors.map((f, i) => ({ f, i })).filter(({ f, i }) =>
    i !== here && (rule.reach === 'any' || Math.abs(i - here) === 1) && kindsOnFloor(f).has(kind)).map(({ f }) => f.id);
}

// Can `blueprint` be built on lot `slot` with `coins`? Returns '' if yes, else the reason.
export function whyNotBuild(city, slot, blueprint, coins) {
  const b = BLUEPRINTS[blueprint];
  if (!b || b.cost == null) return 'not for sale';
  if (!(slot >= 0 && slot < city.length)) return 'no such lot';
  if (city[slot]) return 'lot is taken';
  if (b.unique && city.some(x => x && x.name === b.name)) return 'already built';
  if (coins < b.cost) return `${b.cost - coins} more coins`;
  return '';
}

export const everyRoomTypeExists = () => Object.values(BLUEPRINTS).every(b => b.floors.every(f => f.rooms.every(r => ROOMS[r.type])));
