// What the Garden Centre sells (docs/hardcore-mode.md, "Gardening and the plant trade"). Legal crops grow into ordinary food;
// seeds and gear are kept in the household's stores. Prices are cash.
export const CROPS = {
  carrot:  { label: 'Carrot',  icon: '🥕', days: 4, yield: 5, seed: 30 },
  tomato:  { label: 'Tomato',  icon: '🍅', days: 5, yield: 4, seed: 40 },
  potato:  { label: 'Potato',  icon: '🥔', days: 6, yield: 6, seed: 45 },
  berry:   { label: 'Berry',   icon: '🫐', days: 7, yield: 6, seed: 80 },
  corn:    { label: 'Corn',    icon: '🌽', days: 8, yield: 5, seed: 60 },
  // Invented and illegal: sold only in the alley, grows only indoors under a lamp, and is not food.
  nightbloom: { label: 'Nightbloom', icon: '🌑', days: 14, yield: 3, seed: 900, dark: true, potency: 6, purity: 85, value: 1200 },
};
export const CROP_IDS = Object.keys(CROPS);
export const LEGAL_IDS = CROP_IDS.filter(id => !CROPS[id].dark);

export const GEAR = {
  fert: { label: 'Fertiliser', icon: '🧪', price: 100, note: 'One bed grows one extra crop' },
};
export const GROW = {                 // grow gear: furniture you set up from the catalogue (it comes back if you take it down)
  pot:  { label: 'Plant pot',  icon: '🪴', price: 300,  note: 'Grows anywhere with light; a small crop', prop: 'growpot' },
  tent: { label: 'Grow tent',  icon: '⛺', price: 4500, note: 'Indoors, needs a lamp; a double crop', prop: 'growtent' },
  lamp: { label: 'Grow lamp',  icon: '💡', price: 1800, note: 'Lights a pot or tent in its room; costs power', prop: 'growlamp' },
};
Object.assign(GEAR, GROW);
export const PLOTS = {                // what a plot prop does: sun/rain outdoors, a lamp indoors, how big the crop is
  gardenbed: { mult: 1, open: true },
  growpot:   { mult: 0.6, open: true },
  growtent:  { mult: 2, open: false },
};
export const POWER_DAY = 60;          // cash a day added to the power bill for each lit indoor plot with something growing
GEAR.bench = { label: 'Mixing bench', icon: '⚗️', price: 2500, note: 'Turns harvests into product', prop: 'labbench', sold: 'alley' };
export const GEAR_IDS = Object.keys(GEAR);

export const GARDEN_HOURS = [[8, 18]];
export const BED_CAP = 12;               // plots in a household's gardens (the save keeps this many)
