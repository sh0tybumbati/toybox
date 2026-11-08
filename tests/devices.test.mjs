import test from 'node:test';
import assert from 'node:assert/strict';
import { JOB_TEMPLATES, JOB_IDS, LISTINGS_PER_DAY } from '../src/data/hard/jobs.js';
import { listings } from '../src/systems/hard/jobs.js';
import { SCENARIOS } from '../src/data/hard/scenarios.js';
import { newHardSave } from '../src/data/hard/start.js';
import { sanitize } from '../src/systems/save.js';
import { PROP_TYPES } from '../src/data/props.js';
import { ACTIONS } from '../src/data/hard/needs.js';
import { roughHour } from '../src/systems/hard/street.js';

test('the classifieds: the same ads on the same day, different ads on other days, pay within 8% of the going rate', () => {
  assert.deepEqual(listings(5), listings(5));
  assert.equal(listings(5).length, LISTINGS_PER_DAY);
  const days = new Set(Array.from({ length: 20 }, (_, d) => listings(d).map(j => j.id).join()));
  assert.ok(days.size > 8, 'the ads change from day to day');
  for (let d = 0; d < 30; d++) for (const ad of listings(d)) {
    const base = JOB_TEMPLATES.find(j => j.id === ad.id);
    assert.ok(ad.pay >= base.pay * 0.9 && ad.pay <= base.pay * 1.1, `${ad.id}: ${ad.pay}`);
    assert.equal(ad.pay % 50, 0);
  }
  assert.equal(new Set(listings(3).map(j => j.id)).size, LISTINGS_PER_DAY, 'no repeats in one paper');
  assert.equal(JOB_IDS.length, 7);
});

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
