// Property in hard mode (docs/hardcore-mode.md): public places are fixed, you can only buy houses and the empty lots to build them on.
// Prices are cash. A building you own can be rebuilt and decorated; one you rent or visit can't.
export const LOT_PRICE = 120000;                                  // an empty lot
export const BUILD_PRICE = { blank: 60000, cottage: 180000, apartments: 700000 };       // what the builders charge, by blueprint
export const SELL_RATE = 0.6;                                     // what you get back when you sell a place

// Houses already standing in town and for sale at the start: lot, blueprint, name, asking price.
export const LISTINGS = [
  { slot: 16, key: 'cottage', name: 'Brick Cottage', price: 420000 },
  { slot: 13, key: 'cottage', name: 'Corner Cottage', price: 380000 },
  { slot: 14, key: 'flat', name: 'Starter Flat', price: 210000 },
  { slot: 17, key: 'apartments', name: 'River Apartments', price: 1400000 },
];
