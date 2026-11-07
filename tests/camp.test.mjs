import test from 'node:test';
import assert from 'node:assert/strict';
import { toastLevel, grade, COINS, toastColor, reward, TOAST_SECONDS, ROUNDS } from '../src/systems/camp.js';

test('toasting takes time: level rises to 1 and stops', () => {
  assert.equal(toastLevel(0), 0);
  assert.ok(toastLevel(TOAST_SECONDS / 2) > 0.45 && toastLevel(TOAST_SECONDS / 2) < 0.55);
  assert.equal(toastLevel(99), 1);
});

test('too early is raw, a little more is light, golden is perfect, too long is burnt', () => {
  assert.equal(grade(0.1), 'raw'); assert.equal(grade(0.4), 'light'); assert.equal(grade(0.65), 'perfect'); assert.equal(grade(0.95), 'burnt');
  assert.ok(COINS.perfect > COINS.light && COINS.light > COINS.raw && COINS.burnt === 0);
});

test('the colour goes white to black, passing golden in the perfect zone', () => {
  assert.equal(toastColor(0), 0xfbf7ee); assert.equal(toastColor(1), 0x2f2118);
  const gold = toastColor(0.55);
  assert.ok(((gold >> 16) & 255) > 200 && (gold & 255) < 120, 'golden is warm');
  assert.ok(toastColor(0.9) !== toastColor(0.5));
});

test('a clean sweep of perfect marshmallows earns a cocoa; otherwise just coins', () => {
  assert.deepEqual(reward(['perfect', 'perfect', 'perfect']), { coins: 9, items: ['cocoa'] });
  assert.deepEqual(reward(['perfect', 'burnt', 'light']), { coins: 4, items: [] });
  assert.ok(ROUNDS >= 3);
});
