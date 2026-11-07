import test from 'node:test';
import assert from 'node:assert/strict';
import { THINGS, nextThing, spawnGap, fallSpeed, catchEffect, caught, coinsFor, GAME_SECONDS, LIVES } from '../src/systems/arcade.js';

test('stars are common, golden stars rare, and socks creep in as the game goes on', () => {
  let seed = 3; const rand = () => { seed = (seed * 16807 + 5) % 2147483647; return seed / 2147483647; };
  const count = t => { const c = { star: 0, gold: 0, sock: 0 }; for (let i = 0; i < 3000; i++) c[nextThing(t, rand)]++; return c; };
  const early = count(0), late = count(40);
  assert.ok(early.star > early.sock && early.sock > early.gold && early.gold > 0, JSON.stringify(early));
  assert.ok(late.sock > early.sock, 'more socks later');
});

test('things fall faster and more often later, within sane limits', () => {
  assert.ok(spawnGap(40) < spawnGap(0));
  assert.ok(spawnGap(1000) >= 0.35);
  assert.ok(fallSpeed('star', 60, () => 0.5) > fallSpeed('star', 0, () => 0.5));
  assert.ok(fallSpeed('gold', 0, () => 0.5) > fallSpeed('star', 0, () => 0.5), 'gold zips by');
});

test('stars score, golden stars score more, socks cost a life', () => {
  assert.deepEqual(catchEffect('star'), { score: 1, lives: 0 });
  assert.deepEqual(catchEffect('gold'), { score: 3, lives: 0 });
  assert.deepEqual(catchEffect('sock'), { score: 0, lives: -1 });
});

test('a thing is caught when it reaches the basket rim over the basket, not beside it', () => {
  assert.ok(caught(300, 400, 310, 400));
  assert.ok(!caught(500, 400, 310, 400), 'too far left/right');
  assert.ok(!caught(300, 300, 310, 400), 'still falling');
  assert.ok(!caught(300, 480, 310, 400), 'fell past');
});

test('coins come from the score, and a round has a sensible length', () => {
  assert.equal(coinsFor(2), 0); assert.equal(coinsFor(3), 1); assert.equal(coinsFor(31), 10);
  assert.ok(GAME_SECONDS >= 30 && LIVES >= 2 && THINGS.sock.lives === -1);
});
