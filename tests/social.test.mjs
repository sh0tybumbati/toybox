import test from 'node:test';
import assert from 'node:assert/strict';
import { hugPartner, hugSpots, overBed, bedAt, HUG_GAP } from '../src/systems/social.js';

const ch = (id, x, lane = 500, extra = {}) => ({ id, x, lane, ...extra });

test('hug partner: the nearest free friend in range', () => {
  const a = ch('a', 300), near = ch('n', 380), far = ch('f', 700), busy = ch('b', 330, 500, { sleeping: {} });
  assert.equal(hugPartner([a, near, far, busy], a), near);
  assert.equal(hugPartner([a, far], a), null);
  assert.equal(hugPartner([a, ch('deep', 330, 580)], a), null, 'too far apart in depth');
  assert.equal(hugPartner([a, ch('h', 340, 500, { hugging: true })], a), null, 'already hugging');
  assert.equal(hugPartner([a, ch('held', 340, 500, { held: true })], a), null);
});

test('hug spots: a fixed gap apart, leaning toward each other, either way round', () => {
  const s = hugSpots(ch('a', 300), ch('b', 380));
  assert.ok(Math.abs((s.b.x - s.a.x) - HUG_GAP) < 1e-9);
  assert.ok(s.a.tilt > 0 && s.b.tilt < 0);
  const r = hugSpots(ch('a', 380), ch('b', 300));
  assert.ok(r.a.x > r.b.x);
  assert.ok(r.a.tilt < 0 && r.b.tilt > 0);
});

test('a bed is under you when your feet are inside it (with a little slack in depth)', () => {
  const bed = { x: 480, y: 500, def: { w: 260, h: 100, behaviour: 'bed' } };
  assert.ok(overBed(bed, 480, 500));
  assert.ok(overBed(bed, 360, 560));
  assert.ok(!overBed(bed, 100, 500));
  assert.ok(!overBed(bed, 480, 400));
  assert.equal(bedAt([bed], 480, 500), bed);
  assert.equal(bedAt([{ ...bed, sleeper: {} }], 480, 500), undefined, 'taken');
});
