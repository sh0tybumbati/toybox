// The furniture store: flat-pack furniture is bought for coins, put together by following the numbers, and sent home by van.
// A flat-pack parcel's key is `furn:<propType>` (see systems/mail.js). An assembly is { type, n, layout, next, mistakes }.
export const FLATPACK = {
  floorlamp: { price: 3, parts: 3 },
  desk:      { price: 5, parts: 4 },
  dresser:   { price: 6, parts: 4 },
  sofa:      { price: 8, parts: 5 },
};

export const furnKey = type => `furn:${type}`;
// The furniture type a parcel key stands for, or null if it isn't a flat-pack.
export const furnType = key => (typeof key === 'string' && key.startsWith('furn:') && FLATPACK[key.slice(5)] ? key.slice(5) : null);

// A fresh box: the numbered parts lie in a jumble (`layout[slot]` = the number on the part in that spot).
export function newAssembly(type, rand = Math.random) {
  const n = FLATPACK[type].parts, layout = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [layout[i], layout[j]] = [layout[j], layout[i]]; }
  return { type, n, layout, next: 1, mistakes: 0 };
}

// Tap the part marked `label`. 'ok' | 'wrong' | 'done' (that was the last part); wrong ones count as mistakes.
export function place(a, label) {
  if (a.next > a.n) return 'wrong';
  if (label !== a.next) { a.mistakes++; return 'wrong'; }
  a.next++;
  return a.next > a.n ? 'done' : 'ok';
}

// A bonus for neat building.
export const coinsFor = mistakes => (mistakes === 0 ? 2 : mistakes <= 2 ? 1 : 0);
