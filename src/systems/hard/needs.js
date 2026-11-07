// Needs (pure): hunger, energy, hygiene, mood, each 0..100 where 100 is fine. They decay with game time; actions restore them.
import { BENCH_SLEEP, DECAY, FLOOR_SLEEP, LOW, LOW_MOOD_COST, NEEDS, SLEEP_DECAY, START_NEEDS, WANTS, WARM } from '../../data/hard/needs.js';

const clamp = v => Math.max(0, Math.min(100, v));

export const newNeeds = () => ({ ...START_NEEDS });

// How fast warmth changes per game hour in this weather. env = { outdoors, temp, kind } (undefined = no weather effects).
export function warmthRate(env, sleeping) {
  if (!env) return 0;
  if (!env.outdoors) return WARM.indoor;
  let r = env.temp >= WARM.comfortableFrom ? WARM.outdoorWarm : -(WARM.comfortableFrom - env.temp) * WARM.coldPerDegree;
  if (env.kind === 'rain') r -= WARM.rain;
  if (env.kind === 'snow') r -= WARM.snow;
  return sleeping && r < 0 ? r * WARM.sleepingOutside : r;
}

// Let `minutes` of game time pass. state = { sleeping: 'bed' | 'bench' | 'floor' | false, env }.
export function tick(n, minutes, { sleeping = false, env } = {}) {
  const rate = sleeping === 'bed' ? SLEEP_DECAY : sleeping === 'bench' ? BENCH_SLEEP : sleeping ? FLOOR_SLEEP : DECAY, h = minutes / 60;
  const low = ['hunger', 'energy', 'hygiene', 'warmth'].filter(k => n[k] < LOW).length;
  for (const k of NEEDS) n[k] = clamp(n[k] + rate[k] * h);
  if (env) n.warmth = clamp(n.warmth + warmthRate(env, sleeping) * h);
  if (!sleeping) n.mood = clamp(n.mood - low * LOW_MOOD_COST * h);                     // being hungry, tired or filthy wears you down
  return n;
}

// Add `effects` ({ hunger: +20, ... }) once.
export function apply(n, effects) {
  for (const [k, v] of Object.entries(effects)) if (k in n) n[k] = clamp(n[k] + v);
  return n;
}

// What is wrong right now (for icons, faces and debuffs).
export const status = n => ({
  hungry: n.hunger < LOW, starving: n.hunger <= 0,
  tired: n.energy < LOW, exhausted: n.energy <= 0,
  dirty: n.hygiene < LOW, cold: n.warmth < LOW, freezing: n.warmth <= 0, miserable: n.mood < LOW,
});

// What would this person like to do on their own? `can` = the actions that have somewhere to happen here
// (e.g. { eat: true, sleep: true }). Returns an action id or null. The most urgent want below its threshold wins.
export function wantsToDo(n, can) {
  let best = null, score = 0;
  for (const [action, w] of Object.entries(WANTS)) {
    if (!can[action]) continue;
    const s = (w.at - n[w.need]) * w.weight;
    if (s > score) { best = action; score = s; }
  }
  return best;
}

export function cleanNeeds(raw) {
  const out = newNeeds();
  if (raw && typeof raw === 'object') for (const k of NEEDS) if (Number.isFinite(raw[k])) out[k] = clamp(raw[k]);
  return out;
}
