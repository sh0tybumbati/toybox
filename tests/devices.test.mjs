import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/data/hard/scenarios.js';
import { newHardSave } from '../src/data/hard/start.js';
import { sanitize } from '../src/systems/save.js';
import { PROP_TYPES } from '../src/data/props.js';
import { ACTIONS } from '../src/data/hard/needs.js';
import { roughHour } from '../src/systems/hard/street.js';

test('the phone and the computer: homes come with a phone, the bench and the jail start do not; devices and where to get them exist', () => {
  assert.equal(SCENARIOS.bench.phone, false); assert.equal(SCENARIOS.jail.phone, false);
  assert.equal(SCENARIOS.flat.phone, true); assert.equal(SCENARIOS.house.phone, true);
  for (const id of Object.keys(SCENARIOS)) assert.equal(newHardSave({ scenario: id }).hard.phone, SCENARIOS[id].phone, id);
  for (const t of ['computer', 'newsstand', 'phonekiosk']) { assert.ok(PROP_TYPES[t] && PROP_TYPES[t].hardOnly, t); assert.ok(PROP_TYPES[t].hardActions.every(a => ACTIONS[a]), `${t} actions exist`); }
  const types = id => newHardSave({ scenario: id }).city.filter(Boolean).flatMap(b => b.floors.flatMap(f => f.rooms.flatMap(r => (r.extra || []).map(p => p.type))));
  assert.ok(types('flat').includes('computer') && types('house').includes('computer'), 'a computer at home');
  for (const id of ['bench', 'jail', 'flat']) { assert.ok(types(id).includes('newsstand'), `${id}: a newsstand`); assert.ok(types(id).includes('phonekiosk')); }
  assert.ok(types('bench').filter(t => t === 'computer').length >= 1, 'a public computer at the post office');
  assert.equal(sanitize({ ...newHardSave({}), hard: { ...newHardSave({}).hard, phone: 'yes' } }).hard.phone, true);
  assert.equal(sanitize(newHardSave({})).hard.phone, false);
});

test('being robbed in your sleep can cost you the phone too', () => {
  const ev = roughHour({ hour: 12, cash: 1000, toggles: { police: false, survival: true } }, () => 0);
  assert.equal(ev[0].type, 'theft');
  assert.equal(typeof ev[0].phone, 'boolean');
  const none = roughHour({ hour: 12, cash: 1000, toggles: { police: false, survival: true } }, () => 0.99);
  assert.deepEqual(none, []);
});

test('fridges and pantries keep a pool for the kid game, but only the meal line is free food in hard mode', () => {
  for (const t of ['fridge', 'pantry']) assert.ok(!PROP_TYPES[t].hardActions.includes('queue'), t);
  assert.ok(PROP_TYPES.servery.hardActions.includes('queue') && PROP_TYPES.servery.pool.length > 0);
});
