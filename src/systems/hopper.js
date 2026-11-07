// Hopper's rules (pure): a runner that jumps over things. `hero.y` is the height above the ground.
export const GRAVITY = 2600;
export const JUMP_V = 960;
export const HERO = { x: 170, w: 36, h: 70 };       // the hero's box (standing)

export const newHero = () => ({ y: 0, vy: 0 });
export const onGround = h => h.y <= 0 && h.vy <= 0;
export function jump(h) { if (onGround(h)) { h.vy = JUMP_V; return true; } return false; }
export function stepHero(h, dt) {
  h.vy -= GRAVITY * dt;
  h.y += h.vy * dt;
  if (h.y <= 0) { h.y = 0; if (h.vy < 0) h.vy = 0; }
  return h;
}

// Obstacles are { x, w, h } standing on the ground; the hero collides if the boxes overlap (a little forgiving).
export function hits(hero, ob, slack = 8) {
  const hx0 = HERO.x - HERO.w / 2 + slack, hx1 = HERO.x + HERO.w / 2 - slack;
  return hx1 > ob.x - ob.w / 2 + slack && hx0 < ob.x + ob.w / 2 - slack && hero.y < ob.h - slack;
}

export const speedAt = t => Math.min(640, 320 + t * 9);                    // px/s the world scrolls
export const nextGap = (speed, rand = Math.random) => (0.9 + rand() * 0.9) * (320 / speed) + 0.45;   // seconds between obstacles
export const scoreFor = (seconds, coins) => Math.floor(seconds * 3) + coins * 5;
export const coinsFor = score => Math.floor(score / 20);

// How high a jump goes, and how long it lasts (for tests and for placing obstacles sensibly).
export const jumpPeak = () => (JUMP_V * JUMP_V) / (2 * GRAVITY);
export const jumpTime = () => (2 * JUMP_V) / GRAVITY;
