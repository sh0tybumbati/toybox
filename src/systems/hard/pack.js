// Bags and how many things a person can carry (pure). `packs` maps a person's id to a pack tier (none = pockets); the bag holds food,
// and each batch of product carried by that person takes a slot too.
import { PACKS, PACK_IDS } from '../../data/hard/food.js';

export const tierOf = (packs, id) => (packs && PACKS[packs[id]] ? packs[id] : 'pockets');
export const slotsOf = (packs, id) => PACKS[tierOf(packs, id)].slots;
export const carriedBy = (goods, id) => (goods || []).filter(g => g.at === 'carry' && (g.by === id || g.by === undefined)).length;
// Free food slots for this person: their bag's size, less the batches they carry, less the food already in the bag.
export const freeSlots = (packs, goods, id, bag) => Math.max(0, slotsOf(packs, id) - carriedBy(goods, id) - bag.length);
// The cap to give addFood (total items): bag size less batches carried.
export const foodCap = (packs, goods, id) => Math.max(0, slotsOf(packs, id) - carriedBy(goods, id));

// Buy a better pack. Returns { packs, cash } or null (not an upgrade, or not enough cash).
export function buyPack(packs, id, tier, cash) {
  const t = PACKS[tier], now = PACKS[tierOf(packs, id)];
  if (!t || t.slots <= now.slots || cash < t.price) return null;
  return { packs: { ...packs, [id]: tier }, cash: cash - t.price };
}
export function whyNotPack(packs, id, tier, cash) {
  const t = PACKS[tier], now = PACKS[tierOf(packs, id)];
  if (!t) return 'no such bag';
  if (t.slots <= now.slots) return tier === tierOf(packs, id) ? 'you have it' : 'you have a bigger bag';
  return cash < t.price ? `$${t.price - cash} more` : '';
}

export function cleanPacks(raw, ids) {
  const out = {};
  if (raw && typeof raw === 'object') for (const [id, t] of Object.entries(raw).slice(0, 8)) if (PACK_IDS.includes(t) && t !== 'pockets' && (!ids || ids.includes(id))) out[String(id).slice(0, 20)] = t;
  return out;
}
