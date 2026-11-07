import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEM_ART, ITEM_SHIFT, ART_BOX, drawItem } from '../src/data/itemart.js';
import { InkPen } from '../src/data/inkpen.js';
import { CATALOG } from '../src/data/items.js';
import { RECIPES } from '../src/data/recipes.js';

const stubGraphics = () => { const calls = []; const g = new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, ...args]); return g; } }); return { g, calls }; };

test('every item in the catalogue has hand-drawn art, and nothing extra', () => {
  assert.deepEqual(Object.keys(CATALOG).filter(k => !ITEM_ART[k]), []);
  assert.deepEqual(Object.keys(ITEM_ART).filter(k => !CATALOG[k]), []);
});

test('every drawing paints something and stays inside its box', () => {
  for (const key of Object.keys(ITEM_ART)) {
    const { g, calls } = stubGraphics();
    assert.doesNotThrow(() => drawItem(new InkPen(g, 3, { weight: 5 }), key), key);
    const pts = calls.filter(c => c[0] === 'fillPoints' || c[0] === 'strokePoints').flatMap(c => c[1].map(p => ({ x: p.x, y: p.y + (ITEM_SHIFT[key] || 0) })));
    assert.ok(pts.length > 6, `${key} draws shapes`);
    for (const p of pts) assert.ok(p.x > -8 && p.x < ART_BOX + 8 && p.y > -8 && p.y < ART_BOX + 8, `${key}: ${JSON.stringify(p)} is in the box`);
  }
});

test('drawings stand on the ground: the lowest mark of an item is near the floor of its box', () => {
  for (const key of Object.keys(ITEM_ART)) {
    const { g, calls } = stubGraphics();
    drawItem(new InkPen(g, 3), key);
    const ys = calls.filter(c => c[0] === 'fillPoints' || c[0] === 'strokePoints').flatMap(c => c[1].map(p => p.y + (ITEM_SHIFT[key] || 0)));
    const bottom = Math.max(...ys);
    assert.ok(bottom > 96 && bottom < 126, `${key} bottom is ${bottom.toFixed(0)}`);
  }
});

test('recipes only use items that can be drawn (the book and oven show their pictures)', () => {
  for (const r of RECIPES) for (const k of [r.result, ...r.ingredients]) assert.ok(ITEM_ART[k], `${r.id}: ${k}`);
});

test('an unknown key draws a placeholder instead of throwing', () => {
  const { g } = stubGraphics();
  assert.doesNotThrow(() => drawItem(new InkPen(g, 1), 'no-such-item'));
});

import { SPRITE_ART, EMOJI_SPRITE } from '../src/data/spriteart.js';
import { PETS } from '../src/data/pets.js';
import { REACTIONS } from '../src/data/expressions.js';

test('sprites: every pet, the bin, the coin and the reaction faces have art, inside their box', () => {
  for (const kind of Object.keys(PETS)) assert.ok(SPRITE_ART[`pet-${kind}`], `pet ${kind}`);
  for (const k of ['bin', 'coin', 'heart', 'zzz', 'sparkle', 'fire', 'laugh', 'yum', 'sour', 'spicy', 'yuck', 'marker']) assert.ok(SPRITE_ART[k], k);
  for (const [key, art] of Object.entries(SPRITE_ART)) {
    const { g, calls } = stubGraphics();
    assert.doesNotThrow(() => art.draw(new InkPen(g, 3, { weight: art.weight })), key);
    const pts = calls.filter(c => c[0] === 'fillPoints' || c[0] === 'strokePoints').flatMap(c => c[1]);
    assert.ok(pts.length > 4, `${key} draws something`);
    for (const p of pts) assert.ok(p.x > -6 && p.x < art.box + 6 && p.y > -6 && p.y < art.box + 6, `${key}: ${JSON.stringify(p)} fits its ${art.box} box`);
  }
});

test('every emoji the game floats up has a hand-drawn replacement', () => {
  for (const [emoji, sprite] of Object.entries(EMOJI_SPRITE)) assert.ok(SPRITE_ART[sprite], `${emoji} -> ${sprite}`);
  for (const r of Object.values(REACTIONS)) { assert.ok(EMOJI_SPRITE[r.emoji], r.emoji); if (r.extra) assert.ok(EMOJI_SPRITE[r.extra], r.extra); }
});
