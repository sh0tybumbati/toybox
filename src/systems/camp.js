// Toasting marshmallows, as pure rules: hold it over the fire and it browns; let go at the right moment.
export const TOAST_SECONDS = 4.2;                 // full white -> black when held the whole time
export const ROUNDS = 3;

// How toasted (0..1) after holding for `secs`.
export const toastLevel = secs => Math.min(1, secs / TOAST_SECONDS);

// raw (too early), light, perfect (golden), burnt.
export function grade(level) {
  if (level < 0.3) return 'raw';
  if (level < 0.52) return 'light';
  if (level <= 0.78) return 'perfect';
  return 'burnt';
}
export const COINS = { raw: 0, light: 1, perfect: 3, burnt: 0 };
export const SAY = { raw: 'Still cold!', light: 'Nice and warm.', perfect: 'PERFECT! Golden!', burnt: 'Oops — charcoal.' };

// The marshmallow's colour at a toast level: white -> cream -> golden -> brown -> black.
const STOPS = [[0, 0xfbf7ee], [0.3, 0xf4e6c4], [0.55, 0xe8b659], [0.78, 0xa8641f], [1, 0x2f2118]];
export function toastColor(level) {
  const l = Math.max(0, Math.min(1, level));
  for (let i = 1; i < STOPS.length; i++) {
    if (l <= STOPS[i][0]) {
      const [a, ca] = STOPS[i - 1], [b, cb] = STOPS[i], t = (l - a) / (b - a), mix = (x, y) => Math.round(x + (y - x) * t);
      return (mix((ca >> 16) & 255, (cb >> 16) & 255) << 16) | (mix((ca >> 8) & 255, (cb >> 8) & 255) << 8) | mix(ca & 255, cb & 255);
    }
  }
  return STOPS[STOPS.length - 1][1];
}

// What you take home: coins, and a hot cocoa for a clean sweep of perfect ones.
export function reward(grades) {
  const coins = grades.reduce((n, g) => n + COINS[g], 0);
  return { coins, items: grades.length >= ROUNDS && grades.every(g => g === 'perfect') ? ['cocoa'] : [] };
}
