import test from 'node:test';
import assert from 'node:assert/strict';
import { heatLevel, stopChance, raidChance, search, bribeCost, bribeChance, runChance, charge, pleaDeal, trialOdds, lost, seize, hasPlants, officerFor, valueOf, unitsOf } from '../src/systems/hard/police.js';
import { OFFICERS, SENTENCE_CAP, HIDES } from '../src/data/hard/police.js';
import { mix } from '../src/systems/hard/lab.js';

const batch = (at, units = 3) => ({ ...mix('nightbloom', units), at });

test('heat levels', () => {
  assert.deepEqual([0, 19, 20, 39, 40, 70, 100].map(heatLevel), ['calm', 'calm', 'noticed', 'noticed', 'watched', 'hunted', 'hunted']);
});

test('stops get likelier with heat, a record, the night and carrying; nobody is stopped when it is quiet', () => {
  assert.equal(stopChance(10, { carrying: true, night: true }), 0);
  const base = stopChance(50, {});
  assert.ok(stopChance(50, { carrying: true }) > base && stopChance(50, { night: true }) > base && stopChance(50, { record: true }) > base);
  assert.ok(stopChance(100, { carrying: true, night: true, record: true }) <= 0.5);
});

test('raids need heat and something at home to find', () => {
  assert.equal(raidChance(80, { stash: false }), 0);
  assert.equal(raidChance(39, { stash: true }), 0);
  assert.ok(raidChance(70, { stash: true }) > raidChance(45, { stash: true }));
  assert.ok(raidChance(100, { stash: true, record: true }) <= 0.7);
});

test('a search only looks where the goods are, and hiding places lower the chance', () => {
  const goods = [batch('carry'), batch('home'), batch('carry')];
  assert.deepEqual(search(goods, 'carry', false, () => 0), [0, 2]);
  assert.deepEqual(search(goods, 'home', false, () => 0), [1]);
  assert.deepEqual(search(goods, 'carry', false, () => 0.5), [0, 2], 'found when the roll is under 0.8');
  assert.deepEqual(search(goods, 'carry', true, () => 0.5), [], 'a false bottom hides it at the same roll');
  assert.ok(HIDES.bag.price < HIDES.safe.price);
});

test('bribes and runs: cost scales with value and a record; strict officers take bribes less; the hunted cannot run far', () => {
  assert.ok(bribeCost(10000, false) > bribeCost(0, false) && bribeCost(10000, true) > bribeCost(10000, false));
  const strict = OFFICERS.reduce((a, b) => (a.strict > b.strict ? a : b)), soft = OFFICERS.reduce((a, b) => (a.strict < b.strict ? a : b));
  assert.ok(bribeChance(soft, 20) > bribeChance(strict, 20) && bribeChance(soft, 80) < bribeChance(soft, 20));
  assert.ok(runChance(90) < runChance(10) && runChance(100) >= 0.15);
  assert.equal(officerFor(5).name, officerFor(5 + OFFICERS.length).name);
});

test('charges: possession is small, dealing is big, extras add up, and it is capped at a season', () => {
  const small = charge({ units: 2, value: 3000 }), dealing = charge({ units: 9, value: 25000 });
  assert.match(small.label, /possession/); assert.match(dealing.label, /dealing/);
  assert.ok(dealing.days > small.days && dealing.fine > small.fine);
  assert.ok(charge({ units: 2, value: 3000, resisting: true }).days === small.days + 3);
  assert.ok(charge({ units: 2, value: 3000, bribed: true, record: true }).days === small.days + 4);
  assert.ok(charge({ units: 2, plants: true }).label.includes('cultivation'));
  assert.equal(charge({ units: 50, value: 1e6, plants: true, resisting: true }).days, SENTENCE_CAP);
  assert.equal(charge({}).label, 'nothing');
});

test('a plea is shorter than going to trial and losing; a lawyer and a first offence help at trial', () => {
  const c = charge({ units: 6, value: 9000 });
  assert.ok(pleaDeal(c).days < c.days && lost(c).days > c.days);
  assert.ok(trialOdds({ lawyer: true, units: 6 }) > trialOdds({ units: 6 }));
  assert.ok(trialOdds({ units: 1 }) > trialOdds({ units: 6 }) && trialOdds({ units: 6, record: true }) < trialOdds({ units: 6 }));
  assert.ok(trialOdds({ lawyer: true }) <= 0.7);
});

test('an arrest takes the carried batches; a raid also takes the home ones', () => {
  const goods = [batch('carry'), batch('home')];
  assert.deepEqual(seize(goods, ['carry']).map(g => g.at), ['home']);
  assert.deepEqual(seize(goods, ['carry', 'home']), []);
  assert.equal(valueOf(goods, [0, 1]) > 0, true);
  assert.equal(unitsOf(goods, [0, 1]), 6);
});

test('growing plants or keeping them in the stash is evidence', () => {
  assert.equal(hasPlants({}, {}), false);
  assert.equal(hasPlants({ a: { crop: 'carrot' } }, {}), false);
  assert.equal(hasPlants({ a: { crop: 'nightbloom' } }, {}), true);
  assert.equal(hasPlants({}, { nightbloom: 2 }), true);
});
