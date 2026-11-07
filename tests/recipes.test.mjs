import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, COMBOS, SURPRISE, MAX_INGREDIENTS, matchRecipe, cookOutcome, findCombo } from '../src/data/recipes.js';
import { CATALOG } from '../src/data/items.js';
import { PROP_TYPES } from '../src/data/props.js';
import { ROOMS } from '../src/data/rooms.js';

test('a recipe matches its ingredients in any order, and only exactly', () => {
  assert.equal(matchRecipe(['egg', 'milk', 'flour']).id, 'pancakes');
  assert.equal(matchRecipe(['flour', 'milk', 'egg']).id, 'pancakes');
  assert.equal(matchRecipe(['flour', 'egg']), null);                  // a subset isn't enough
  assert.equal(matchRecipe(['flour', 'egg', 'milk', 'milk']), null);  // neither is a superset
  assert.equal(matchRecipe(['flour']).id, 'bread');                   // single-ingredient recipes work
});

test('cookOutcome: recipe, warm leftover, chef\'s surprise, or nothing', () => {
  assert.deepEqual(cookOutcome(['egg']).key, 'friedegg');
  assert.equal(cookOutcome(['egg']).recipe.id, 'friedegg');
  assert.deepEqual(cookOutcome(['pizza']), { key: 'pizza', recipe: null });       // unmatched single: unchanged
  assert.deepEqual(cookOutcome(['pizza', 'melon']), { key: SURPRISE, recipe: null });
  assert.equal(cookOutcome([]), null);
});

test('recipes are well-formed: unique ids and mixes, real foods, sane sizes, hints', () => {
  const ids = new Set(), mixes = new Set();
  for (const r of RECIPES) {
    assert.ok(!ids.has(r.id), `duplicate id ${r.id}`); ids.add(r.id);
    const mix = [...r.ingredients].sort().join('+');
    assert.ok(!mixes.has(mix), `duplicate mix ${mix}`); mixes.add(mix);
    assert.ok(r.ingredients.length >= 1 && r.ingredients.length <= MAX_INGREDIENTS, r.id);
    for (const k of [...r.ingredients, r.result]) assert.equal(CATALOG[k] && CATALOG[k].kind, 'food', `${r.id}: ${k}`);
    assert.ok(r.name && r.hint, r.id);
  }
  assert.equal(CATALOG[SURPRISE].kind, 'food');
});

test('combos work in either order and reject unknown pairs', () => {
  assert.equal(findCombo('bread', 'jam'), 'sandwich');
  assert.equal(findCombo('jam', 'bread'), 'sandwich');
  assert.equal(findCombo('bread', 'apple'), null);
  for (const c of COMBOS.flat()) assert.equal(CATALOG[c].kind, 'food', c);
});

// Everything you can get your hands on without cooking: shelves and prop pools.
const basics = () => new Set([
  ...Object.values(ROOMS).flatMap(r => r.shelves.flatMap(s => s.items)),
  ...Object.values(ROOMS).flatMap(r => r.props.flatMap(p => p.stock || [])),
  ...Object.values(PROP_TYPES).flatMap(p => p.pool || []),
]);

test('every recipe can actually be cooked (ingredients come from shelves, props or earlier dishes)', () => {
  const have = basics();
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of RECIPES) if (!have.has(r.result) && r.ingredients.every(k => have.has(k))) { have.add(r.result); grew = true; }
    for (const [a, b, out] of COMBOS) if (!have.has(out) && have.has(a) && have.has(b)) { have.add(out); grew = true; }
  }
  for (const r of RECIPES) assert.ok(have.has(r.result), `${r.id} can't be cooked`);
});

test('every catalog item can be obtained somehow', () => {
  const have = basics();
  for (const r of RECIPES) have.add(r.result);
  for (const [, , out] of COMBOS) have.add(out);
  have.add(SURPRISE);
  for (const k of Object.keys(CATALOG)) assert.ok(have.has(k), `${k} can't be obtained`);
});

test('every dispenser pool item exists, and every placed prop has a known type', () => {
  for (const [name, p] of Object.entries(PROP_TYPES)) {
    if (p.behaviour === 'dispenser') for (const k of p.pool) assert.ok(CATALOG[k], `${name}: ${k}`);
  }
  for (const [room, r] of Object.entries(ROOMS)) {
    for (const p of r.props || []) assert.ok(PROP_TYPES[p.type], `${room}: ${p.type}`);
  }
});
