// Versioned saves. Pure helpers (migrate/sanitize) are separate from the
// IndexedDB store so they can be unit-tested without a browser.
//
// Schema v8:
//   { v: 8, room, tips: [seenTipId], furniture: { roomKey: [{ type, x, y, items: [{ s: slot, k: itemKey }] }] | null }, night: bool, coins: int, unlocked: [premiumKey], recipes: [recipeId], floors: { roomKey: [{ k, x, l }] },
//     characters: [{ id, name, look, x, lane, scale, worn: { slot: itemKey } }] }
//
// v7 had no tips (migrated players have seen them all); v6 had no furniture (null = the room's default layout); v5 had no recipes; v4 had no coins/unlocked; v3 had no `night`; v2 had no name/look; v1 had a single `char` + top-level `worn`. migrate()
// upgrades them step by step.
import { SAVE_VERSION, W, FLOOR_TOP, FLOOR_BOTTOM } from '../config.js';
import { CATALOG, SLOTS_FOR } from '../data/items.js';
import { ROOMS, ROOM_ORDER } from '../data/rooms.js';
import { isPremium } from '../data/economy.js';
import { RECIPES } from '../data/recipes.js';
import { ALL_TIP_IDS } from '../data/tips.js';
import { PROP_TYPES } from '../data/props.js';
import { clampPlacement, MAX_FURNITURE } from './slots.js';
import { clamp } from '../util.js';
import { DEFAULT_LOOK, sanitizeLook } from '../data/look.js';
import { MAX_PARTY, defaultParty } from '../data/characters.js';

const ok = Number.isFinite;

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
  return d.v === SAVE_VERSION ? d : null;
}

// Accepts anything, returns a clean v2 save or null. Unknown items/rooms are
// dropped and numbers clamped, so a damaged or hand-edited save can't crash us.
export function sanitize(raw) {
  const d = migrate(raw);
  if (!d || !ROOMS[d.room]) return null;

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
        x: ok(c.x) ? clamp(c.x, 100, W - 100) : undefined,
        lane: ok(c.lane) ? clamp(c.lane, FLOOR_TOP, FLOOR_BOTTOM) : undefined,
        scale: ok(c.scale) ? clamp(c.scale, 1, 1.5) : undefined,
        worn,
      };
    });

  const floors = {};
  for (const room of ROOM_ORDER) {
    const list = d.floors && d.floors[room];
    floors[room] = (Array.isArray(list) ? list : [])
      .filter(f => f && CATALOG[f.k] && ok(f.x) && ok(f.l))
      .map(f => ({ k: f.k, x: clamp(f.x, 30, W - 30), l: clamp(f.l, FLOOR_TOP, FLOOR_BOTTOM) }));
  }
  const coins = Number.isFinite(d.coins) ? clamp(Math.floor(d.coins), 0, 999999) : 0;
  const unlocked = [...new Set(Array.isArray(d.unlocked) ? d.unlocked.filter(k => isPremium(k)) : [])];
  const tips = [...new Set(Array.isArray(d.tips) ? d.tips.filter(id => ALL_TIP_IDS.includes(id)) : [])];
  const furniture = {};
  for (const room of ROOM_ORDER) furniture[room] = sanitizeFurniture(d.furniture && d.furniture[room]);
  const known = new Set(RECIPES.map(r => r.id));
  const recipes = [...new Set(Array.isArray(d.recipes) ? d.recipes.filter(id => known.has(id)) : [])];
  return { v: SAVE_VERSION, room: d.room, night: Boolean(d.night), coins, unlocked, recipes, furniture, tips, characters: characters.length ? characters : defaultParty(), floors };
}

// A room's furniture list, or null (= use the room's default layout).
function sanitizeFurniture(list) {
  if (!Array.isArray(list)) return null;
  return list.filter(f => f && PROP_TYPES[f.type] && ok(f.x) && ok(f.y)).slice(0, MAX_FURNITURE).map(f => {
    const def = PROP_TYPES[f.type], used = new Set();
    const items = (Array.isArray(f.items) && def.slots ? f.items : []).filter(it => {
      const good = it && Number.isInteger(it.s) && it.s >= 0 && it.s < def.slots.length && !used.has(it.s) && CATALOG[it.k];
      if (good) used.add(it.s);
      return good;
    }).map(it => ({ s: it.s, k: it.k }));
    return { type: f.type, ...clampPlacement(def, f.x, f.y), items };
  });
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
