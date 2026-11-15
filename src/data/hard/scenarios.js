// The starts you can pick for a hard-mode game (docs/hardcore-mode.md). Each is a city + where you begin + what you own.
// Money is in cash (1 coin = 100 cash). Later slices add needs, bills and the police; for now a scenario fixes the start.
import { SLOTS, newBuilding } from '../buildings.js';
import { listings } from '../../systems/hard/property.js';

const lots = (...list) => {
  const city = [...list, ...Array(SLOTS.length - list.length).fill(null)];
  for (const [slot, b] of listings()) if (!city[slot]) city[slot] = b;                        // houses on the market
  return city;
};
const named = (key, name) => ({ ...newBuilding(key), name });
// A building with extra furniture in one of its rooms (hard-mode homes get a shower, the park a water fountain).
const withExtra = (b, floor, room, ...props) => { const r = b.floors[floor].rooms[room]; r.extra = [...(r.extra || []), ...props]; return b; };
const park = name => withExtra(named('park', name), 0, 0,
  { type: 'fountain', x: 780, y: 540 }, { type: 'dumpster', x: 80, y: 540 }, { type: 'begspot', x: 200, y: 545 }, { type: 'labourboard', x: 520, y: 540 }, { type: 'worksite', x: 330, y: 545 });
const shop = name => withExtra(named('market', name), 0, 0, { type: 'newsstand', x: 830, y: 540 }, { type: 'phonekiosk', x: 240, y: 540 }, { type: 'worksite', x: 600, y: 545 });
export const shelter = () => withExtra(newBuilding('shelter'), 0, 0, { type: 'worksite', x: 850, y: 545 });
export const motel = () => withExtra(withExtra(newBuilding('motel'), 0, 0, { type: 'frontdesk', x: 480, y: 520 }), 0, 0, { type: 'mailbox', x: 200, y: 540 });
const office = () => withExtra(named('postoffice', 'Post Office'), 0, 0, { type: 'paydesk', x: 480, y: 520 }, { type: 'computer', x: 780, y: 540 }, { type: 'worksite', x: 200, y: 545 });
const mail = (b, floor, room) => withExtra(b, floor, room, { type: 'mailbox', x: 250, y: 540 });
const desk = (b, floor, room) => withExtra(b, floor, room, { type: 'computer', x: 640, y: 540 });
const door = (b, floor, room) => withExtra(b, floor, room, { type: 'frontdoor', x: 70, y: 440 });          // the leftmost room faces the road; a garden is at the back
const garden = b => { const f = b.floors[0].rooms; f.push({ id: f.length + 10, type: 'garden', w: 960, extra: [{ type: 'gardenbed', x: 300, y: 530 }, { type: 'gardenbed', x: 520, y: 530 }, { type: 'dumpster', x: 880, y: 540 }] }); return b; };
export const nursery = () => withExtra(newBuilding('nursery'), 0, 0, { type: 'worksite', x: 880, y: 545 });
export const council = () => withExtra(named('council', 'Council Hall'), 0, 0, { type: 'worksite', x: 300, y: 545 });
export const college = () => withExtra(named('college', 'College'), 0, 0, { type: 'classroom', x: 480, y: 520 });
export const bank = () => withExtra(newBuilding('bank'), 0, 0, { type: 'teller', x: 480, y: 520 });

export const SCENARIOS = {
  bench: {
    label: 'Park bench, nothing', blurb: 'You have what you are wearing. Sleep rough, find work, work your way up.',
    cash: 0, debt: 0, record: false, zone: '0.0', phone: false,
    city: () => lots(park('The Park'), shop('Corner Shop'), office(), shelter(), motel(), newBuilding('alley'), nursery(), bank(), council(), college()),
  },
  flat: {
    label: 'Cheap flat, first job', blurb: 'A small rented flat, the rent is due soon, and you need a job.',
    cash: 60000, debt: 0, record: false, zone: '0.0', home: { tier: 'flat', slot: 0 }, phone: true, food: ['bread', 'rice', 'egg', 'milk', 'potato'],
    city: () => lots(door(desk(mail(newBuilding('flat'), 0, 0), 0, 1), 0, 0), park('The Park'), shop('Corner Shop'), office(), shelter(), motel(), newBuilding('alley'), nursery(), bank(), council(), college()),
  },
  house: {
    label: 'Inherited house, debts', blurb: 'A big run-down house you cannot afford to keep. Repair it, sell it, or lose it.',
    cash: 10000, debt: 500000, record: false, zone: '0.0', home: { tier: 'house', slot: 0 }, phone: true, food: ['rice', 'potato', 'cheese'],
    city: () => lots(door(garden(desk(mail({ ...named('cottage', 'The Old House'), owned: true }, 0, 1), 0, 0)), 0, 0), park('The Park'), shop('Corner Shop'), office(), shelter(), motel(), newBuilding('alley'), nursery(), bank(), council(), college()),
  },
  jail: {
    label: 'Just out of jail', blurb: 'A record, a little cash and nowhere to go. Honest work is hard to find.',
    cash: 2500, debt: 0, record: true, zone: '0.0', phone: false,
    city: () => lots(park('The Park'), shop('Corner Shop'), office(), shelter(), motel(), newBuilding('alley'), nursery(), bank(), council(), college()),
  },
};
export const SCENARIO_IDS = Object.keys(SCENARIOS);

// A hard-mode city from before the town grew: add the bank and the houses for sale where there is room.
export function upgradeHardCity(city) {
  const out = [...city];
  if (!out.some(b => b && b.name === 'Bank')) { const at = out.findIndex(b => !b); if (at >= 0) out[at] = bank(); }
  for (const [name, make] of [['Council Hall', council], ['College', college]]) if (!out.some(b => b && b.name === name)) { const at = out.findIndex(b => !b); if (at >= 0) out[at] = make(); }
  const garden = out.find(b => b && b.floors[0].rooms[0].type === 'nursery');                 // the Garden Centre gets a place to work
  if (garden && !(garden.floors[0].rooms[0].extra || []).some(e => e.type === 'worksite')) withExtra(garden, 0, 0, { type: 'worksite', x: 880, y: 545 });
  for (const [slot, b] of listings()) if (!out[slot]) out[slot] = b;
  return out;
}
