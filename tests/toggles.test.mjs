import test from 'node:test';
import assert from 'node:assert/strict';
import { DARK_PROPS, isDarkBed, isDarkProp, splitBeds, subsOn } from '../src/systems/hard/toggles.js';
import { PROP_TYPES } from '../src/data/props.js';
import { newBed, tickBeds } from '../src/systems/hard/garden.js';
import { ROOMS } from '../src/data/rooms.js';

const hard = on => ({ setup: { toggles: { violence: true, substances: on, police: true, survival: true } } });

test('the substances switch: on by default and in kid mode, off only when it says false', () => {
  assert.equal(subsOn(null), true, 'kid mode has no switch to turn off');
  assert.equal(subsOn(hard(true)), true); assert.equal(subsOn(hard(false)), false);
  assert.equal(subsOn({ setup: { toggles: {} } }), true, 'older saves without the value behave as before');
});

test('the dark furniture exists as props and the alley and rooms still place them (so hiding must keep them in the save)', () => {
  for (const t of DARK_PROPS) { assert.ok(PROP_TYPES[t], t); assert.ok(isDarkProp(t)); }
  assert.ok(ROOMS.alley.props.some(p => p.type === 'corner'));
  assert.equal(isDarkProp('gardenbed'), false);
});

test('dark plants freeze while it is off: the others still grow, nothing is removed, and they resume where they stopped', () => {
  const beds = { a: newBed('carrot'), b: newBed('nightbloom') };
  beds.b.out = false; beds.b.lit = true;
  assert.equal(isDarkBed(beds.b), true); assert.equal(isDarkBed(beds.a), false);
  const { live, frozen } = splitBeds(beds, false);
  assert.deepEqual(Object.keys(live), ['a']); assert.deepEqual(Object.keys(frozen), ['b']);
  const after = { ...frozen, ...tickBeds(live, false) };
  assert.equal(after.b.grown, 0, 'frozen'); assert.ok(after.a.grown > 0, 'carrots still grow'); assert.equal(Object.keys(after).length, 2);
  assert.deepEqual(splitBeds(beds, true), { live: beds, frozen: {} }, 'on: everything grows');
  const back = tickBeds(splitBeds(after, true).live, false);
  assert.ok(back.b.grown > 0, 'resumes from where it froze');
});
