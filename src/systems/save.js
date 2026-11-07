// Versioned saves. Pure helpers (migrate/sanitize) are separate from the
// IndexedDB store so they can be unit-tested without a browser.
//
// Schema v12 (the world is a city of buildings; a zone is one floor of one, see systems/world.js):
//   { v: 12, shirts: [{ color, pattern }], toys: [toy design (data/toys.js)], zone: "slot.floor", city: [buildingKey | null], looks: { sectionId: { wall, floor, windows } },
//     pets: [petKind], tips: [seenTipId], furniture: { sectionId: [{ type, x, y, items: [{ s: slot, k: itemKey }] }] | null },
//     night: bool, coins: int, unlocked: [premiumKey], recipes: [recipeId], floors: { sectionId: [{ k, x, l }] },
//     characters: [{ id, name, look, x, lane, scale, worn: { slot: itemKey } }] }
// Furniture and floor items are stored per room (section) in that room's own 0..960 coordinates;
// characters use zone (world) x.
//
// v11 still had endless wall shelves in homes and parks (now stocked furniture); v10 had no shirt/toy designs; v9 had a flat list of rooms (kitchen, bedroom, park, shop) instead of a city; v8 had no pets; v7 had no tips (migrated players have seen them all); v6 had no furniture (null = the room's default layout); v5 had no recipes; v4 had no coins/unlocked; v3 had no `night`; v2 had no name/look; v1 had a single `char` + top-level `worn`. migrate()
// upgrades them step by step.
import { SAVE_VERSION, FLOOR_TOP, FLOOR_BOTTOM } from '../config.js';
import { CATALOG, SLOTS_FOR } from '../data/items.js';
import { ROOMS, defaultFurniture } from '../data/rooms.js';
import { WALLPAPERS, FLOORS } from '../data/decor.js';
import { ROOM_W, MAX_FLOORS, MAX_ROOMS, SLOTS, starterCity } from '../data/buildings.js';
import { EXTERIOR_WALLS, TRIMS, ROOF_STYLES, ROOF_COLORS, defaultExterior } from '../data/exterior.js';
import { allSections, zoneInfo, entryZone } from './world.js';
import { isPremium } from '../data/economy.js';
import { RECIPES } from '../data/recipes.js';
import { ALL_TIP_IDS } from '../data/tips.js';
import { PROP_TYPES } from '../data/props.js';
import { clampPlacement, MAX_FURNITURE } from './slots.js';
import { clamp } from '../util.js';
import { DEFAULT_LOOK, sanitizeLook } from '../data/look.js';
import { MAX_PARTY, defaultParty } from '../data/characters.js';
import { PETS, MAX_PETS } from '../data/pets.js';
import { PATTERNS } from '../data/patterns.js';
import { registerToys, sanitizeToy } from '../data/toys.js';
import { cleanParcels } from './mail.js';
import { ARCADE_GAMES } from '../data/minigames.js';

const ok = Number.isFinite;
const isColor = v => Number.isInteger(v) && v >= 0 && v <= 0xffffff;

export function migrate(d) {
  if (!d || typeof d !== 'object') return null;
  if (d.v === 1) {
    const ch = d.char || {};
    d = {
      v: 2, room: d.room, floors: d.floors,
      characters: [{ id: 'kid', x: ch.x, lane: ch.lane, scale: ch.scale, worn: d.worn }],
    };
  }
  if (d.v === 2) {
    d = {
      ...d, v: 3,
      characters: (Array.isArray(d.characters) ? d.characters : [])
        .map(c => ({ ...c, name: c && c.id === 'kid' ? 'Kid' : 'Pal', look: DEFAULT_LOOK })),
    };
  }
  if (d.v === 3) d = { ...d, v: 4, night: false };
  if (d.v === 4) d = { ...d, v: 5, coins: 0, unlocked: [] };
  if (d.v === 5) d = { ...d, v: 6, recipes: [] };
  if (d.v === 6) d = { ...d, v: 7, furniture: {} };
  if (d.v === 7) d = { ...d, v: 8, tips: [...ALL_TIP_IDS] };
  if (d.v === 8) d = { ...d, v: 9, pets: [] };
  if (d.v === 9) d = migrateRoomsToCity(d);
  if (!d) return null;
  if (d.v === 10) d = { ...d, v: 11, shirts: [], toys: [] };
  if (d.v === 11) d = migrateStock(d);
  return d.v === SAVE_VERSION ? d : null;
}

// v11 -> v12: homes and parks traded their endless wall shelves for stocked furniture and playground gear. Rooms the
// player had already arranged get the new pieces added (they can move or remove them); untouched rooms use the new defaults.
export const STOCKED_TYPES = ['shelf', 'sandbox', 'picnictable', 'tree', 'bench', 'swing', 'slide', 'seesaw', 'springhorse'];
function migrateStock(d) {
  const furniture = { ...(d.furniture && typeof d.furniture === 'object' ? d.furniture : {}) };
  for (const sec of allSections(sanitizeCity(d.city))) {
    const list = furniture[sec.id];
    if (!Array.isArray(list)) continue;
    const have = new Set(list.map(f => f && f.type));
    furniture[sec.id] = [...list, ...defaultFurniture(sec.type, sec.w).filter(p => STOCKED_TYPES.includes(p.type) && !have.has(p.type))];
  }
  return { ...d, v: 12, furniture };
}

// v9 -> v10: the four old rooms become rooms of the starter city's buildings.
const OLD_ROOMS = {                     // old room key -> [zone, section id]
  kitchen: ['0.0', '0.0'], bedroom: ['0.1', '0.2'], park: ['1.0', '1.0'], shop: ['2.0', '2.0'],
};
function migrateRoomsToCity(d) {
  const here = OLD_ROOMS[d.room];
  if (!here) return null;                // not a save we know
  const rekey = obj => {
    const out = {};
    for (const [old, [, id]] of Object.entries(OLD_ROOMS)) if (obj && obj[old] !== undefined) out[id] = obj[old];
    return out;
  };
  return { ...d, v: 10, zone: here[0], city: starterCity(), looks: {}, furniture: rekey(d.furniture), floors: rekey(d.floors) };
}

// Accepts anything, returns a clean save or null. Unknown items/rooms are
// dropped and numbers clamped, so a damaged or hand-edited save can't crash us.
export function sanitize(raw) {
  const d = migrate(raw);
  if (!d || typeof d.zone !== 'string') return null;
  const city = sanitizeCity(d.city);
  const zone = zoneInfo(city, d.zone) ? d.zone : (city.findIndex(Boolean) >= 0 ? entryZone(city, city.findIndex(Boolean)) : null);
  if (!zone) return null;
  const worldW = zoneInfo(city, zone).width;

  const characters = (Array.isArray(d.characters) ? d.characters : [])
    .filter(c => c && typeof c.id === 'string')
    .slice(0, MAX_PARTY)
    .map(c => {
      const worn = {};
      for (const [slot, key] of Object.entries(c.worn || {})) {
        const def = CATALOG[key];
        if (def && (SLOTS_FOR[def.kind] || []).includes(slot)) worn[slot] = key;
      }
      return {
        id: c.id,
        name: typeof c.name === 'string' && c.name ? c.name.slice(0, 16) : 'Friend',
        look: sanitizeLook(c.look),
        x: ok(c.x) ? clamp(c.x, 100, Math.max(100, worldW - 100)) : undefined,
        lane: ok(c.lane) ? clamp(c.lane, FLOOR_TOP, FLOOR_BOTTOM) : undefined,
        scale: ok(c.scale) ? clamp(c.scale, 1, 1.5) : undefined,
        worn,
      };
    });

  const toys = (Array.isArray(d.toys) ? d.toys.map(sanitizeToy).filter(Boolean) : []).filter((t, i, a) => a.findIndex(u => u.id === t.id) === i).slice(0, 12);
  registerToys(toys);                                       // custom toys are items: they must exist before anything refers to them
  const sections = allSections(city);
  const floors = {};
  for (const sec of sections) {
    const list = d.floors && d.floors[sec.id];
    floors[sec.id] = (Array.isArray(list) ? list : [])
      .filter(f => f && CATALOG[f.k] && ok(f.x) && ok(f.l))
      .map(f => ({ k: f.k, x: clamp(f.x, 30, sec.w - 30), l: clamp(f.l, FLOOR_TOP, FLOOR_BOTTOM) }));
  }
  const coins = Number.isFinite(d.coins) ? clamp(Math.floor(d.coins), 0, 999999) : 0;
  const unlocked = [...new Set(Array.isArray(d.unlocked) ? d.unlocked.filter(k => isPremium(k)) : [])];
  const tips = [...new Set(Array.isArray(d.tips) ? d.tips.filter(id => ALL_TIP_IDS.includes(id)) : [])];
  const furniture = {};
  const looks = {};
  for (const sec of sections) {
    furniture[sec.id] = sanitizeFurniture(d.furniture && d.furniture[sec.id], sec.w);
    const look = sanitizeLook2(d.looks && d.looks[sec.id], sec.w);
    if (look) looks[sec.id] = look;
  }
  const known = new Set(RECIPES.map(r => r.id));
  const recipes = [...new Set(Array.isArray(d.recipes) ? d.recipes.filter(id => known.has(id)) : [])];
  const pets = (Array.isArray(d.pets) ? d.pets.filter(k => Object.prototype.hasOwnProperty.call(PETS, k)) : []).slice(0, MAX_PETS);
  const shirts = (Array.isArray(d.shirts) ? d.shirts : []).filter(s => s && isColor(s.color)).slice(0, 8)
    .map(s => ({ color: s.color, pattern: s.pattern && PATTERNS[s.pattern.id] && isColor(s.pattern.color) ? { id: s.pattern.id, color: s.pattern.color } : null }));
  const parcels = cleanParcels(d.parcels, k => Boolean(CATALOG[k]), city);
  const scores = {};
  for (const id of Object.keys(ARCADE_GAMES)) if (d.scores && Number.isFinite(d.scores[id]) && d.scores[id] > 0) scores[id] = clamp(Math.floor(d.scores[id]), 0, 99999);
  return { v: SAVE_VERSION, zone, city, looks, pets, shirts, toys, parcels, scores, night: Boolean(d.night), coins, unlocked, recipes, furniture, tips, characters: characters.length ? characters : defaultParty(), floors };
}

// A room's furniture list, or null (= use the room's default layout).
function sanitizeFurniture(list, roomW) {
  if (!Array.isArray(list)) return null;
  return list.filter(f => f && PROP_TYPES[f.type] && ok(f.x) && ok(f.y)).slice(0, MAX_FURNITURE).map(f => {
    const def = PROP_TYPES[f.type], used = new Set();
    const items = (Array.isArray(f.items) && def.slots ? f.items : []).filter(it => {
      const good = it && Number.isInteger(it.s) && it.s >= 0 && it.s < def.slots.length && !used.has(it.s) && CATALOG[it.k];
      if (good) used.add(it.s);
      return good;
    }).map(it => ({ s: it.s, k: it.k }));
    return { type: f.type, ...clampPlacement(def, f.x, f.y, roomW), items };
  });
}

// A room's custom look (wallpaper, floor, windows), or null if there's none worth keeping.
function sanitizeLook2(look, roomW) {
  if (!look || typeof look !== 'object') return null;
  const windows = Array.isArray(look.windows) ? look.windows.filter(w => w && ok(w.x) && ok(w.y) && ok(w.w) && ok(w.h)).slice(0, 4)
    .map(w => ({ x: clamp(Math.round(w.x), 0, roomW - 60), y: clamp(Math.round(w.y), 20, 260), w: clamp(Math.round(w.w), 60, 320), h: clamp(Math.round(w.h), 60, 220) })) : null;
  return {
    wall: Object.prototype.hasOwnProperty.call(WALLPAPERS, look.wall) ? look.wall : null,
    floor: Object.prototype.hasOwnProperty.call(FLOORS, look.floor) ? look.floor : null,
    windows,                                   // null = the room type's own windows
  };
}

const has = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k);

// One building from untrusted data, or null if it isn't a usable building.
export function sanitizeBuilding(b) {
  if (!b || typeof b !== 'object' || !Array.isArray(b.floors)) return null;
  const usedFloors = new Set(), usedRooms = new Set();             // separate id spaces
  const taker = used => id => (Number.isInteger(id) && id >= 0 && id < 1000 && !used.has(id) ? (used.add(id), true) : false);
  const takeFloor = taker(usedFloors), takeRoom = taker(usedRooms);
  const floors = [];
  for (const f of b.floors.slice(0, MAX_FLOORS)) {
    if (!f || !Array.isArray(f.rooms) || !takeFloor(f.id)) continue;
    const rooms = [];
    for (const r of f.rooms.slice(0, MAX_ROOMS)) {
      if (!r || !ROOMS[r.type] || !takeRoom(r.id)) continue;
      const w = ok(r.w) ? clamp(Math.round(r.w / ROOM_W.step) * ROOM_W.step, ROOM_W.min, ROOM_W.max) : ROOM_W.def;
      const extra = (Array.isArray(r.extra) ? r.extra : []).filter(p => p && PROP_TYPES[p.type] && ok(p.x) && ok(p.y)).slice(0, 6)
        .map(p => ({ type: p.type, x: clamp(Math.round(p.x), 0, ROOM_W.def), y: clamp(Math.round(p.y), 430, 540) }));
      rooms.push({ id: r.id, type: r.type, w, ...(extra.length ? { extra } : {}) });
    }
    if (rooms.length) floors.push({ id: f.id, rooms });
  }
  if (!floors.length) return null;
  const e = b.exterior || {}, d = defaultExterior();
  return {
    name: typeof b.name === 'string' && b.name ? b.name.slice(0, 20) : 'Building',
    exterior: {
      wall: has(EXTERIOR_WALLS, e.wall) ? e.wall : d.wall, trim: has(TRIMS, e.trim) ? e.trim : d.trim,
      roofStyle: has(ROOF_STYLES, e.roofStyle) ? e.roofStyle : d.roofStyle, roofColor: has(ROOF_COLORS, e.roofColor) ? e.roofColor : d.roofColor,
    },
    floors,
  };
}

// The city: one building (or null) per lot; anything unusable becomes an empty lot. No usable city = the starter city.
export function sanitizeCity(city) {
  if (!Array.isArray(city)) return starterCity();
  const out = SLOTS.map((_, i) => sanitizeBuilding(city[i]));
  return out.some(Boolean) ? out : starterCity();
}

// ---------------------------------------------------------------------------
// Storage: IndexedDB (room for drawn art later), localStorage as a fallback and
// as the source of old saves. Every failure degrades to "no save".
const DB_NAME = 'toybox', STORE = 'saves', KEY = 'main';
const LS_V1 = 'toybox-save-v1', LS_V2 = 'toybox-save-v2';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function request(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class SaveStore {
  // Resolves to a sanitized save or null (first run / unreadable).
  async load() {
    let raw = null;
    try {
      const db = await openDb();
      raw = await request(db, 'readonly', s => s.get(KEY));
      db.close();
    } catch (e) { /* IndexedDB unavailable */ }
    if (!raw) raw = this.readLocal(LS_V2) || this.readLocal(LS_V1);   // fallback / legacy
    return sanitize(raw);
  }

  async save(data) {
    try {
      const db = await openDb();
      await request(db, 'readwrite', s => s.put(data, KEY));
      db.close();
    } catch (e) {
      try { localStorage.setItem(LS_V2, JSON.stringify(data)); } catch (e2) { /* no storage at all */ }
    }
  }

  async clear() {
    try {
      const db = await openDb();
      await request(db, 'readwrite', s => s.delete(KEY));
      db.close();
    } catch (e) { /* ignore */ }
    try { localStorage.removeItem(LS_V1); localStorage.removeItem(LS_V2); } catch (e) { /* ignore */ }
  }

  readLocal(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
}

export const saveStore = new SaveStore();
