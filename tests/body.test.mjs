import test from 'node:test';
import assert from 'node:assert/strict';
import { LAYOUTS, AGES, layoutFor, limbCurve, limbTargets, springTip } from '../src/data/body.js';
import { SLOTS_FOR } from '../src/data/items.js';

test('kids and adults are both laid out; unknown ages fall back to kid', () => {
  assert.deepEqual(AGES.sort(), ['adult', 'kid']);
  assert.equal(layoutFor('wizard'), LAYOUTS.kid);
  assert.ok(LAYOUTS.adult.foot > LAYOUTS.kid.foot, 'grown-ups are taller');
});

test('proportions: kids are top-heavy chibis, adults are stretched with smaller heads', () => {
  const height = L => L.foot - (L.head.y - L.head.ry);
  const headFrac = L => (L.head.ry * 2) / height(L);
  assert.ok(headFrac(LAYOUTS.kid) > 0.4, `a kid's head is about half of them (${headFrac(LAYOUTS.kid).toFixed(2)})`);
  assert.ok(headFrac(LAYOUTS.adult) < 0.35, `an adult is 3-4 heads tall (${headFrac(LAYOUTS.adult).toFixed(2)})`);
  assert.ok(height(LAYOUTS.adult) > height(LAYOUTS.kid) * 1.15);
});

test('every layout has what the game needs: zones for each slot, slots inside the body box, feet on the floor', () => {
  for (const [age, L] of Object.entries(LAYOUTS)) {
    for (const z of ['head', 'eyes', 'mouth', 'handL', 'handR', 'feet', 'body']) assert.equal(L.zones[z].length, 4, `${age}.${z}`);
    for (const slots of Object.values(SLOTS_FOR)) for (const s of slots) assert.ok(L.zones[s] && L.slots[s], `${age} supports the ${s} slot`);
    assert.ok(L.footRest.y < L.foot && L.footRest.y > L.foot - 20, `${age}: feet rest on the floor line`);
    assert.ok(L.head.y - L.head.ry >= -L.foot, `${age}: the head fits in the hit box`);
    const [bx, by, bw, bh] = L.zones.body;
    assert.ok(by >= -L.foot && by + bh <= L.foot + 1, `${age}: body zone is inside the box`);
  }
});

test('a limb curve is a boneless hose: it joins its ends, bows sideways and never goes straight', () => {
  const a = { x: 0, y: 0 }, b = { x: 0, y: 80 };
  const c = limbCurve(a, b, 12, 1);
  assert.deepEqual(c[0], a);
  assert.ok(Math.hypot(c[c.length - 1].x - b.x, c[c.length - 1].y - b.y) < 1e-9);
  const off = Math.max(...c.map(p => Math.abs(p.x)));
  assert.ok(off > 4, `bows out by ${off.toFixed(1)}px`);
  const one = limbCurve(a, b, 12, 1), other = limbCurve(a, b, 12, -1);
  assert.ok(one.some(p => p.x < -3) && other.some(p => p.x > 3), 'and the other side bows the other way');
});

test('limb targets: arms rest by the sides, swing opposite the legs when walking, and rise when lifted', () => {
  const L = LAYOUTS.kid;
  const still = limbTargets(L, {});
  assert.ok(still.handL.x < 0 && still.handR.x > 0);
  assert.ok(Math.abs(still.footL.x) > 10 && still.footL.y > L.foot - 20);
  const w = limbTargets(L, { phase: 1.2, amt: 1 });
  assert.ok((w.footL.x - still.footL.x) * (w.footR.x - still.footR.x) < 0, 'feet move in antiphase');
  assert.ok((w.handL.y - still.handL.y) * (w.handR.y - still.handR.y) < 0, 'arms swing in antiphase');
  const up = limbTargets(L, { lift: 1 });
  assert.ok(up.handL.y < L.shoulder.y, 'hands go up past the shoulders');
  const run = limbTargets(L, { vx: 300 });
  assert.ok(run.handR.x < still.handR.x, 'arms trail behind a moving body');
});

test('the spring overshoots then settles on its target', () => {
  const tip = { x: 0, y: 0, vx: 0, vy: 0 };
  let peak = 0;
  for (let i = 0; i < 200; i++) { springTip(tip, { x: 50, y: 0 }, 1 / 60); peak = Math.max(peak, tip.x); }
  assert.ok(peak > 50.5, 'rubbery overshoot');
  assert.ok(Math.abs(tip.x - 50) < 0.5, 'then settles');
});
