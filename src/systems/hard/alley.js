// The back alley's black market (pure): a contact who only shows up after dark sells things with no questions asked,
// and what you do there is noticed. `heat` (0..100) is how much attention you have drawn; it fades with time.
import { hash01 } from './weather.js';
import { hardPriceOf } from '../../data/hard/food.js';

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
    ...picks.map(k => ({ id: k, food: k, label: `${k[0].toUpperCase()}${k.slice(1)} (hot)`, price: Math.round(hardPriceOf(k) * HOT_DISCOUNT / 5) * 5, note: 'Fell off a lorry.', heat: HEAT.goods, stock: HOT_STOCK })),
  ];
}

export const addHeat = (heat, n) => Math.max(0, Math.min(HEAT.max, heat + n));
export const decayHeat = (heat, days = 1) => Math.max(0, heat - HEAT.decayPerDay * days);
