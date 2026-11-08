// The mixing bench (pure): a batch of harvested plants plus up to two additives becomes a named product with
// potency, purity, units and a street value. All of it is invented; the numbers are what the customers will care about.
import { CROPS } from '../../data/hard/plants.js';
import { ADDITIVES, ADDITIVE_IDS, GOODS_CAP, MAX_ADDITIVES, MAX_BATCH, RECIPE_NAMES } from '../../data/hard/lab.js';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// The product of `count` plants of `crop` mixed with the additive ids `adds` (distinct, at most two). Null if it is not a legal batch.
export function mix(crop, count, adds = []) {
  const c = CROPS[crop];
  if (!c || !c.dark || !Number.isInteger(count) || count < 1 || count > MAX_BATCH) return null;
  const list = [...new Set(adds)].filter(a => ADDITIVES[a]).sort();
  if (list.length !== adds.length || list.length > MAX_ADDITIVES) return null;
  let potency = c.potency, purity = c.purity, units = count;
  const effects = [];
  for (const a of list) {
    if (a === 'amber') { potency += 3; purity -= 5; }
    if (a === 'mint') { purity += 10; effects.push('calm'); }
    if (a === 'cut') { units *= 2; purity -= 30; }
  }
  purity = clamp(purity, 5, 100);
  return { crop, name: RECIPE_NAMES[list.join('+')] || RECIPE_NAMES[list[0]], potency, purity, units, effects, adds: list };
}

// What one unit would fetch on the street: potency raises it, impurity lowers it.
export const unitValue = (p, base = CROPS[p.crop].value) => Math.round(base * (p.potency / CROPS[p.crop].potency) * (0.4 + 0.6 * p.purity / 100) / 10) * 10;
export const batchValue = p => unitValue(p) * p.units;

// Stocks as { id: n }: spend what a batch needs, or null if it is not there.
export function spend(raw, adds, crop, count, list) {
  if ((raw[crop] || 0) < count) return null;
  for (const a of list) if (!(adds[a] > 0)) return null;
  const nextAdds = { ...adds };
  for (const a of list) nextAdds[a] -= 1;
  return { raw: { ...raw, [crop]: raw[crop] - count }, adds: nextAdds };
}

export function cleanGoods(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(g => g && CROPS[g.crop] && CROPS[g.crop].dark && Number.isFinite(g.potency) && Number.isFinite(g.purity) && Number.isFinite(g.units) && g.units > 0).slice(0, GOODS_CAP).map(g => {
    const adds = (Array.isArray(g.adds) ? g.adds : []).filter(a => ADDITIVE_IDS.includes(a)).slice(0, MAX_ADDITIVES);
    return { crop: g.crop, at: g.at === 'carry' ? 'carry' : 'home', name: String(g.name || 'Product').slice(0, 24), potency: clamp(Math.floor(g.potency), 1, 30), purity: clamp(Math.floor(g.purity), 5, 100), units: clamp(Math.floor(g.units), 1, 12), effects: (Array.isArray(g.effects) ? g.effects : []).filter(e => e === 'calm'), adds };
  });
}
