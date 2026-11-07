import test from 'node:test';
import assert from 'node:assert/strict';
import { COIN_TO_CASH, toCash, toCoins, exchange, isPin, hashPin, checkPin, tapCounter, defaultSetup, cleanSetup } from '../src/systems/mode.js';
import { SCENARIOS, SCENARIO_IDS } from '../src/data/hard/scenarios.js';
import { newHardSave } from '../src/data/hard/start.js';
import { sanitize } from '../src/systems/save.js';
import { zoneInfo } from '../src/systems/world.js';
import { MAX_PARTY } from '../src/data/characters.js';

test('1 coin is 100 cash, both ways, and you cannot overspend', () => {
  assert.equal(COIN_TO_CASH, 100);
  assert.equal(toCash(3), 300); assert.equal(toCoins(399), 3); assert.equal(toCoins(-5), 0);
  assert.deepEqual(exchange({ coins: 5, cash: 50 }, 'toCash', 2), { coins: 3, cash: 250 });
  assert.deepEqual(exchange({ coins: 5, cash: 250 }, 'toCoins', 2), { coins: 7, cash: 50 });
  assert.equal(exchange({ coins: 1, cash: 0 }, 'toCash', 2), null);
  assert.equal(exchange({ coins: 0, cash: 199 }, 'toCoins', 2), null);
  assert.equal(exchange({ coins: 5, cash: 0 }, 'toCash', 0), null);
  assert.equal(exchange({ coins: 5, cash: 0 }, 'sideways', 1), null);
});

test('the PIN is four digits, stored as a hash, and checked against it', () => {
  assert.ok(isPin('0420') && !isPin('420') && !isPin('04200') && !isPin('abcd') && !isPin(1234));
  const h = hashPin('1234');
  assert.notEqual(h, '1234'); assert.equal(h, hashPin('1234')); assert.notEqual(h, hashPin('1235'));
  assert.ok(checkPin('1234', h)); assert.ok(!checkPin('1235', h)); assert.ok(!checkPin('1234', null));
});

test('the hidden switch needs seven quick taps in a row', () => {
  let s = null;
  for (let i = 0; i < 6; i++) { s = tapCounter(s, 1000 + i * 300); assert.equal(s.open, false); }
  assert.equal(tapCounter(s, 1000 + 6 * 300).open, true);
  let t = tapCounter(null, 0); t = tapCounter(t, 5000);                   // too slow: starts over
  assert.equal(t.n, 1);
});

test('setups are cleaned: unknown values fall back, toggles stay booleans', () => {
  assert.deepEqual(cleanSetup(null, SCENARIO_IDS), defaultSetup());
  const c = cleanSetup({ failure: 'true', scenario: 'jail', toggles: { violence: false, police: 'yes', nonsense: true } }, SCENARIO_IDS);
  assert.equal(c.failure, 'true'); assert.equal(c.scenario, 'jail');
  assert.deepEqual(c.toggles, { violence: false, substances: true, police: true, survival: true });
  assert.equal(cleanSetup({ failure: 'easy', scenario: 'moon' }, SCENARIO_IDS).failure, 'soft');
});

test('every scenario is a real, playable start', () => {
  assert.deepEqual(SCENARIO_IDS, ['bench', 'flat', 'house', 'jail']);
  for (const id of SCENARIO_IDS) {
    const sc = SCENARIOS[id], save = newHardSave({ scenario: id });
    assert.ok(save, id);
    assert.ok(zoneInfo(save.city, save.zone), `${id}: the start zone exists`);
    assert.equal(save.zone, sc.zone);
    assert.equal(save.hard.cash, sc.cash); assert.equal(save.hard.debt, sc.debt); assert.equal(save.hard.record, sc.record);
    assert.equal(save.hard.fresh, true);
    assert.equal(save.characters.length, 1);
    assert.equal(save.characters[0].look.age, 'adult');
    assert.ok(save.city.some(b => b && b.name === 'Corner Shop'), `${id}: there is a shop`);
  }
  assert.ok(newHardSave({ scenario: 'flat' }).city[0].name === 'Flat');
  assert.ok(SCENARIOS.house.debt > 0 && SCENARIOS.jail.record && SCENARIOS.bench.cash === 0);
});

test('hard saves never hold a child; kid saves have no hard block', () => {
  const kids = Array.from({ length: 9 }, (_, i) => ({ id: `c${i}`, name: `N${i}`, look: { age: 'kid' }, worn: {} }));
  const hard = sanitize({ ...newHardSave({}), characters: kids });
  assert.equal(hard.characters.length, MAX_PARTY);
  assert.ok(hard.characters.every(c => c.look.age === 'adult'), 'child looks are made adult');
  const kid = sanitize({ v: 12, zone: '0.1', characters: kids, floors: {} });
  assert.equal(kid.hard, null);
  assert.ok(kid.characters.some(c => c.look.age === 'kid'));
});

test('a damaged hard block is repaired', () => {
  const h = sanitize({ ...newHardSave({}), hard: { cash: -5, debt: 'lots', record: 1, setup: { scenario: 'nowhere' } } }).hard;
  assert.equal(h.cash, 0); assert.equal(h.debt, 0); assert.equal(h.record, true); assert.equal(h.setup.scenario, 'bench'); assert.equal(h.fresh, false);
});
