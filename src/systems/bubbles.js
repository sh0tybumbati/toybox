// Bubble Pop's rules (pure; the scene draws): what rises, how fast, and what a pop is worth — with a combo multiplier
// for popping quickly one after another.
export const SECONDS = 30;
export const COMBO_WINDOW = 0.9;                  // pop again within this many seconds to keep the combo going

export const KINDS = {
  small: { r: 28, score: 3, speed: [95, 150], weight: 50 },     // quick and fiddly
  big:   { r: 46, score: 1, speed: [55, 90],  weight: 36 },     // slow and easy
  gold:  { r: 32, score: 10, speed: [150, 210], weight: 7 },    // rare and fast
};

export function nextKind(rand = Math.random) {
  let r = rand() * Object.values(KINDS).reduce((n, k) => n + k.weight, 0);
  for (const [name, k] of Object.entries(KINDS)) { r -= k.weight; if (r < 0) return name; }
  return 'small';
}
export const spawnGap = t => Math.max(0.25, 0.7 - t * 0.012);
export const riseSpeed = (kind, t, rand = Math.random) => { const [a, b] = KINDS[kind].speed; return (a + rand() * (b - a)) * (1 + Math.min(0.4, t / 80)); };

export const multiplier = combo => Math.min(4, 1 + Math.floor(combo / 3));
export const popScore = (kind, combo) => KINDS[kind].score * multiplier(combo);

// The combo after a pop at time `now` (state = { combo, last }): continues if quick enough, restarts otherwise.
export function nextCombo(state, now) {
  const combo = state.last !== null && now - state.last <= COMBO_WINDOW ? state.combo + 1 : 1;
  return { combo, last: now };
}
export const coinsFor = score => Math.floor(score / 12);
