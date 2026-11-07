import test from 'node:test';
import assert from 'node:assert/strict';
import { rng, noise, bezier, blob, wobble, tube, inkStroke, inkFill, inkTube } from '../src/data/ink.js';

const stubGraphics = () => { const calls = []; const g = new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, args]); return g; } }); return { g, calls }; };

test('the random generator is seeded and repeatable', () => {
  const a = rng(5), b = rng(5), c = rng(6);
  const A = [a(), a(), a()], B = [b(), b(), b()];
  assert.deepEqual(A, B);
  assert.notDeepEqual(A, [c(), c(), c()]);
  assert.ok(A.every(v => v >= 0 && v < 1));
});

test('noise is smooth-ish, deterministic and bounded', () => {
  for (let i = 0; i < 100; i++) { const v = noise(i * 0.37, 3); assert.ok(Math.abs(v) <= 1.0001); assert.equal(v, noise(i * 0.37, 3)); }
  assert.notEqual(noise(1, 1), noise(1, 2));
});

test('bezier starts and ends on its end points', () => {
  const p = bezier({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 10 }, 8);
  assert.equal(p.length, 9);
  assert.deepEqual(p[0], { x: 0, y: 0 });
  assert.ok(Math.abs(p[8].x - 20) < 1e-9 && Math.abs(p[8].y - 10) < 1e-9);
});

test('a blob is a wobbly ellipse: close to the radii, never a perfect circle', () => {
  const pts = blob(100, 50, 40, 30, { n: 32, amp: 0.05, seed: 2 });
  assert.equal(pts.length, 32);
  for (const p of pts) {
    const r = Math.hypot((p.x - 100) / 40, (p.y - 50) / 30);
    assert.ok(r > 0.9 && r < 1.1, `radius ${r}`);
  }
  const radii = new Set(pts.map(p => Math.hypot((p.x - 100) / 40, (p.y - 50) / 30).toFixed(3)));
  assert.ok(radii.size > 10, 'the outline wanders');
  assert.deepEqual(blob(0, 0, 10, 10, { seed: 4 }), blob(0, 0, 10, 10, { seed: 4 }), 'repeatable');
});

test('wobble keeps points close to where they were', () => {
  const line = [...Array(10)].map((_, i) => ({ x: i * 10, y: 0 }));
  const w = wobble(line, 2, 1);
  w.forEach((p, i) => assert.ok(Math.hypot(p.x - line[i].x, p.y - line[i].y) <= 2 * 2));
  assert.ok(w.some((p, i) => p.y !== line[i].y), 'and not perfectly straight');
});

test('a tube is as wide as asked along its centre line', () => {
  const center = [...Array(6)].map((_, i) => ({ x: 0, y: i * 10 }));
  const t = tube(center, () => 20);
  t.left.forEach((p, i) => assert.ok(Math.abs(Math.abs(p.x - center[i].x) - 10) < 1e-9));
  assert.equal(t.outline.length, 12);
  const tapered = tube(center, k => 20 - 10 * k);
  assert.ok(Math.abs(tapered.left[5].x - tapered.right[5].x) < 11 && Math.abs(tapered.left[0].x - tapered.right[0].x) > 19);
});

test('inking draws fills and strokes with only Graphics calls', () => {
  const { g, calls } = stubGraphics();
  const pts = blob(0, 0, 20, 20, { n: 12 });
  inkFill(g, pts, 0xff0000, { seed: 3 });
  inkStroke(g, pts.slice(0, 5), { seed: 1 });
  inkTube(g, bezier({ x: 0, y: 0 }, { x: 5, y: 10 }, { x: -5, y: 20 }, { x: 0, y: 30 }, 8), k => 16 - 6 * k, 0x00ff00, { seed: 2 });
  const names = new Set(calls.map(c => c[0]));
  assert.ok(names.has('fillStyle') && names.has('fillPoints') && names.has('lineStyle') && names.has('strokePoints'));
  const widths = new Set(calls.filter(c => c[0] === 'lineStyle').map(c => c[1][0].toFixed(2)));
  assert.ok(widths.size > 1, 'line weight is uneven');
});

import { rectPoints, wobblyPoly, inkRect, inkLine, smoothPath, inkDashed } from '../src/data/ink.js';

test('a wobbly rectangle has more points than corners and wanders off true', () => {
  const pts = wobblyPoly(rectPoints(0, 0, 100, 60), { amp: 2, seed: 3 });
  assert.ok(pts.length > 8);
  const offTrue = pts.filter(p => (Math.abs(p.y) > 0.3 && Math.abs(p.y - 60) > 0.3) || (Math.abs(p.x) > 0.3 && Math.abs(p.x - 100) > 0.3));
  assert.ok(offTrue.length > 0, 'no perfectly straight edges');
  for (const p of pts) assert.ok(p.x > -4 && p.x < 104 && p.y > -4 && p.y < 64, 'but it is still roughly a rectangle');
  assert.deepEqual(pts, wobblyPoly(rectPoints(0, 0, 100, 60), { amp: 2, seed: 3 }), 'repeatable');
});

test('a smooth path passes through its points and stays inside their bounds roughly', () => {
  const pts = [{ x: 0, y: 0 }, { x: 50, y: 40 }, { x: 100, y: 0 }, { x: 150, y: 40 }];
  const s = smoothPath(pts, 8);
  assert.deepEqual(s[0], pts[0]);
  assert.deepEqual(s[s.length - 1], pts[3]);
  assert.ok(s.length > pts.length * 4);
  assert.ok(s.every(p => p.x >= -5 && p.x <= 155 && p.y >= -10 && p.y <= 50));
});

test('rects, lines and dashes draw with Graphics calls only', () => {
  const { g, calls } = stubGraphics();
  inkRect(g, 0, 0, 40, 20, 0xffffff, { seed: 2 });
  inkLine(g, { x: 0, y: 0 }, { x: 60, y: 5 }, { seed: 2 });
  inkDashed(g, wobblyPoly(rectPoints(0, 0, 80, 50)), { seed: 1 });
  assert.ok(calls.length > 10);
  assert.ok(calls.every(([n]) => ['fillStyle', 'fillPoints', 'lineStyle', 'strokePoints', 'fillCircle'].includes(n)), 'only plain Graphics methods');
});
