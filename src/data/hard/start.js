// A brand-new hard-mode save for a chosen setup: the scenario's city and start, one adult, its cash and debt.
import { DEFAULT_LOOK } from '../look.js';
import { SCENARIOS } from './scenarios.js';
import { cleanSetup } from '../../systems/mode.js';
import { sanitize } from '../../systems/save.js';
import { newHome } from '../../systems/hard/bills.js';
import { addFood } from '../../systems/hard/pantry.js';
import { LARDER_CAP } from '../hard/food.js';
import { newClock } from '../../systems/hard/clock.js';
import { SCENARIO_IDS } from './scenarios.js';
import { newCredit } from '../../systems/hard/credit.js';
import { START_SCORE } from './credit.js';

export function newHardSave(rawSetup) {
  const setup = cleanSetup(rawSetup, SCENARIO_IDS), sc = SCENARIOS[setup.scenario];
  return sanitize({
    v: 13, zone: sc.zone, city: sc.city(), coins: 0,
    characters: [{ id: 'adult1', name: 'You', look: { ...DEFAULT_LOOK, age: 'adult', hair: { ...DEFAULT_LOOK.hair } }, worn: {} }],
    hard: { setup, credit: newCredit(START_SCORE[setup.scenario]), cash: sc.cash, debt: sc.debt, record: sc.record, fresh: true, phone: Boolean(sc.phone), larder: (sc.food || []).reduce((list, k) => addFood(list, k, newClock().minute, LARDER_CAP) || list, []), home: sc.home ? newHome(sc.home.tier, sc.home.slot, 0) : null },
  });
}
