// Characters are no longer hardcoded: the party lives in the save file and is
// edited in the creator. This module holds the defaults and the party limit.
import { DEFAULT_LOOK, NAMES } from './look.js';

export const MAX_PARTY = 6;
export const SLOT_X = [480, 370, 590, 260, 700, 150];     // where new characters are placed, in order

export const defaultParty = () => [{ id: 'kid', name: 'Kid', look: { ...DEFAULT_LOOK, hair: { ...DEFAULT_LOOK.hair } } }];

// First unused name from the pool (falls back to numbering).
export function freshName(party) {
  const used = new Set(party.map(c => c.name));
  return NAMES.find(n => !used.has(n)) || `Friend ${party.length + 1}`;
}

export function freshId(party) {
  let n = party.length + 1;
  while (party.some(c => c.id === `c${n}`)) n++;
  return `c${n}`;
}
