import test from 'node:test';
import assert from 'node:assert/strict';
import { InkPen, roundedRectPoints, penFor } from '../src/data/inkpen.js';
import { PROP_TYPES } from '../src/data/props.js';
import { ROOMS } from '../src/data/rooms.js';

const stubGraphics = () => { const calls = []; const g = new Proxy({}, { get: (_, name) => (...args) => { calls.push(name); return g; } }); return { g, calls }; };

test('rounded rectangles stay inside their box and have more points than a plain one', () => {
  const pts = roundedRectPoints(10, 20, 100, 40, 12);
  assert.ok(pts.length > 12);
  for (const p of pts) assert.ok(p.x >= 10 - 1e-9 && p.x <= 110 + 1e-9 && p.y >= 20 - 1e-9 && p.y <= 60 + 1e-9);
  assert.equal(roundedRectPoints(0, 0, 10, 10, 0).length, 4);
  assert.ok(roundedRectPoints(0, 0, 10, 4, 99).length > 4, 'an over-large radius is clamped, not an error');
});

test('every filled shape is inked: a fill and an outline, never a bare fillRect', () => {
  const { g, calls } = stubGraphics();
  const pen = new InkPen(g, 3);
  pen.fillStyle(0xff0000, 1).fillRect(0, 0, 30, 20).fillRoundedRect(0, 0, 30, 20, 6).fillCircle(5, 5, 8).fillEllipse(5, 5, 20, 10).fillTriangle(0, 0, 5, 0, 0, 5).fillPoints([{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 5 }]);
  assert.ok(!calls.includes('fillRect') && !calls.includes('fillRoundedRect') && !calls.includes('fillCircle'), 'only polygon fills reach the Graphics');
  assert.ok(calls.filter(c => c === 'strokePoints').length >= 6, 'each shape gets ink');
});

test('translucent shapes (glows, shadows) are plain, and re-outlining strokes are ignored', () => {
  const { g, calls } = stubGraphics();
  const pen = new InkPen(g, 3);
  pen.fillStyle(0xffffff, 0.3).fillCircle(0, 0, 20);
  assert.ok(!calls.includes('strokePoints'), 'no outline on a glow');
  const before = calls.length;
  pen.strokeRoundedRect(0, 0, 5, 5, 2).strokeRect(0, 0, 5, 5).strokeCircle(0, 0, 5);
  assert.equal(calls.length, before);
});

test('drawing is repeatable (same seed, same marks)', () => {
  const run = () => { const out = []; const g = new Proxy({}, { get: (_, n) => (...a) => { out.push([n, JSON.stringify(a)]); return g; } }); new InkPen(g, 9).fillStyle(0x112233, 1).fillRoundedRect(0, 0, 50, 30, 8).lineBetween(0, 0, 40, 4); return JSON.stringify(out); };
  assert.equal(run(), run());
});

test('every piece of furniture and every room paints through the pen without throwing', () => {
  for (const [id, def] of Object.entries(PROP_TYPES)) for (const state of [false, true]) {
    const { g } = stubGraphics();
    assert.doesNotThrow(() => def.draw(penFor(g, id), state), `${id} (${state})`);
  }
  for (const [id, r] of Object.entries(ROOMS)) if (r.decor) {
    const { g } = stubGraphics();
    assert.doesNotThrow(() => r.decor(penFor(g, id)), id);
  }
});
