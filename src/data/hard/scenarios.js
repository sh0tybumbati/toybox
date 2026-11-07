// The starts you can pick for a hard-mode game (docs/hardcore-mode.md). Each is a city + where you begin + what you own.
// Money is in cash (1 coin = 100 cash). Later slices add needs, bills and the police; for now a scenario fixes the start.
import { SLOTS, newBuilding } from '../buildings.js';

const lots = (...list) => [...list, ...Array(SLOTS.length - list.length).fill(null)];
const named = (key, name) => ({ ...newBuilding(key), name });

export const SCENARIOS = {
  bench: {
    label: 'Park bench, nothing', blurb: 'You have what you are wearing. Sleep rough, find work, work your way up.',
    cash: 0, debt: 0, record: false, zone: '0.0',
    city: () => lots(named('park', 'The Park'), named('market', 'Corner Shop'), named('postoffice', 'Post Office')),
  },
  flat: {
    label: 'Cheap flat, first job', blurb: 'A small rented flat, the rent is due soon, and you need a job.',
    cash: 60000, debt: 0, record: false, zone: '0.0',
    city: () => lots(newBuilding('flat'), named('park', 'The Park'), named('market', 'Corner Shop'), named('postoffice', 'Post Office')),
  },
  house: {
    label: 'Inherited house, debts', blurb: 'A big run-down house you cannot afford to keep. Repair it, sell it, or lose it.',
    cash: 10000, debt: 500000, record: false, zone: '0.0',
    city: () => lots(named('cottage', 'The Old House'), named('park', 'The Park'), named('market', 'Corner Shop'), named('postoffice', 'Post Office')),
  },
  jail: {
    label: 'Just out of jail', blurb: 'A record, a little cash and nowhere to go. Honest work is hard to find.',
    cash: 2500, debt: 0, record: true, zone: '0.0',
    city: () => lots(named('park', 'The Park'), named('market', 'Corner Shop'), named('postoffice', 'Post Office')),
  },
};
export const SCENARIO_IDS = Object.keys(SCENARIOS);
