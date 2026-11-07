// Star Catcher's rules (pure; the scene draws): what falls, how fast, what each catch is worth.
export const GAME_SECONDS = 45;
export const LIVES = 3;

export const THINGS = {
  star: { score: 1, weight: 70, speed: [150, 230] },
  gold: { score: 3, weight: 10, speed: [230, 300] },
  sock: { score: 0, lives: -1, weight: 20, speed: [170, 260] },
};

// Pick what to drop next; socks get commoner as the game goes on (t = seconds in).
export function nextThing(t, rand = Math.random) {
  const weights = Object.entries(THINGS).map(([k, v]) => [k, v.weight * (k === 'sock' ? 1 + t / 40 : 1)]);
  let r = rand() * weights.reduce((n, [, w]) => n + w, 0);
  for (const [k, w] of weights) { r -= w; if (r < 0) return k; }
  return 'star';
}

// Seconds until the next drop: a steady trickle that speeds up.
export const spawnGap = t => Math.max(0.35, 0.95 - t * 0.012);

// Fall speed for a thing (random within its range, a bit faster later).
export const fallSpeed = (kind, t, rand = Math.random) => {
  const [a, b] = THINGS[kind].speed;
  return (a + rand() * (b - a)) * (1 + Math.min(0.5, t / 90));
};

// The result of catching `kind`: { score, lives } deltas.
export const catchEffect = kind => ({ score: THINGS[kind].score, lives: THINGS[kind].lives || 0 });

// Does a thing at (x, y) fall into a basket centred at bx whose rim is at rimY?
export const caught = (x, y, bx, rimY, halfW = 54) => Math.abs(x - bx) <= halfW && y >= rimY - 14 && y <= rimY + 26;

// Coins for a score.
export const coinsFor = score => Math.floor(score / 3);
