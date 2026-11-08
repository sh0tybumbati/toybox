import test from 'node:test';
import assert from 'node:assert/strict';
import { offers, BURNER_PRICE, HOT_STOCK, HEAT, addHeat, decayHeat, HOT_GOODS } from '../src/systems/hard/alley.js';
import { hardPriceOf } from '../src/data/hard/food.js';
import { ROOMS } from '../src/data/rooms.js';
import { PROP_TYPES } from '../src/data/props.js';
import { BLUEPRINTS } from '../src/data/buildings.js';
import { newHardSave } from '../src/data/hard/start.js';
import { sanitize } from '../src/systems/save.js';
import { openNow } from '../src/systems/hard/clock.js';
import { weatherAt } from '../src/systems/hard/weather.js';
import { ACTIONS, WARM } from '../src/data/hard/needs.js';
import { warmthRate } from '../src/systems/hard/needs.js';

test('the contact sells a burner phone and three hot foods at half price, the same all day and different on other days', () => {
  const o = offers(4);
  assert.deepEqual(o, offers(4));
  assert.equal(o[0].id, 'burner'); assert.equal(o[0].price, BURNER_PRICE);
  assert.equal(o.length, 4);
  for (const f of o.slice(1)) { assert.ok(HOT_GOODS.includes(f.food) && f.stock === HOT_STOCK); assert.ok(f.price <= hardPriceOf(f.food) * 0.55 && f.price > 0, `${f.food}: ${f.price}`); }
  assert.ok(new Set(Array.from({ length: 14 }, (_, d) => offers(d).slice(1).map(x => x.id).join())).size > 4, 'the stock changes');
  assert.ok(BURNER_PRICE < 3500, 'cheaper than the shop phone');
});

test('buying draws heat, which fades day by day and stays within 0..100', () => {
  assert.equal(addHeat(0, HEAT.goods), 4); assert.equal(addHeat(98, 5), 100); assert.equal(addHeat(5, -50), 0);
  assert.equal(decayHeat(20, 1), 12); assert.equal(decayHeat(5, 3), 0);
});

test('the alley is a place: an outdoor room with a contact (after dark only), a fire to warm up at and a bin; in every hard-mode city', () => {
  assert.ok(ROOMS.alley.outdoor && typeof ROOMS.alley.draw === 'function');
  assert.ok(BLUEPRINTS.alley);
  assert.deepEqual(ROOMS.alley.props.map(p => p.type).sort(), ['corner', 'dealer', 'dumpster', 'firebarrel']);
  const dealer = PROP_TYPES.dealer;
  assert.ok(openNow(dealer.hours, 22 * 60) && openNow(dealer.hours, 2 * 60) && !openNow(dealer.hours, 12 * 60));
  assert.ok(PROP_TYPES.firebarrel.hardActions.includes('warm'));
  for (const id of ['bench', 'flat', 'house', 'jail']) assert.ok(newHardSave({ scenario: id }).city.some(b => b && b.name === 'Back Alley'), id);
});

test('saved heat and the day\'s purchases are repaired', () => {
  const base = newHardSave({});
  assert.equal(sanitize({ ...base, hard: { ...base.hard, heat: 500 } }).hard.heat, 100);
  assert.equal(sanitize({ ...base, hard: { ...base.hard, heat: 'x' } }).hard.heat, 0);
  const d = sanitize({ ...base, hard: { ...base.hard, deals: { day: 3, counts: { bread: 2, junk: 'x' } } } }).hard.deals;
  assert.deepEqual(d, { day: 3, counts: { bread: 2 } });
  assert.equal(sanitize({ ...base, hard: { ...base.hard, deals: 'no' } }).hard.deals, null);
});

test('a fire barrel really does warm you faster than the worst winter night takes it away', () => {
  let worst = 0;
  for (let d = 84; d < 112; d++) for (const h of [2, 4]) { const w = weatherAt(d, h * 60); worst = Math.min(worst, warmthRate({ outdoors: true, temp: w.temp, kind: w.kind }, 'floor')); }
  assert.ok(worst < -10, 'winter nights are brutal');
  assert.ok(ACTIONS.warm.perMin.warmth * 60 > -worst, 'but a fire beats it');
  assert.ok(WARM.indoor > 0);
});
