import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HAIR_STYLES, DEFAULT_LOOK, sanitizeLook, randomLook, cheekFor, SKIN_TONES, PANTS_COLORS,
} from '../src/data/look.js';
import { LAYOUTS } from '../src/data/body.js';
import { freshId, freshName, defaultParty } from '../src/data/characters.js';

// A stand-in for Phaser.GameObjects.Graphics: any method call returns itself.
const stubGraphics = () => { const calls = []; const g = new Proxy({}, { get: (_, name) => (...args) => { calls.push(name); return g; } }); return { g, calls }; };

test('every hair style draws without throwing', () => {
  for (const [key, style] of Object.entries(HAIR_STYLES)) {
    for (const age of Object.keys(LAYOUTS)) {
      const { g } = stubGraphics();
      assert.doesNotThrow(() => { style.back(g, 0x123456, LAYOUTS[age].head); style.front(g, 0x123456, LAYOUTS[age].head); }, `${key} (${age})`);
    }
    assert.ok(style.label, key);
  }
});

test('sanitizeLook repairs bad input and keeps good input', () => {
  assert.deepEqual(sanitizeLook(null), DEFAULT_LOOK);
  const bad = sanitizeLook({ age: 'elder', skin: -1, hair: { style: 'nope', color: 'x' }, shirt: 1.5, pants: 'blue', shoe: 0x1000000 });
  assert.deepEqual(bad, DEFAULT_LOOK);
  const good = { age: 'adult', skin: 0x8d5524, hair: { style: 'curly', color: 0xe667a8 }, shirt: 0x7bd88f, pants: 0x4a4e69, shoe: 0x222222 };
  assert.deepEqual(sanitizeLook(good), good);
});

test('randomLook only uses palette values and valid styles', () => {
  for (let i = 0; i < 50; i++) {
    const l = randomLook();
    assert.ok(SKIN_TONES.includes(l.skin));
    assert.ok(HAIR_STYLES[l.hair.style]);
    assert.ok(PANTS_COLORS.includes(l.pants) && ['kid', 'adult'].includes(l.age));
  }
  const first = randomLook(() => 0);
  assert.equal(first.skin, SKIN_TONES[0]);
});

test('cheekFor stays a valid colour', () => {
  for (const s of SKIN_TONES) { const c = cheekFor(s); assert.ok(Number.isInteger(c) && c >= 0 && c <= 0xffffff); }
});

test('fresh ids and names never collide', () => {
  let party = defaultParty();
  for (let i = 0; i < 3; i++) party.push({ id: freshId(party), name: freshName(party) });
  assert.equal(new Set(party.map(c => c.id)).size, 4);
  assert.equal(new Set(party.map(c => c.name)).size, 4);
});

test('old saves without an age or trousers become kids with default trousers', () => {
  const l = sanitizeLook({ skin: 0x8d5524, hair: { style: 'short', color: 0x2b1b12 }, shirt: 0x7bd88f, shoe: 0x222222 });
  assert.equal(l.age, 'kid');
  assert.equal(l.pants, DEFAULT_LOOK.pants);
  assert.equal(l.skin, 0x8d5524);
});
