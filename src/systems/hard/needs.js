// Needs (pure): hunger, energy, hygiene, mood, each 0..100 where 100 is fine. They decay with game time; actions restore them.
import { DECAY, FLOOR_SLEEP, LOW, LOW_MOOD_COST, NEEDS, SLEEP_DECAY, START_NEEDS, WANTS } from '../../data/hard/needs.js';

const clamp = v => Math.max(0, Math.min(100, v));

export const newNeeds = () => ({ ...START_NEEDS });

// Let `minutes` of game time pass. state = { sleeping: 'bed' | 'floor' | false }.
export function tick(n, minutes, { sleeping = false } = {}) {
  const rate = sleeping === 'bed' ? SLEEP_DECAY : sleeping ? FLOOR_SLEEP : DECAY, h = minutes / 60;
  const low = ['hunger', 'energy', 'hygiene'].filter(k => n[k] < LOW).length;
  for (const k of NEEDS) n[k] = clamp(n[k] + rate[k] * h);
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
  dirty: n.hygiene < LOW, miserable: n.mood < LOW,
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
