// The police (pure): how likely a stop or a raid is, what a search finds, what a bribe or a run costs, the charge, the plea and the trial.
// Randomness comes in as `rng` (0..1) so it is testable.
import { CROPS } from '../../data/hard/plants.js';
import { FIND, HEAT_LEVELS, LAWYER_PRICE, OFFICERS, SENTENCE_CAP } from '../../data/hard/police.js';
import { batchValue } from './lab.js';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const roundTo = (n, to) => Math.round(n / to) * to;

export const heatLevel = heat => HEAT_LEVELS.find(([min]) => heat >= min)[1];

// Per hour spent outdoors: the chance a patrol stops you.
export function stopChance(heat, { record = false, carrying = false, night = false } = {}) {
  if (heat < 15) return 0;
  return clamp((heat / 100) * 0.2 * (night ? 1.5 : 1) * (carrying ? 1.5 : 0.5) + (record ? 0.04 : 0), 0, 0.5);
}

// Per night: the chance of a raid on the home (only if there is something there to find).
export function raidChance(heat, { record = false, stash = false } = {}) {
  if (!stash || heat < 40) return 0;
  return clamp(((heat - 30) / 100) * 0.6 * (record ? 1.2 : 1), 0, 0.7);
}

export const officerFor = n => OFFICERS[Math.abs(Math.floor(n)) % OFFICERS.length];

// Which batches a search turns up. `list` = batches, `where` = 'carry' | 'home'. Returns the indexes in `goods`.
export function search(goods, where, hidden, rng) {
  const p = where === 'carry' ? (hidden ? FIND.carryHidden : FIND.carry) : (hidden ? FIND.homeHidden : FIND.home);
  return goods.map((g, i) => (g.at === where && rng() < p ? i : -1)).filter(i => i >= 0);
}

export const valueOf = (goods, idx) => idx.reduce((n, i) => n + batchValue(goods[i]), 0);
export const unitsOf = (goods, idx) => idx.reduce((n, i) => n + goods[i].units, 0);

export const bribeCost = (value, record) => Math.max(500, roundTo((600 + 0.2 * value) * (record ? 1.5 : 1), 100));
export const bribeChance = (officer, heat) => clamp(0.7 - officer.strict * 0.5 - (heat >= 70 ? 0.2 : 0), 0.1, 0.8);
export const runChance = heat => clamp(0.5 - heat / 300, 0.15, 0.5);

// The charge for what was found: { label, days, fine } (days of jail, cash fine).
export function charge({ units = 0, value = 0, plants = false, resisting = false, bribed = false, record = false }) {
  const dealing = units >= 8 || value >= 20000;
  const parts = [];
  let days = 0;
  if (units > 0) { days += dealing ? 4 + units : 1 + Math.floor(units / 2); parts.push(dealing ? 'dealing' : 'possession'); }
  if (plants) { days += 5; parts.push('cultivation'); }
  if (resisting) { days += 3; parts.push('resisting'); }
  if (bribed) { days += 2; parts.push('bribery'); }
  if (record) days += 2;
  return { label: parts.join(' + ') || 'nothing', days: clamp(days, 0, SENTENCE_CAP), fine: roundTo(value * 0.25, 100) };
}

export const pleaDeal = c => ({ ...c, days: Math.ceil(c.days * 0.6), fine: roundTo(c.fine * 0.6, 100) });
export function trialOdds({ lawyer = false, units = 0, record = false }) {
  return clamp(0.2 + (lawyer ? 0.3 : 0) + (units <= 2 ? 0.1 : 0) - (record ? 0.1 : 0), 0.05, 0.7);
}
export const lost = c => ({ ...c, days: clamp(Math.ceil(c.days * 1.4), 0, SENTENCE_CAP), fine: roundTo(c.fine * 1.3, 100) });
export { LAWYER_PRICE };

// What an arrest takes off you: carried batches always; home batches too after a raid. Returns the goods that remain.
export const seize = (goods, where) => goods.filter(g => !where.includes(g.at));

// A dark plant in a bed or the stash is evidence of cultivation.
export const hasPlants = (beds, raw) => Object.values(beds).some(b => CROPS[b.crop] && CROPS[b.crop].dark) || Object.entries(raw).some(([id, n]) => n > 0 && CROPS[id] && CROPS[id].dark);
