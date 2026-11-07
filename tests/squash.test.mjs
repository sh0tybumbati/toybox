import test from 'node:test';
import assert from 'node:assert/strict';
import { flightStretch, easeStretch, newJelly, poke, stepJelly, jellyScale } from '../src/systems/squash.js';

test('things at rest are not stretched', () => {
  assert.deepEqual(flightStretch(0, 0), { x: 1, y: 1 });
});

test('a fast fall or a throw upward stretches tall and thin; a sideways throw stretches wide and flat', () => {
  const fall = flightStretch(0, 1800), side = flightStretch(1800, 0);
  assert.ok(fall.y > 1.1 && fall.x < 0.92);
  assert.ok(side.x > 1.1 && side.y < 0.92);
  assert.deepEqual(flightStretch(0, -1800), fall, 'up or down');
});

test('stretch keeps the same area and eases toward a limit', () => {
  for (const v of [100, 600, 1500, 5000, 50000]) {
    const s = flightStretch(0, v);
    assert.ok(Math.abs(s.x * s.y - 1) < 1e-9, `area at ${v}`);
  }
  assert.ok(flightStretch(0, 50000).y < 1.25, 'never beyond the max');
  assert.ok(flightStretch(0, 300).y < flightStretch(0, 1500).y, 'faster = more stretch');
});

test('stretch eases rather than snaps', () => {
  const cur = { x: 1, y: 1 };
  easeStretch(cur, { x: 0.8, y: 1.25 }, 1 / 60);
  assert.ok(cur.y > 1 && cur.y < 1.25);
  for (let i = 0; i < 60; i++) easeStretch(cur, { x: 0.8, y: 1.25 }, 1 / 60);
  assert.ok(Math.abs(cur.y - 1.25) < 0.01);
});

test('a jelly wobbles around rest and settles', () => {
  const j = newJelly();
  poke(j, -3);
  let min = 0, max = 0, crossings = 0, prev = 0;
  for (let i = 0; i < 300; i++) {
    stepJelly(j, 1 / 60);
    min = Math.min(min, j.x); max = Math.max(max, j.x);
    if (prev * j.x < 0) crossings++;
    prev = j.x || prev;
  }
  assert.ok(min < -0.05, 'squashes first');
  assert.ok(max > 0.02, 'then overshoots into a stretch');
  assert.ok(crossings >= 2, 'wobbles back and forth');
  assert.equal(j.x, 0, 'and comes to rest');
});

test('jelly scale: squashed = wider and shorter, stretched = taller and thinner', () => {
  assert.deepEqual(jellyScale({ x: 0, v: 0 }), { x: 1, y: 1 });
  const sq = jellyScale({ x: -0.3, v: 0 }), st = jellyScale({ x: 0.3, v: 0 });
  assert.ok(sq.x > 1 && sq.y < 1);
  assert.ok(st.x < 1 && st.y > 1);
});
