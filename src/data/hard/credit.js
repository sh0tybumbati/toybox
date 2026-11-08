// Credit, cards, mortgages and the bank's loans (docs/hardcore-mode.md). Amounts are cash. Statements come every 28 days (a "month").
export const SCORE = { min: 300, max: 850 };
export const CREDIT_TIERS = [                       // best first
  { id: 'excellent', label: 'Excellent', from: 740, rate: 0.0035, down: 0.10 },
  { id: 'good',      label: 'Good',      from: 670, rate: 0.0055, down: 0.15 },
  { id: 'fair',      label: 'Fair',      from: 580, rate: 0.009,  down: 0.20 },
  { id: 'poor',      label: 'Poor',      from: 0,   rate: 0.015,  down: 0.30 },
];                                                  // rate = interest per month on loans and old debt; down = share of a house paid up front
export const CYCLE = 28;
export const MORTGAGE_MIN_SCORE = 500;               // below this the bank will not lend on a house
export const MORTGAGE_TERM = 12;                     // monthly payments
export const FORECLOSE_AFTER = 3;                    // late mortgage payments before the bank takes the house
export const MAX_MORTGAGES = 2;
export const SALE_RATE = 0.8;                        // what the bank gets for a house it takes: of what it was worth

export const CARDS = {                              // rate = interest per month on what you have not paid off
  starter:  { label: 'Starter card',  min: 500, limit: 3000,   rate: 0.025 },
  silver:   { label: 'Silver card',   min: 600, limit: 12000,  rate: 0.020 },
  gold:     { label: 'Gold card',     min: 680, limit: 40000,  rate: 0.015 },
  platinum: { label: 'Platinum card', min: 740, limit: 150000, rate: 0.011 },
};
export const CARD_IDS = Object.keys(CARDS);
export const MAX_CARDS = 3;
export const MIN_PAYMENT = { share: 0.05, floor: 200 };      // a card's minimum: 5% of the balance, at least this much
export const DEBT_PAYMENT = { share: 0.03, floor: 500 };     // the same for old debt

// What moves your score (points).
export const SCORE_EVENTS = {
  start: 620, onTime: 2, late: -25, lateMortgage: -40, evicted: -60, foreclosed: -100, arrested: -40,
  lowUse: 5, highUse: -12, owingDebt: -6, cardOpened: -5,
};
export const START_SCORE = { bench: 560, flat: 640, house: 600, jail: 520 };       // by scenario
