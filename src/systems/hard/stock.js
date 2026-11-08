// Shop stock and the weekly delivery van (pure). A shop is { stock: { itemKey: n }, due, next }:
// `due` is when the van is *supposed* to arrive (the sign says so), `next` when it really will (it can run late).
import { DELIVERY_DAY, DELIVERY_HOUR, STOCK_START } from '../../data/hard/food.js';

export const newShop = (keys, nowTotal = 0, rand = Math.random) => ({ stock: Object.fromEntries(keys.map(k => [k, STOCK_START])), ...scheduleNext(nowTotal, rand) });

// The next Monday 07:00 after `nowTotal` (game minutes since day 0), and when the van really turns up.
export function scheduleNext(nowTotal, rand = Math.random) {
  const day = Math.floor(nowTotal / 1440);
  let d = day - (day % 7) + DELIVERY_DAY;
  if (d * 1440 + DELIVERY_HOUR * 60 <= nowTotal) d += 7;
  const due = d * 1440 + DELIVERY_HOUR * 60;
  return { due, next: due + delayFor(rand) };
}

// How late the van is: usually about on time, sometimes hours, now and then a day or two.
export function delayFor(rand = Math.random) {
  const r = rand();
  if (r < 0.7) return Math.floor(rand() * 31);                       // 0-30 minutes
  if (r < 0.92) return 60 + Math.floor(rand() * 301);                // 1-6 hours
  return 1440 + Math.floor(rand() * 1441);                           // 1-2 days
}

export const inStock = (shop, key) => (shop.stock[key] || 0) > 0;
export function take(shop, key) { if (!inStock(shop, key)) return false; shop.stock[key]--; return true; }

// The van arrives if it is time. Returns true when it did (the shelves are full again and the next trip is booked).
export function deliverIfDue(shop, nowTotal, rand = Math.random) {
  if (nowTotal < shop.next) return false;
  for (const k of Object.keys(shop.stock)) shop.stock[k] = STOCK_START;
  Object.assign(shop, scheduleNext(nowTotal, rand));
  return true;
}

export const totalStock = shop => Object.values(shop.stock).reduce((a, b) => a + b, 0);

export function cleanShop(raw, keys) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const stock = Object.fromEntries(keys.map(k => [k, Number.isFinite(s.stock && s.stock[k]) ? Math.max(0, Math.min(99, Math.floor(s.stock[k]))) : STOCK_START]));
  const due = Number.isFinite(s.due) ? Math.floor(s.due) : null, next = Number.isFinite(s.next) ? Math.floor(s.next) : null;
  return due != null && next != null && next >= due ? { stock, due, next } : { stock, ...scheduleNext(0) };
}
