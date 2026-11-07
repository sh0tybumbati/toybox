import test from 'node:test';
import assert from 'node:assert/strict';
import { KINDS, nextKind, spawnGap, riseSpeed, multiplier, popScore, nextCombo, COMBO_WINDOW, coinsFor as bubbleCoins } from '../src/systems/bubbles.js';
import { deal, flip, settle, done, coinsFor as memCoins, PAIR_KEYS } from '../src/systems/memory.js';
import { newHero, jump, stepHero, onGround, hits, speedAt, nextGap, jumpPeak, jumpTime, HERO, scoreFor, coinsFor as hopCoins } from '../src/systems/hopper.js';
import { ITEM_ART } from '../src/data/itemart.js';

test('bubbles: small ones are worth more than big ones, gold the most, and combos multiply (up to 4x)', () => {
  assert.ok(KINDS.small.score > KINDS.big.score && KINDS.gold.score > KINDS.small.score);
  assert.equal(multiplier(0), 1); assert.equal(multiplier(3), 2); assert.equal(multiplier(9), 4); assert.equal(multiplier(99), 4);
  assert.equal(popScore('gold', 9), 40);
  let state = { combo: 0, last: null };
  state = nextCombo(state, 1.0); assert.equal(state.combo, 1);
  state = nextCombo(state, 1.0 + COMBO_WINDOW - 0.05); assert.equal(state.combo, 2, 'quick enough: the combo grows');
  state = nextCombo(state, 10); assert.equal(state.combo, 1, 'too slow: it starts over');
});

test('bubbles: they come faster and rise quicker as the game goes on', () => {
  assert.ok(spawnGap(25) < spawnGap(0) && spawnGap(1000) >= 0.25);
  assert.ok(riseSpeed('small', 30, () => 0.5) > riseSpeed('small', 0, () => 0.5));
  let seed = 4; const rand = () => { seed = (seed * 16807 + 3) % 2147483647; return seed / 2147483647; };
  const c = { small: 0, big: 0, gold: 0 }; for (let i = 0; i < 2000; i++) c[nextKind(rand)]++;
  assert.ok(c.small > c.gold && c.big > c.gold && c.gold > 0);
  assert.equal(bubbleCoins(11), 0); assert.equal(bubbleCoins(36), 3);
});

test('memory: every card has a twin, matches stay, misses flip back, and fewer moves earn more', () => {
  const g = deal(() => 0.37);
  assert.equal(g.cards.length, PAIR_KEYS.length * 2);
  for (const k of PAIR_KEYS) assert.equal(g.cards.filter(c => c === k).length, 2);
  const i = 0, j = g.cards.findIndex((c, n) => n !== 0 && c === g.cards[0]), k = g.cards.findIndex(c => c !== g.cards[0]);
  assert.equal(flip(g, i), 'up'); assert.equal(flip(g, i), 'ignored', 'same card twice');
  assert.equal(flip(g, j), 'match'); assert.equal(g.matched[i], true); assert.equal(g.moves, 1);
  assert.equal(flip(g, i), 'ignored', 'matched cards are done');
  assert.equal(flip(g, k), 'up');
  const other = g.cards.findIndex((c, n) => !g.matched[n] && n !== k && c !== g.cards[k]);
  assert.equal(flip(g, other), 'miss'); assert.equal(flip(g, 5), 'ignored', 'two are up: wait');
  settle(g); assert.deepEqual(g.faceUp, []);
  assert.ok(memCoins(6) > memCoins(10) && memCoins(10) > memCoins(20));
  const all = deal(); all.matched.fill(true); assert.ok(done(all));
});

test('hopper: you can jump from the ground, not in the air; a jump clears a rock but not a tall one', () => {
  const h = newHero();
  assert.ok(onGround(h)); assert.equal(jump(h), true);
  stepHero(h, 0.05); assert.equal(jump(h), false, 'no double jumps');
  let peak = 0, t = 0; while (!onGround(h) || t < 0.1) { stepHero(h, 1 / 120); peak = Math.max(peak, h.y); t += 1 / 120; if (t > 3) break; }
  assert.ok(Math.abs(peak - jumpPeak()) < 12, `peak ${peak.toFixed(0)} vs ${jumpPeak().toFixed(0)}`);
  assert.ok(jumpTime() > 0.5 && jumpTime() < 1.1);
  const rock = { x: HERO.x, w: 50, h: 40 }, wall = { x: HERO.x, w: 50, h: jumpPeak() + 40 };
  assert.ok(hits({ y: 0 }, rock), 'standing in a rock is a hit');
  assert.ok(!hits({ y: 120 }, rock), 'jumping over it is not');
  assert.ok(hits({ y: jumpPeak() - 5 }, wall), 'a wall taller than a jump hits');
  assert.ok(!hits({ y: 0 }, { x: HERO.x + 200, w: 50, h: 40 }), 'a rock far ahead is fine');
});

test('hopper: the world speeds up, gaps shrink in time but stay jumpable, and the score rewards time and coins', () => {
  assert.ok(speedAt(30) > speedAt(0) && speedAt(1000) <= 640);
  for (const t of [0, 20, 60]) assert.ok(nextGap(speedAt(t), () => 0) * speedAt(t) > 150, `gap at t=${t} leaves room to land`);
  assert.ok(scoreFor(20, 3) > scoreFor(20, 0));
  assert.equal(hopCoins(19), 0); assert.equal(hopCoins(60), 3);
});

test('memory cards can be drawn: every pair key has item art', () => {
  for (const k of PAIR_KEYS) assert.ok(ITEM_ART[k], k);
});
