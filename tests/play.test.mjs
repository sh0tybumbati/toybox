import test from 'node:test';
import assert from 'node:assert/strict';
import { CLIMB_SHARE, freeSeat, partAngle, rotateAbout, seatCount, seatPoint, slidePoint } from '../src/systems/play.js';
import { PROP_TYPES } from '../src/data/props.js';
import { ROOMS, defaultFurniture } from '../src/data/rooms.js';
import { CATALOG } from '../src/data/items.js';
import { accepts } from '../src/systems/slots.js';

const play = Object.entries(PROP_TYPES).filter(([, d]) => d.behaviour === 'play');

test('playground gear: every piece has seats or a slide, inside its own box', () => {
  assert.ok(play.length >= 5, 'swing, slide, seesaw, bench, spring horse');
  for (const [id, d] of play) {
    assert.ok(d.ride && (d.ride.slide || seatCount(d.ride) > 0), id);
    for (const part of d.ride.parts || []) {
      assert.ok(part.pivot && part.seats.length, `${id} part`);
      if (part.motion) { assert.ok(part.motion.amp > 0 && part.motion.amp < 0.8 && part.motion.hz > 0, `${id} motion`); assert.equal(typeof part.draw, 'function', `${id} moving part is drawn`); }
      for (const s of part.seats) assert.ok(Math.abs(s.x) <= d.w / 2 && Math.abs(s.y) <= d.h / 2 + 100, `${id} seat is on the piece`);
    }
    const sl = d.ride.slide;
    if (sl) for (const p of [sl.base, sl.top, sl.end]) assert.ok(Math.abs(p.x) <= d.w / 2 + 20 && Math.abs(p.y) <= d.h / 2, `${id} slide path is inside`);
  }
});

test('a part rocks about its pivot and stays still when nobody is on', () => {
  const part = PROP_TYPES.swing.ride.parts[0];
  assert.equal(Math.abs(partAngle(part, 1.234, 0)), 0);
  const peak = Math.max(...[...Array(200)].map((_, i) => Math.abs(partAngle(part, i / 100, 1))));
  assert.ok(Math.abs(peak - part.motion.amp) < 0.01, 'swings out to its amplitude');
  assert.equal(partAngle(PROP_TYPES.bench.ride.parts[0], 3, 1), 0, 'a bench does not move');
  const p = rotateAbout({ x: 10, y: 10 }, 10, 60, Math.PI / 2);
  assert.ok(Math.abs(p.x - -40) < 1e-9 && Math.abs(p.y - 10) < 1e-9, 'a quarter turn swings the seat out sideways');
  const rest = seatPoint(PROP_TYPES.seesaw.ride, 0, 0, 0), tilted = seatPoint(PROP_TYPES.seesaw.ride, 0, 0, 0.2);
  const other = seatPoint(PROP_TYPES.seesaw.ride, 0, 1, 0.2);
  assert.deepEqual(rest, { x: -108, y: -8 });
  assert.ok(tilted.y < rest.y && other.y > rest.y, 'one end goes down while the other goes up');
});

test('seats fill up in order, and a full piece has none free', () => {
  const ride = PROP_TYPES.swing.ride;
  assert.equal(seatCount(ride), 2);
  assert.deepEqual(freeSeat(ride, []), { part: 0, seat: 0 });
  assert.deepEqual(freeSeat(ride, [{ part: 0, seat: 0 }]), { part: 1, seat: 0 });
  assert.equal(freeSeat(ride, [{ part: 0, seat: 0 }, { part: 1, seat: 0 }]), null);
  assert.equal(freeSeat(PROP_TYPES.slide.ride, []), null, 'the slide has no seats, riders queue up the ladder');
});

test('a slide rider climbs the ladder, then speeds down the chute', () => {
  const sl = PROP_TYPES.slide.ride.slide;
  assert.deepEqual(slidePoint(sl, 0), { ...sl.base, lean: 0 });
  const top = slidePoint(sl, CLIMB_SHARE);
  assert.ok(Math.abs(top.x - sl.top.x) < 1e-9 && Math.abs(top.y - sl.top.y) < 1e-9);
  const end = slidePoint(sl, 1);
  assert.ok(Math.abs(end.x - sl.end.x) < 1e-9 && Math.abs(end.y - sl.end.y) < 1e-9);
  const mid = slidePoint(sl, 0.2);
  assert.ok(mid.y < sl.base.y && mid.y > sl.top.y, 'climbing');
  const early = slidePoint(sl, CLIMB_SHARE + 0.1), later = slidePoint(sl, CLIMB_SHARE + 0.3);
  assert.ok(later.x - early.x > early.x - top.x, 'accelerating down the chute');
  assert.ok(slidePoint(sl, 0.8).lean !== 0, 'leaning back on the way down');
});

test('homes and parks no longer have endless shelves: they hold a limited, stocked supply instead', () => {
  for (const id of ['kitchen', 'bedroom', 'living', 'park', 'playground']) assert.deepEqual(ROOMS[id].shelves, [], `${id} has no endless shelves`);
  for (const id of ['kitchen', 'bedroom', 'living', 'park']) {
    const stocked = ROOMS[id].props.filter(p => p.stock);
    assert.ok(stocked.length, `${id} has stocked furniture`);
    for (const p of stocked) {
      const def = PROP_TYPES[p.type];
      assert.equal(def.behaviour, 'storage', `${id}: ${p.type} can hold things`);
      assert.ok(p.stock.length <= def.slots.length, `${id}: ${p.type} stock fits its slots`);
      for (const k of p.stock) { assert.ok(CATALOG[k], k); assert.ok(accepts(def, CATALOG[k].kind), `${id}: ${p.type} accepts ${k}`); }
    }
  }
  const kitchen = defaultFurniture('kitchen');
  assert.ok(kitchen.filter(f => f.type === 'shelf').every(f => f.items.length && f.items.every((it, i) => it.s === i)), 'defaults carry their stock into the slots');
  assert.ok(kitchen.filter(f => f.type === 'fridge').every(f => f.items.length === 0));
});

test('the park and playground have gear to play on', () => {
  const types = id => ROOMS[id].props.map(p => p.type);
  assert.ok(['swing', 'slide', 'seesaw'].every(t => types('playground').includes(t)));
  assert.ok(['bench', 'picnictable', 'sandbox'].every(t => types('park').includes(t)));
});
