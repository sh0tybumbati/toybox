// The starts you can pick for a hard-mode game (docs/hardcore-mode.md). Each is a city + where you begin + what you own.
// Money is in cash (1 coin = 100 cash). Later slices add needs, bills and the police; for now a scenario fixes the start.
import { SLOTS, newBuilding } from '../buildings.js';

const lots = (...list) => [...list, ...Array(SLOTS.length - list.length).fill(null)];
const named = (key, name) => ({ ...newBuilding(key), name });
// A building with extra furniture in one of its rooms (hard-mode homes get a shower, the park a water fountain).
const withExtra = (b, floor, room, ...props) => { const r = b.floors[floor].rooms[room]; r.extra = [...(r.extra || []), ...props]; return b; };
const park = name => withExtra(named('park', name), 0, 0,
  { type: 'fountain', x: 780, y: 540 }, { type: 'dumpster', x: 80, y: 540 }, { type: 'begspot', x: 200, y: 545 }, { type: 'labourboard', x: 520, y: 540 });
const shop = name => withExtra(named('market', name), 0, 0, { type: 'dumpster', x: 100, y: 540 });
const shelter = () => newBuilding('shelter');
const shower = (b, floor, room) => withExtra(b, floor, room, { type: 'shower', x: 860, y: 540 });

export const SCENARIOS = {
  bench: {
    label: 'Park bench, nothing', blurb: 'You have what you are wearing. Sleep rough, find work, work your way up.',
    cash: 0, debt: 0, record: false, zone: '0.0',
    city: () => lots(park('The Park'), shop('Corner Shop'), named('postoffice', 'Post Office'), shelter()),
  },
  flat: {
    label: 'Cheap flat, first job', blurb: 'A small rented flat, the rent is due soon, and you need a job.',
    cash: 60000, debt: 0, record: false, zone: '0.0',
    city: () => lots(shower(newBuilding('flat'), 0, 1), park('The Park'), shop('Corner Shop'), named('postoffice', 'Post Office'), shelter()),
  },
  house: {
    label: 'Inherited house, debts', blurb: 'A big run-down house you cannot afford to keep. Repair it, sell it, or lose it.',
    cash: 10000, debt: 500000, record: false, zone: '0.0',
    city: () => lots(shower(named('cottage', 'The Old House'), 0, 2), park('The Park'), shop('Corner Shop'), named('postoffice', 'Post Office'), shelter()),
  },
  jail: {
    label: 'Just out of jail', blurb: 'A record, a little cash and nowhere to go. Honest work is hard to find.',
    cash: 2500, debt: 0, record: true, zone: '0.0',
    city: () => lots(park('The Park'), shop('Corner Shop'), named('postoffice', 'Post Office'), shelter()),
  },
};
export const SCENARIO_IDS = Object.keys(SCENARIOS);
