// The crate-stacking mini-game's rules (pure): a crate slides side to side above the stack; drop it, and only the part that
// lands on the crate below stays. Miss completely and the pile falls. Score = crates stacked.
export const WIDTH = 300;                  // the playfield
export const START_W = 120, MIN_W = 14, PERFECT = 5;
export const FIRST_Y = 0;

export const newGame = (rand = Math.random) => ({ stack: [{ x: (WIDTH - START_W) / 2, w: START_W }], w: START_W, x: 0, dir: 1, speed: 120, score: 0, over: false, perfect: 0, rand });

// Move the swinging crate by `dt` seconds, bouncing off the edges.
export function step(g, dt) {
  if (g.over) return g;
  g.x += g.dir * g.speed * dt;
  if (g.x + g.w >= WIDTH) { g.x = WIDTH - g.w; g.dir = -1; }
  if (g.x <= 0) { g.x = 0; g.dir = 1; }
  return g;
}

// Drop it. Returns 'perfect' | 'ok' | 'miss'. A near-perfect drop keeps the full width.
export function drop(g) {
  if (g.over) return 'miss';
  const top = g.stack[g.stack.length - 1], left = Math.max(g.x, top.x), right = Math.min(g.x + g.w, top.x + top.w), overlap = right - left;
  if (overlap <= 0 || overlap < MIN_W) { g.over = true; return 'miss'; }
  const perfect = Math.abs(g.x - top.x) <= PERFECT;
  const placed = perfect ? { x: top.x, w: top.w } : { x: left, w: overlap };
  g.stack.push(placed); g.w = placed.w; g.score++; g.perfect += perfect ? 1 : 0;
  g.speed = Math.min(300, g.speed + 9);
  g.x = g.dir > 0 ? 0 : WIDTH - g.w;                                    // the next one swings in from the side it was heading to
  return perfect ? 'perfect' : 'ok';
}

// Points of work for the pay: stacking well matters most, neatness a little.
export const performance = g => Math.min(10, g.score + Math.min(3, g.perfect));
