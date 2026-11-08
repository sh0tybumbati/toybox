// The mixing bench's ingredients. Everything is invented: no real substances, no real method — a puzzle of numbers.
export const ADDITIVES = {
  amber: { label: 'Amber resin',  icon: '🟠', price: 200, note: '+3 potency, a little less pure' },
  mint:  { label: 'Cooling mint', icon: '🌿', price: 120, note: '+10 purity, softer on the user' },
  cut:   { label: 'Cut powder',   icon: '🥄', price: 60,  note: 'Twice the units, much less pure' },
};
export const ADDITIVE_IDS = Object.keys(ADDITIVES);
export const MAX_ADDITIVES = 2;           // per batch
export const MAX_BATCH = 3;               // plants per batch
export const GOODS_CAP = 20;              // batches kept
export const MIX_MINUTES = 45;

// What a recipe is called (sorted additive ids joined by '+'); anything else is named after its first additive.
export const RECIPE_NAMES = {
  '': 'Plain nightbloom', amber: 'Amberdust', mint: 'Cool bloom', cut: 'Stepped bloom',
  'amber+mint': 'Amber frost', 'amber+cut': 'Brown bloom', 'cut+mint': 'Pale bloom',
};
