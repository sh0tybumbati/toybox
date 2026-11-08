import test from 'node:test';
import assert from 'node:assert/strict';
import { newBed, tickBed, stage, water, harvestOf, take, give, cleanBeds, cleanStock } from '../src/systems/hard/garden.js';
import { CROPS } from '../src/data/hard/plants.js';

test('a planted bed grows a day at a time while it has water', () => {
  let b = newBed('carrot');
  assert.equal(stage(b), 'seed');
  b = tickBed(b); assert.equal(stage(b), 'growing');
  for (let i = 0; i < CROPS.carrot.days; i++) b = tickBed(water(b));
  assert.equal(stage(b), 'ready');
});

test('a bed left dry stops growing and withers after two days', () => {
  let b = newBed('tomato');
  b = tickBed(b); b = tickBed(b); b = tickBed(b);              // 100 -> 60 -> 20 -> 0
  assert.equal(b.dry, 1);
  const grown = b.grown;
  b = tickBed(b);
  assert.equal(b.grown, grown); assert.equal(stage(b), 'dead');
});

test('rain waters the beds', () => {
  let b = newBed('corn');
  b = tickBed(tickBed(tickBed(b)));
  b = tickBed(b, true);
  assert.equal(b.water, 100); assert.equal(b.dry, 0);
});

test('fertiliser gives one extra crop', () => {
  assert.deepEqual(harvestOf({ ...newBed('potato'), fert: true }), { item: 'potato', count: CROPS.potato.yield + 1 });
});

test('seed stock counts down and never goes negative', () => {
  let s = give({}, 'carrot', 2);
  s = take(s, 'carrot'); s = take(s, 'carrot');
  assert.equal(take(s, 'carrot'), null);
});

test('saved beds and stock are cleaned', () => {
  assert.deepEqual(cleanBeds({ '0:200': { crop: 'bogus' }, nope: { crop: 'corn' } }), {});
  assert.equal(cleanBeds({ '0:200': { crop: 'corn', grown: 3, water: 50, dry: 0, fert: 1 } })['0:200'].fert, true);
  assert.deepEqual(cleanStock({ carrot: 3, nonsense: 5, corn: -1 }, ['carrot', 'corn']), { carrot: 3 });
});

import { SCENARIOS, SCENARIO_IDS } from '../src/data/hard/scenarios.js';
import { ROOMS } from '../src/data/rooms.js';
import { PROP_TYPES } from '../src/data/props.js';

test('every scenario has a Garden Centre; homes have a front door in the first room; the house has a garden at the back', () => {
  for (const id of SCENARIO_IDS) {
    const city = SCENARIOS[id].city();
    assert.ok(city.some(b => b && b.name === 'Garden Centre'), id);
    const home = SCENARIOS[id].home && city[SCENARIOS[id].home.slot];
    if (!home) continue;
    const rooms = home.floors[0].rooms;
    assert.ok((rooms[0].extra || []).some(p => p.type === 'frontdoor'), `${id}: front door in the road-side room`);
    if (id === 'house') assert.equal(rooms[rooms.length - 1].type, 'garden');
  }
  assert.ok(ROOMS.garden.outdoor && PROP_TYPES.gardenbed.hardActions.includes('tend'));
});
