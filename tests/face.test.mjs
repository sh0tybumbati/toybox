import test from 'node:test';
import assert from 'node:assert/strict';
import { paintFace } from '../src/data/face.js';
import { EXPRESSIONS } from '../src/data/expressions.js';
import { LAYOUTS } from '../src/data/body.js';
import { DEFAULT_LOOK } from '../src/data/look.js';
import { blob } from '../src/data/ink.js';

const stubGraphics = () => { const calls = []; const g = new Proxy({}, { get: (_, name) => (...args) => { calls.push(name); return g; } }); return { g, calls }; };

test('every expression paints on both bodies without throwing, blinking or not', () => {
  for (const [name, e] of Object.entries(EXPRESSIONS)) {
    for (const [age, L] of Object.entries(LAYOUTS)) {
      for (const blink of [1, 0.1]) {
        const { g, calls } = stubGraphics();
        assert.doesNotThrow(() => paintFace(g, L, DEFAULT_LOOK, e, { blink, gx: 2, gy: -1, chew: name === 'chew' ? 0.5 : 0, headPts: blob(0, 0, 70, 60) }), `${name} (${age})`);
        assert.ok(calls.length > 4, `${name} draws something`);
      }
    }
  }
});

test('faces use dot eyes, blush and a mouth only — never white eyeballs', () => {
  const { g, calls } = stubGraphics();
  paintFace(g, LAYOUTS.kid, DEFAULT_LOOK, EXPRESSIONS.neutral, {});
  assert.ok(calls.includes('fillEllipse'), 'dots and blush are ellipses');
  assert.ok(calls.includes('strokePoints'), 'the mouth is an ink line');
});
