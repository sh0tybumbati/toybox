// The police (docs/hardcore-mode.md): numbers for stops, raids, charges and sentences. All of it is a game, with invented officers.
export const OFFICERS = [
  { name: 'Officer Brandt', strict: 0.8, line: 'Evening. Mind if I take a look?' },
  { name: 'Officer Ilves',  strict: 0.4, line: 'Hold up a second, friend.' },
  { name: 'Officer Moreau', strict: 0.2, line: 'Quiet night. Let us see what you have.' },
  { name: 'Sergeant Pike',  strict: 0.9, line: 'You. Stop there. Empty your pockets.' },
];
export const HEAT_LEVELS = [[70, 'hunted'], [40, 'watched'], [20, 'noticed'], [0, 'calm']];
export const FIND = { carry: 0.8, carryHidden: 0.35, home: 0.9, homeHidden: 0.3 };    // chance each batch is found
export const HIDES = {
  bag:  { label: 'False-bottom bag', icon: '🎒', price: 900,  note: 'Searches miss what you carry far more often' },
  safe: { label: 'Hidden floor safe', icon: '🗄️', price: 3000, note: 'Raids miss what you keep at home far more often' },
};
export const HIDE_IDS = Object.keys(HIDES);
export const SENTENCE_CAP = 28;            // days: a season
export const LAWYER_PRICE = 6000;
export const RECOVER_HEAT = 25;            // how much attention is left when you come out
