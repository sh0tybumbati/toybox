// Hard-mode food economy: what things cost in cash, how long they keep, what you can carry and store (docs/hardcore-mode.md).
// Cash prices are NOT the kid-mode coin prices: a meal is a few dollars; a day's food is roughly a fiftieth of a day-labour wage.
export const HARD_PRICES = {
  flour: 5, tomato: 5, potato: 5, corn: 6, rice: 8, egg: 7, milk: 9, bread: 6,
  meat: 22, fish: 20, cheese: 14, chocolate: 11, jam: 9, fries: 12, popcorn: 7, cocoa: 6,
};
export const hardPriceOf = key => HARD_PRICES[key] ?? 0;

// Days a food keeps before it spoils (a fridge doubles it). Anything not listed keeps 4 days.
export const SHELF_LIFE = {
  flour: 90, rice: 90, chocolate: 60, jam: 30, popcorn: 60, cocoa: 90, potato: 14, corn: 6, bread: 4, cheese: 10, egg: 14, milk: 5,
  tomato: 5, meat: 3, fish: 2, fries: 2, apple: 10, banana: 4, carrot: 10, broccoli: 5, pizza: 2, burger: 1, taco: 1, pancakes: 2, sandwich: 2, sushi: 1,
};
export const shelfLifeOf = key => SHELF_LIFE[key] ?? 4;
export const FRIDGE_MULT = 2;

export const BAG_CAP = 4;                // pockets: what a person carries with no bag
// Bags you can buy at the supermarket (each person has their own). Carried product takes a slot per batch, like food.
export const PACKS = {
  pockets: { label: 'Pockets', slots: BAG_CAP, price: 0 },
  backpack: { label: 'Backpack', slots: 10, price: 1500 },
  bigpack: { label: 'Big hiking pack', slots: 16, price: 6000 },
};
export const PACK_IDS = Object.keys(PACKS);
export const PACK_MAX = Math.max(...PACK_IDS.map(k => PACKS[k].slots));
// Things a place always has in adult mode, even in a save from before they existed: building type -> furniture.
export const STAPLES = {
  market: [{ type: 'packrack', x: 720, y: 540 }],
  alley: [{ type: 'corner', x: 860, y: 520 }],
};
export const LARDER_CAP = 24;            // the household's fridge + pantry

export const SHOP_HOURS = [[7, 22]];     // shops open 07:00-22:00
export const STOCK_START = 6;            // of each item, in a shop, at the start and after a delivery
export const DELIVERY_DAY = 0;           // the van is due on Mondays (day % 7 === 0)
export const DELIVERY_HOUR = 7;          // at 07:00
