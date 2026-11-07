import test from 'node:test';
import assert from 'node:assert/strict';
import { CATCHES, pickCatch, stepFishing, BITE_WINDOW } from '../src/systems/fishing.js';
import { CATALOG } from '../src/data/items.js';

const fresh = extra => ({ phase: 'cast', t: 0, wait: 1, progress: 0, strain: 0, burst: 0, burstIn: 0.5, catch: CATCHES[0], ...extra });
const run = (s, secs, holding, rand = () => 0.5) => { let ev = null; for (let t = 0; t < secs && !ev; t += 1 / 60) ev = stepFishing(s, 1 / 60, holding, rand) || ev; return ev; };

test('every catch is a real item (or junk) and the odds favour the little ones', () => {
  for (const c of CATCHES) assert.ok(c.item === null || CATALOG[c.item], c.id);
  const counts = {};
  let seed = 0; const rand = () => { seed = (seed * 16807 + 11) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 4000; i++) { const c = pickCatch(rand); counts[c.id] = (counts[c.id] || 0) + 1; }
  assert.ok(counts.sardine > counts.trout && counts.trout > counts.golden, JSON.stringify(counts));
  assert.ok(counts.golden > 0 && counts.sock > 0);
});

test('a cast waits, nibbles, then bites — and you must tap within the window or it gets away', () => {
  const s = fresh();
  assert.equal(run(s, 3, false), 'bite');
  assert.equal(s.phase, 'bite');
  assert.equal(run(s, BITE_WINDOW + 0.2, false), 'missed');
  assert.equal(s.phase, 'idle');
});

test('holding the line lands the fish if you ease off when it strains, and snaps it if you never let go', () => {
  const s = fresh({ phase: 'reel', progress: 0.12 });
  assert.equal(run(s, 30, true), 'snap', 'never letting go snaps the line');
  const calm = fresh({ phase: 'reel', progress: 0.12 }); let landed = null;
  for (let t = 0; t < 60 && !landed; t += 1 / 60) {
    const hold = calm.strain < 0.55;                                   // a sensible player lets go before it snaps
    const ev = stepFishing(calm, 1 / 60, hold, () => 0.5);
    if (ev) landed = ev;
  }
  assert.equal(landed, 'caught');
});

test('a golden fish pulls harder than a sardine', () => {
  const gold = CATCHES.find(c => c.gold), small = CATCHES.find(c => c.id === 'sardine');
  const a = fresh({ phase: 'reel', catch: gold }), b = fresh({ phase: 'reel', catch: small });
  run(a, 1.2, true); run(b, 1.2, true);
  assert.ok(a.strain > b.strain);
});
