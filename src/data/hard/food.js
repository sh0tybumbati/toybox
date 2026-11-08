// Hard-mode food economy: what things cost in cash, how long they keep, what you can carry and store (docs/hardcore-mode.md).
// Cash prices are NOT the kid-mode coin prices: a meal is a few dollars, a day's food roughly a fifth of a day-labour wage.
export const HARD_PRICES = {
  flour: 50, tomato: 50, potato: 50, corn: 60, rice: 80, egg: 70, milk: 90, bread: 60,
  meat: 220, fish: 200, cheese: 140, chocolate: 110, jam: 90, fries: 120, popcorn: 70, cocoa: 60,
};
export const hardPriceOf = key => HARD_PRICES[key] ?? 0;

// Days a food keeps before it spoils (a fridge doubles it). Anything not listed keeps 4 days.
export const SHELF_LIFE = {
  flour: 90, rice: 90, chocolate: 60, jam: 30, popcorn: 60, cocoa: 90, potato: 14, corn: 6, bread: 4, cheese: 10, egg: 14, milk: 5,
  tomato: 5, meat: 3, fish: 2, fries: 2, apple: 10, banana: 4, carrot: 10, broccoli: 5, pizza: 2, burger: 1, taco: 1, pancakes: 2, sandwich: 2, sushi: 1,
};
export const shelfLifeOf = key => SHELF_LIFE[key] ?? 4;
export const FRIDGE_MULT = 2;

export const BAG_CAP = 8;                // what a person carries
export const LARDER_CAP = 24;            // the household's fridge + pantry

export const SHOP_HOURS = [[7, 22]];     // shops open 07:00-22:00
export const STOCK_START = 6;            // of each item, in a shop, at the start and after a delivery
export const DELIVERY_DAY = 0;           // the van is due on Mondays (day % 7 === 0)
export const DELIVERY_HOUR = 7;          // at 07:00
