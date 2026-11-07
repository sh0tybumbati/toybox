import test from 'node:test';
import assert from 'node:assert/strict';
import { petGoal, thinkDelay, FOLLOW_DIST } from '../src/systems/pets.js';
import { PETS, PET_KINDS, MAX_PETS } from '../src/data/pets.js';
import { FLOOR_TOP, FLOOR_BOTTOM, W } from '../src/config.js';

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test('a pet that strayed too far trots back toward its kid, on the side it came from', () => {
  const kid = { x: 700, lane: 500 }, pet = { x: 100, lane: 520 };
  const g = petGoal(pet, kid, seq(0.5));
  assert.ok(g.x < kid.x && kid.x - g.x < 130, `stops beside the kid (${g.x})`);
  assert.ok(Math.abs(kid.x - pet.x) > FOLLOW_DIST);
});

test('a pet near its kid just pootles about or sits still', () => {
  const kid = { x: 400, lane: 500 }, pet = { x: 380, lane: 500 };
  assert.equal(petGoal(pet, kid, seq(0.1)), null, 'sometimes sits');
  const g = petGoal(pet, kid, seq(0.9, 1, 0));
  assert.ok(g && Math.abs(g.x - pet.x) <= 180);
});

test('goals always stay on the floor and inside the room', () => {
  for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
    const g = petGoal({ x: 70, lane: 450 }, { x: 900, lane: 580 }, seq(r, r, r)) || petGoal({ x: 70, lane: 450 }, null, seq(0.99, 0, 0));
    assert.ok(g.x >= 60 && g.x <= W - 60 && g.lane >= FLOOR_TOP && g.lane <= FLOOR_BOTTOM, JSON.stringify(g));
  }
});

test('think delay is a couple of seconds; pet data is complete', () => {
  assert.ok(thinkDelay(() => 0) >= 1500 && thinkDelay(() => 0.999) <= 5500);
  assert.ok(PET_KINDS.length >= 4 && MAX_PETS >= 2);
  for (const k of PET_KINDS) assert.ok(PETS[k].name && PETS[k].emoji && PETS[k].cry, k);
});
