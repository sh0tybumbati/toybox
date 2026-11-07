// Hard-mode tuning for needs and the things people do to meet them (docs/hardcore-mode.md). All values are per
// GAME hour unless a name says otherwise; 1 real minute = 1 game hour. "Tight like The Sims": a person who does
// nothing is starving in about 20 hours, exhausted in about 25, and miserable well before that.
export const NEEDS = ['hunger', 'energy', 'hygiene', 'mood'];     // 0 (bad) .. 100 (good)
export const START_NEEDS = { hunger: 70, energy: 80, hygiene: 80, mood: 70 };

export const DECAY = { hunger: -5, energy: -4, hygiene: -2.8, mood: -2 };           // awake
export const SLEEP_DECAY = { hunger: -2, energy: 14, hygiene: -1, mood: 0 };         // in a bed
export const FLOOR_SLEEP = { hunger: -2.5, energy: 6, hygiene: -3, mood: -3 };        // asleep on the ground (slept rough)
export const LOW = 25;                                                              // below this a need hurts the mood
export const LOW_MOOD_COST = 3;                                                     // mood lost per hour for each need below LOW

// What a person decides to do on their own (free will), when idle: below `at`, with `weight` to rank urgency.
export const WANTS = {
  eat:   { need: 'hunger',  at: 40, weight: 1.0 },
  sleep: { need: 'energy',  at: 30, weight: 1.2 },
  wash:  { need: 'hygiene', at: 30, weight: 0.8 },
  sit:   { need: 'mood',    at: 35, weight: 0.6 },
};

// The actions you can queue. `minutes` = game minutes it takes (sleep runs until rested); `perMin` = need change per game minute.
export const ACTIONS = {
  eat:   { label: 'Eat',   icon: '🍎', minutes: 12 },
  sleep: { label: 'Sleep', icon: '💤', minutes: 600, until: { energy: 95 } },
  wash:  { label: 'Wash',  icon: '🚿', minutes: 25, perMin: { hygiene: 3.6 } },
  sit:   { label: 'Relax', icon: '🛋️', minutes: 30, perMin: { mood: 0.5, energy: 0.1 } },
};
export const ACTION_IDS = Object.keys(ACTIONS);
export const MAX_QUEUE = 5;

// Hunger gained from a food (by item key); anything not listed is a snack of 25.
export const NUTRITION = {
  apple: 15, banana: 18, berry: 10, grapes: 14, lemon: 6, carrot: 14, broccoli: 16, melon: 20, tomato: 10, pepper: 8,
  cookie: 12, donut: 14, cupcake: 14, icecream: 12, chocolate: 12, popcorn: 14, cocoa: 10, jam: 10, milk: 16, cheese: 22, egg: 20,
  bread: 28, potato: 24, corn: 22, rice: 30, fish: 32, meat: 36, taco: 34, burger: 38, pizza: 40, fries: 30, pancakes: 34, sandwich: 32, sushi: 30,
};
export const nutritionOf = key => NUTRITION[key] ?? 25;
