import test from 'node:test';
import assert from 'node:assert/strict';
import { TIPS, ALL_TIP_IDS, markDone, currentTip } from '../src/data/tips.js';
import { sanitize } from '../src/systems/save.js';
import { ROOMS } from '../src/data/rooms.js';

test('tips are well-formed: unique ids, text, a real room if limited to one', () => {
  assert.equal(new Set(ALL_TIP_IDS).size, TIPS.length);
  for (const t of TIPS) {
    assert.ok(t.text && t.done, t.id);
    if (t.room) assert.ok(ROOMS[t.room], `${t.id}: ${t.room}`);
  }
});

test('the first unseen tip is shown, and doing the thing completes it', () => {
  const seen = new Set();
  assert.equal(currentTip(seen, 'bedroom').id, 'grab');
  assert.deepEqual(markDone(seen, 'grab'), ['grab']);
  assert.equal(currentTip(seen, 'bedroom').id, 'dress');
});

test('an event completes its tip even out of order, and only once', () => {
  const seen = new Set();
  assert.deepEqual(markDone(seen, 'map'), ['map']);
  assert.deepEqual(markDone(seen, 'map'), []);
  assert.deepEqual(markDone(seen, 'nonsense'), []);
  assert.equal(currentTip(seen, 'bedroom').id, 'grab');          // order of the rest is unchanged
});

test('room-specific tips only show in their room', () => {
  const seen = new Set(['grab', 'dress', 'walk', 'map']);
  assert.equal(currentTip(seen, 'bedroom').id, 'book');           // kitchen tips are skipped elsewhere
  assert.equal(currentTip(seen, 'kitchen').id, 'eat');
});

test('everything seen means no tip', () => {
  assert.equal(currentTip(new Set(ALL_TIP_IDS), 'kitchen'), null);
});

test('saves: existing players have seen every tip; unknown ids are dropped', () => {
  const old = sanitize({ v: 7, room: 'bedroom', characters: [], floors: {} });
  assert.deepEqual(old.tips.sort(), [...ALL_TIP_IDS].sort());
  const fresh = sanitize({ v: 8, room: 'bedroom', tips: ['grab', 'grab', 'bogus'], characters: [], floors: {} });
  assert.deepEqual(fresh.tips, ['grab']);
  assert.deepEqual(sanitize({ v: 8, room: 'bedroom', characters: [], floors: {} }).tips, []);
});

test('the shop tips only show in the supermarket and the furniture store, after the basics', () => {
  const seen = new Set(['grab', 'dress', 'walk', 'map', 'eat', 'cook', 'book', 'furniture', 'shop', 'build', 'play', 'decorate', 'box']);
  assert.equal(currentTip(seen, 'bedroom'), null);
  assert.equal(currentTip(seen, 'market').id, 'groceries');
  assert.equal(currentTip(seen, 'ikea').id, 'ikea');
  markDone(seen, 'groceries'); markDone(seen, 'deliver');
  assert.equal(currentTip(seen, 'market').id, 'cashier');
  assert.deepEqual(markDone(seen, 'cashier'), ['cashier']);
  assert.equal(currentTip(seen, 'market'), null);
});
