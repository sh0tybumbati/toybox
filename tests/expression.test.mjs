import test from 'node:test';
import assert from 'node:assert/strict';
import { pickExpression } from '../src/systems/expression.js';
import { EXPRESSIONS, EYE_OPEN, REACTIONS } from '../src/data/expressions.js';
import { CATALOG } from '../src/data/items.js';

const base = { now: 1000, grabbed: false, chewing: false, reaction: null, reactUntil: 0, hoverFood: false, pokedUntil: 0, sleepy: false };
const pick = o => pickExpression({ ...base, ...o });

test('priority: grabbed > chewing > reaction > hungry > giggle > sleepy > neutral', () => {
  assert.equal(pick({}), 'neutral');
  assert.equal(pick({ sleepy: true }), 'sleepy');
  assert.equal(pick({ sleepy: true, pokedUntil: 2000 }), 'giggle');
  assert.equal(pick({ pokedUntil: 2000, hoverFood: true }), 'hungry');
  assert.equal(pick({ hoverFood: true, reaction: 'sour', reactUntil: 2000 }), 'sour');
  assert.equal(pick({ reaction: 'sour', reactUntil: 2000, chewing: true }), 'chew');
  assert.equal(pick({ chewing: true, grabbed: true }), 'surprised');
});

test('a reaction ends when its time is up', () => {
  assert.equal(pick({ reaction: 'spicy', reactUntil: 999 }), 'neutral');
  assert.equal(pick({ reaction: 'spicy', reactUntil: 1001 }), 'spicy');
});

test('every expression is well-formed', () => {
  const brows = ['none', 'up', 'worried', 'angry'];
  const mouths = ['smile', 'grin', 'open', 'tongue', 'o', 'flat', 'frown', 'wavy'];
  for (const [name, e] of Object.entries(EXPRESSIONS)) {
    assert.ok(e.eyes in EYE_OPEN, `${name} eyes`);
    assert.ok(brows.includes(e.brows), `${name} brows`);
    assert.ok(mouths.includes(e.mouth), `${name} mouth`);
  }
});

test('every reaction and every food reaction resolves to something real', () => {
  for (const [name, r] of Object.entries(REACTIONS)) assert.ok(EXPRESSIONS[r.expression], name);
  for (const [key, def] of Object.entries(CATALOG)) {
    if (def.kind === 'food' && def.reaction) assert.ok(REACTIONS[def.reaction], key);
  }
});
