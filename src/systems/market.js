// The supermarket: groceries cost coins, and the delivery cart sends them off by van for a fee that grows with distance.
// Pure helpers, tested.
import { SLOTS } from '../data/buildings.js';

// What each thing on the supermarket shelves costs (anything else is free).
export const PRICES = {
  flour: 1, tomato: 1, potato: 1, corn: 1, rice: 1, egg: 1, milk: 1, bread: 1,
  meat: 2, fish: 2, cheese: 2, chocolate: 2, jam: 2, fries: 2, popcorn: 2, cocoa: 2,
};

export const priceOf = key => PRICES[key] || 0;

// Coins for the van to carry a parcel from lot `from` to lot `to` (1 coin, plus 1 for every 350px of map).
export function deliveryFee(from, to, slots = SLOTS) {
  const a = slots[from], b = slots[to];
  if (!a || !b) return 1;
  return 1 + Math.floor(Math.hypot(a.x - b.x, a.y - b.y) / 350);
}
