import test from 'node:test';
import assert from 'node:assert/strict';
import { PATTERN_IDS, insidePoly, spanAt, patternMarks, paintPattern } from '../src/data/patterns.js';
import { blob } from '../src/data/ink.js';

const torso = blob(0, 28, 47, 43, { n: 26, amp: 0.055, seed: 3 });
const stub = () => { const calls = []; const g = new Proxy({}, { get: (_, n) => (...a) => { calls.push(n); return g; } }); return { g, calls }; };

test('inside-polygon and span maths agree on a square', () => {
  const sq = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  assert.ok(insidePoly(sq, 5, 5)); assert.ok(!insidePoly(sq, 15, 5)); assert.ok(!insidePoly(sq, 5, -1));
  assert.deepEqual(spanAt(sq, 5), { l: 0, r: 10 });
  assert.equal(spanAt(sq, 20), null);
});

test('every pattern puts marks on the body, and every mark is inside it', () => {
  for (const id of PATTERN_IDS) {
    const marks = patternMarks(id, torso);
    assert.ok(marks.length >= 4, `${id} has marks (${marks.length})`);
    for (const m of marks) {
      const pts = m.pts || [{ x: m.x, y: m.y }];
      for (const p of pts) assert.ok(insidePoly(torso, p.x, p.y) || m.t === 'band', `${id}: ${m.t} at ${p.x.toFixed(0)},${p.y.toFixed(0)}`);
    }
  }
});

test('stripe bands span the body width at their height; unknown patterns draw nothing', () => {
  for (const m of patternMarks('stripes', torso)) {
    const s = spanAt(torso, m.pts[0].y);
    assert.ok(Math.abs(m.pts[0].x - s.l) < 1e-6 && Math.abs(m.pts[1].x - s.r) < 1e-6);
  }
  assert.deepEqual(patternMarks('wallpaper', torso), []);
  assert.deepEqual(patternMarks(null, torso), []);
});

test('painting uses only Graphics fills', () => {
  for (const id of PATTERN_IDS) {
    const { g, calls } = stub();
    paintPattern(g, patternMarks(id, torso), 0xff0000);
    assert.ok(calls.length > 3);
    assert.ok(calls.every(n => ['fillStyle', 'fillPoints', 'fillCircle', 'fillRect'].includes(n)), id);
  }
});
