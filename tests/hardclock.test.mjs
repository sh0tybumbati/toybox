import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MIN, SPEEDS, newClock, advance, hourOf, isNight, label, timeLabel, cleanClock, gameMinutes } from '../src/systems/hard/clock.js';
import { START_NEEDS, ACTIONS, ACTION_IDS, WANTS, nutritionOf, DECAY } from '../src/data/hard/needs.js';
import { newNeeds, tick, apply, status, wantsToDo, cleanNeeds } from '../src/systems/hard/needs.js';
import { CATALOG } from '../src/data/items.js';

test('one real minute is one game hour, and a day is 24 real minutes', () => {
  assert.equal(gameMinutes(60, 1), 60);                 // 60 real seconds at normal speed = 60 game minutes
  assert.equal(gameMinutes(60 * 24, 1), DAY_MIN);
  assert.deepEqual(SPEEDS, [0, 1, 3, 6]);
  assert.equal(gameMinutes(10, 0), 0, 'paused');
  assert.equal(gameMinutes(10, 3), 60);
});

test('the clock rolls over midnight into the next day and names the weekday', () => {
  const c = newClock();
  assert.equal(label(c), 'Mon 08:00');
  advance(c, 16 * 60 + 30);
  assert.equal(c.day, 1); assert.equal(label(c), 'Tue 00:30');
  advance(c, DAY_MIN * 6);
  assert.equal(label(c), 'Mon 00:30');                   // a week on
  assert.equal(timeLabel({ day: 0, minute: 9 * 60 + 5.7 }), '09:05');
});

test('night is 20:00 to 06:00', () => {
  assert.ok(isNight({ minute: 20 * 60 }) && isNight({ minute: 3 * 60 }) && isNight({ minute: 5 * 60 + 59 }));
  assert.ok(!isNight({ minute: 6 * 60 }) && !isNight({ minute: 12 * 60 }) && !isNight({ minute: 19 * 60 + 59 }));
  assert.equal(hourOf({ minute: 125 }), 2);
});

test('saved clocks are repaired', () => {
  assert.deepEqual(cleanClock(null), newClock());
  assert.deepEqual(cleanClock({ day: 3.7, minute: 90 }), { day: 3, minute: 90 });
  assert.ok(cleanClock({ day: 1, minute: 99999 }).minute < DAY_MIN);
  assert.equal(cleanClock({ day: -4, minute: -1 }).day, 0);
});

test('needs are tight: doing nothing, a person is starving in about a day', () => {
  const n = newNeeds();
  tick(n, 14 * 60);
  assert.ok(n.hunger < 5, `hunger after 14h: ${n.hunger}`);
  assert.ok(n.energy < 40);
  const m = newNeeds(); tick(m, 24 * 60);
  assert.equal(m.hunger, 0); assert.equal(m.energy, 0);
  assert.ok(status(m).starving && status(m).exhausted);
  assert.equal(DECAY.hunger, -5);
});

test('sleeping in a bed restores energy; on the floor it barely does and costs hygiene and mood', () => {
  const bed = { ...START_NEEDS, energy: 10 }, floor = { ...START_NEEDS, energy: 10 };
  tick(bed, 6 * 60, { sleeping: 'bed' }); tick(floor, 6 * 60, { sleeping: 'floor' });
  assert.ok(bed.energy > 90, `bed ${bed.energy}`);
  assert.ok(floor.energy > 40 && floor.energy < bed.energy);
  assert.ok(floor.hygiene < bed.hygiene && floor.mood < bed.mood);
});

test('being hungry, tired or dirty wears the mood down faster', () => {
  const ok = { hunger: 80, energy: 80, hygiene: 80, mood: 80 }, bad = { hunger: 10, energy: 10, hygiene: 10, mood: 80 };
  tick(ok, 60); tick(bad, 60);
  assert.ok(ok.mood > 77 && bad.mood < 70);
});

test('actions restore needs and stay within 0..100', () => {
  const n = { hunger: 95, energy: 5, hygiene: 50, mood: 50 };
  apply(n, { hunger: 40, energy: -20, hygiene: 10, nonsense: 5 });
  assert.deepEqual(n, { hunger: 100, energy: 0, hygiene: 60, mood: 50 });
  assert.ok(ACTIONS.wash.perMin.hygiene * ACTIONS.wash.minutes >= 80, 'a wash makes you clean');
  assert.deepEqual(ACTION_IDS, ['eat', 'sleep', 'wash', 'sit']);
});

test('free will: the most urgent want that has somewhere to happen wins', () => {
  const can = { eat: true, sleep: true, wash: true, sit: true };
  assert.equal(wantsToDo({ hunger: 80, energy: 80, hygiene: 80, mood: 80 }, can), null, 'all fine: nothing');
  assert.equal(wantsToDo({ hunger: 10, energy: 80, hygiene: 80, mood: 80 }, can), 'eat');
  assert.equal(wantsToDo({ hunger: 30, energy: 5, hygiene: 80, mood: 80 }, can), 'sleep');
  assert.equal(wantsToDo({ hunger: 10, energy: 5, hygiene: 80, mood: 80 }, { ...can, sleep: false }), 'eat', 'no bed: eat instead');
  assert.equal(wantsToDo({ hunger: 10, energy: 5, hygiene: 5, mood: 5 }, {}), null, 'nowhere to do anything');
  for (const w of Object.values(WANTS)) assert.ok(w.at > 0 && w.weight > 0);
});

test('every food has a nutrition value and saved needs are repaired', () => {
  assert.ok(nutritionOf('pizza') > nutritionOf('apple'));
  assert.equal(nutritionOf('teddy'), 25, 'unknown things count as a snack');
  for (const k of ['apple', 'burger', 'pancakes']) assert.ok(nutritionOf(k) > 0);
  assert.deepEqual(cleanNeeds(null), START_NEEDS);
  assert.deepEqual(cleanNeeds({ hunger: 500, energy: -5, hygiene: 'x' }), { hunger: 100, energy: 0, hygiene: START_NEEDS.hygiene, mood: START_NEEDS.mood });
});
