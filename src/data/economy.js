// Coins are cosmetic currency: earned by playing, spent on premium items in the
// shop. Nothing here can fail or run out — it just unlocks more toys.

// Premium items and what they cost. Each is unlocked once, then free to use anywhere.
export const PREMIUM = {
  dog: 6, cat: 6, panda: 8, frog: 6,
  unicorn: 12, dino: 10, fox: 8, rabbit: 8,
  elephant: 10, crystal: 12, helmet: 10, heels: 10,
};

// How coins are earned. `cooldown` (ms) stops a shelf of endless food from
// becoming a coin fountain.
export const COIN_RULES = {
  eat:    { n: 1, cooldown: 3000 },
  cook:   { n: 2, cooldown: 4000 },
  discover: { n: 5, cooldown: 0 },   // first time you cook a recipe
  combo:  { n: 3, cooldown: 0 },
  hug:    { n: 1, cooldown: 6000 },
  mail:   { n: 1, cooldown: 3000 },     // posting something at a mailbox
  pickup: { n: 1, cooldown: 0 },     // coins lying around in the park
};

export const isPremium = key => Object.prototype.hasOwnProperty.call(PREMIUM, key);

// Coins awarded for `rule` given when it last paid out (null = never) and now.
export function earnAmount(rule, lastEarned, now) {
  const r = COIN_RULES[rule];
  if (!r) return 0;
  return lastEarned == null || now - lastEarned >= r.cooldown ? r.n : 0;
}
