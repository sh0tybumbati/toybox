// The cashier mini-game's rules (pure): a customer's basket, what they hand over, and whether your change is right.
// An order is { items: [itemKey], total, paid, change }.
import { PRICES } from './market.js';

export const CUSTOMERS = 5;
export const CHANGE_COINS = [1, 2, 5];       // the coins in the till

// A basket of two to four things off the supermarket shelves; they pay with the smallest note that covers it.
export function newOrder(rand = Math.random, prices = PRICES) {
  const keys = Object.keys(prices), n = 2 + Math.floor(rand() * 3);
  const items = Array.from({ length: n }, () => keys[Math.floor(rand() * keys.length)]);
  const total = items.reduce((sum, k) => sum + prices[k], 0);
  const paid = total < 5 ? 5 : 10;
  return { items, total, paid, change: paid - total };
}

// Is the change in the tray right? 'right' | 'short' | 'over'.
export const checkChange = (order, given) => (given === order.change ? 'right' : given < order.change ? 'short' : 'over');

// Coins for one customer: full marks first time, less for each slip.
export const coinsFor = mistakes => (mistakes === 0 ? 2 : mistakes === 1 ? 1 : 0);
