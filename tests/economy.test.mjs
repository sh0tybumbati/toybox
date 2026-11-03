import test from 'node:test';
import assert from 'node:assert/strict';
import { PREMIUM, COIN_RULES, earnAmount, isPremium } from '../src/data/economy.js';
import { CATALOG } from '../src/data/items.js';
import { ROOMS, ROOM_ORDER } from '../src/data/rooms.js';

test('earning respects cooldowns', () => {
  assert.equal(earnAmount('eat', null, 0), 1);
  assert.equal(earnAmount('eat', 1000, 2000), 0);              // inside the 3s cooldown
  assert.equal(earnAmount('eat', 1000, 4000), 1);
  assert.equal(earnAmount('combo', 1000, 1001), 3);            // no cooldown
  assert.equal(earnAmount('discover', 1000, 1001), 5);         // first-time recipe bonus
  assert.equal(earnAmount('cook', 1000, 2000), 0);             // cooking can't be farmed
  assert.equal(earnAmount('bogus', null, 0), 0);
});

test('premium prices are positive whole numbers and every premium item exists', () => {
  for (const [key, price] of Object.entries(PREMIUM)) {
    assert.ok(Number.isInteger(price) && price > 0, key);
    assert.ok(CATALOG[key], key);
  }
  assert.ok(isPremium('dog') && !isPremium('apple') && !isPremium('toString'));
});

test('every premium item is on a shop shelf (and nothing else in the shop is)', () => {
  const shop = ROOMS.shop.shelves.flatMap(s => s.items);
  for (const key of Object.keys(PREMIUM)) assert.ok(shop.includes(key), key);
  for (const key of shop) assert.ok(isPremium(key), key);
});

test('a few coins reach the cheapest item quickly, and the first purchases are affordable', () => {
  const cheapest = Math.min(...Object.values(PREMIUM));
  const perMeal = COIN_RULES.eat.n;
  assert.ok(cheapest / perMeal <= 8, 'about eight meals buys the first toy');
});

test('every room has a map spot, a label and fits the room order', () => {
  assert.deepEqual([...ROOM_ORDER].sort(), Object.keys(ROOMS).sort());
  for (const [key, r] of Object.entries(ROOMS)) {
    assert.ok(r.label, key);
    assert.ok(r.map && Number.isFinite(r.map.x) && Number.isFinite(r.map.y) && r.map.emoji, key);
    assert.equal(typeof r.draw, 'function', key);
  }
});
