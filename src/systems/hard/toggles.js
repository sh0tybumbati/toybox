// The setup's content switches (docs/toggles-spec.md): what hides when "Substances and addiction" is off. Turning it off only hides and
// disables: nothing is deleted from the save, and turning it back on restores everything.
import { CROPS } from '../../data/hard/plants.js';

export const DARK_PROPS = ['corner', 'labbench'];                     // furniture that only exists for the dark trade
export const subsOn = hard => !hard || !hard.setup || hard.setup.toggles.substances !== false;
export const isDarkBed = bed => Boolean(bed && CROPS[bed.crop] && CROPS[bed.crop].dark);
export const isDarkProp = type => DARK_PROPS.includes(type);

// Beds split into the ones that grow and the dark ones frozen while the switch is off.
export function splitBeds(beds, on) {
  if (on) return { live: beds, frozen: {} };
  const live = {}, frozen = {};
  for (const [k, b] of Object.entries(beds)) (isDarkBed(b) ? frozen : live)[k] = b;
  return { live, frozen };
}
