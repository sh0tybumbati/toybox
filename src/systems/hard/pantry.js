// Food you carry and store (pure). A list holds { k: foodKey, exp: gameMinuteItGoesOff }, kept in order of when it spoils.
import { FRIDGE_MULT, shelfLifeOf } from '../../data/hard/food.js';

const byExpiry = (a, b) => a.exp - b.exp;

// `list` plus one `key` bought at game minute `now` (its life times `mult`), or null if there is no room.
export function addFood(list, key, now, cap, mult = 1) {
  if (list.length >= cap) return null;
  return [...list, { k: key, exp: now + shelfLifeOf(key) * 1440 * mult }].sort(byExpiry);
}

// What has gone off by `now`: { kept, spoiled: [keys] }.
export function expire(list, now) {
  return { kept: list.filter(f => f.exp > now), spoiled: list.filter(f => f.exp <= now).map(f => f.k) };
}

// The food that will spoil soonest (the one to eat): { item, rest } or null.
export function takeBest(list) {
  if (!list.length) return null;
  const sorted = [...list].sort(byExpiry);
  return { item: sorted[0], rest: sorted.slice(1) };
}

// Move food from a bag into the larder (what fits). A fridge keeps food longer: the remaining life is stretched.
// Returns { from, to, moved }.
export function store(from, to, now, cap, fridge = false) {
  let rest = [...from], full = [...to], moved = 0;
  for (const f of from) {
    if (full.length >= cap) break;
    const left = Math.max(0, f.exp - now), item = { k: f.k, exp: now + left * (fridge ? FRIDGE_MULT : 1) };
    full.push(item); rest = rest.filter(x => x !== f); moved++;
  }
  return { from: rest, to: full.sort(byExpiry), moved };
}

export function cleanFood(raw, cap) {
  return (Array.isArray(raw) ? raw : []).filter(f => f && typeof f.k === 'string' && Number.isFinite(f.exp)).slice(0, cap).map(f => ({ k: f.k, exp: Math.floor(f.exp) })).sort(byExpiry);
}
