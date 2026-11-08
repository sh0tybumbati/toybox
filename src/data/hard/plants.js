// What the Garden Centre sells (docs/hardcore-mode.md, "Gardening and the plant trade"). Legal crops grow into ordinary food;
// seeds and gear are kept in the household's stores. Prices are cash.
export const CROPS = {
  carrot:  { label: 'Carrot',  icon: '🥕', days: 4, yield: 5, seed: 30 },
  tomato:  { label: 'Tomato',  icon: '🍅', days: 5, yield: 4, seed: 40 },
  potato:  { label: 'Potato',  icon: '🥔', days: 6, yield: 6, seed: 45 },
  berry:   { label: 'Berry',   icon: '🫐', days: 7, yield: 6, seed: 80 },
  corn:    { label: 'Corn',    icon: '🌽', days: 8, yield: 5, seed: 60 },
};
export const CROP_IDS = Object.keys(CROPS);

export const GEAR = {
  fert: { label: 'Fertiliser', icon: '🧪', price: 100, note: 'One bed grows one extra crop' },
};
export const GEAR_IDS = Object.keys(GEAR);

export const GARDEN_HOURS = [[8, 18]];
export const BED_CAP = 6;               // plots in a household's gardens (the save keeps this many)
