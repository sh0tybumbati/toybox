// The back alley's black market (pure): a contact who only shows up after dark sells things with no questions asked,
// and what you do there is noticed. `heat` (0..100) is how much attention you have drawn; it fades with time.
import { hash01 } from './weather.js';
import { hardPriceOf } from '../../data/hard/food.js';
import { CROPS, GEAR } from '../../data/hard/plants.js';
import { HIDES, HIDE_IDS } from '../../data/hard/police.js';
import { ADDITIVES, ADDITIVE_IDS } from '../../data/hard/lab.js';

export const BURNER_PRICE = 1800;
export const HOT_GOODS = ['bread', 'rice', 'cheese', 'meat', 'fish', 'milk', 'egg', 'potato'];
export const HOT_STOCK = 3;                      // of each, per day
export const HOT_DISCOUNT = 0.5;                 // stolen food goes for half the shop price
export const HEAT = { goods: 4, phone: 2, decayPerDay: 8, max: 100 };

// What the contact has on a given day: a burner phone (cheap, no bills, no name) and three kinds of "fell off a lorry" food.
export function offers(day) {
  const picks = HOT_GOODS.map((k, i) => ({ k, r: hash01(day * 71 + i * 19 + 5) })).sort((a, b) => a.r - b.r).slice(0, 3).map(x => x.k);
  return [
    { id: 'burner', label: 'Burner phone', price: BURNER_PRICE, note: 'No questions. No contract.', heat: HEAT.phone },
    ...picks.map(k => ({ id: k, food: k, label: `${k[0].toUpperCase()}${k.slice(1)} (hot)`, price: Math.max(1, Math.floor(hardPriceOf(k) * HOT_DISCOUNT)), note: 'Fell off a lorry.', heat: HEAT.goods, stock: HOT_STOCK })),
  ];
}

// The dark stock: the first invented plant's seeds, additives for the mixing bench, and the bench itself. Draws more heat.
export const SUPPLY_HEAT = { seed: 6, additive: 3, bench: 5 };
export function supplies() {
  return [
    { id: 'seed:nightbloom', seed: 'nightbloom', label: `${CROPS.nightbloom.icon} Nightbloom seeds`, price: CROPS.nightbloom.seed, note: 'Slow and fussy. Indoors, under a lamp.', heat: SUPPLY_HEAT.seed, stock: 2 },
    ...ADDITIVE_IDS.map(a => ({ id: `add:${a}`, additive: a, label: `${ADDITIVES[a].icon} ${ADDITIVES[a].label}`, price: ADDITIVES[a].price, note: ADDITIVES[a].note, heat: SUPPLY_HEAT.additive, stock: 5 })),
    ...HIDE_IDS.map(k => ({ id: `hide:${k}`, hide: k, label: `${HIDES[k].icon} ${HIDES[k].label}`, price: HIDES[k].price, note: HIDES[k].note, heat: 2, stock: 1 })),
    { id: 'gear:bench', gear: 'bench', label: `${GEAR.bench.icon} ${GEAR.bench.label}`, price: GEAR.bench.price, note: GEAR.bench.note, heat: SUPPLY_HEAT.bench, stock: 1 },
  ];
}

export const addHeat = (heat, n) => Math.max(0, Math.min(HEAT.max, heat + n));
export const decayHeat = (heat, days = 1) => Math.max(0, heat - HEAT.decayPerDay * days);
