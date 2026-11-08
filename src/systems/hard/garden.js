// Garden plots (pure): plant a seed, keep it watered, wait the days, harvest. A bed is { crop, grown, water, dry, fert }.
// Rain waters everything. A bed that stays dry two days running withers.
import { CROPS, BED_CAP, GEAR } from '../../data/hard/plants.js';

export const WATER_FULL = 100;
export const WATER_LOSS = 40;           // per day, in the sun
export const WITHER_DAYS = 2;

export const newBed = crop => ({ crop, grown: 0, water: WATER_FULL, dry: 0, fert: false });

export function stage(bed) {
  if (!bed) return 'empty';
  if (bed.dry >= WITHER_DAYS) return 'dead';
  return bed.grown >= CROPS[bed.crop].days ? 'ready' : bed.grown === 0 ? 'seed' : 'growing';
}

// A day passes: the soil dries, and a watered plant grows a day.
export function tickBed(bed, rained = false) {
  if (!bed || stage(bed) === 'dead') return bed;
  const water = rained ? WATER_FULL : Math.max(0, bed.water - WATER_LOSS);
  const dry = water === 0 ? bed.dry + 1 : 0;
  const grown = water > 0 && stage(bed) !== 'ready' ? bed.grown + 1 : bed.grown;
  return { ...bed, water, dry, grown };
}

export const tickBeds = (beds, rained) => Object.fromEntries(Object.entries(beds).map(([k, b]) => [k, tickBed(b, rained)]));
export const water = bed => ({ ...bed, water: WATER_FULL, dry: 0 });

// What a ready bed gives: { item, count }.
export const harvestOf = bed => ({ item: bed.crop, count: CROPS[bed.crop].yield + (bed.fert ? 1 : 0) });

// Counts of seeds/gear the household owns: { id: n }.
export const take = (stock, id) => ((stock[id] || 0) > 0 ? { ...stock, [id]: stock[id] - 1 } : null);
export const give = (stock, id, n = 1) => ({ ...stock, [id]: (stock[id] || 0) + n });

export function cleanStock(raw, ids) {
  const out = {};
  if (raw && typeof raw === 'object') for (const id of ids) if (Number.isFinite(raw[id]) && raw[id] > 0) out[id] = Math.min(99, Math.floor(raw[id]));
  return out;
}

export function cleanBeds(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, b] of Object.entries(raw).slice(0, BED_CAP)) {
    if (!/^\d{1,2}:-?\d{1,5}$/.test(k) || !b || !CROPS[b.crop]) continue;
    out[k] = { crop: b.crop, grown: Math.max(0, Math.min(40, Math.floor(b.grown) || 0)), water: Math.max(0, Math.min(WATER_FULL, Math.floor(b.water) || 0)), dry: Math.max(0, Math.min(WITHER_DAYS, Math.floor(b.dry) || 0)), fert: Boolean(b.fert) };
  }
  return out;
}
export const GEAR_KEYS = Object.keys(GEAR);
