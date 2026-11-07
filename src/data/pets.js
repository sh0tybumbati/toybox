// Pets: little companions that wander, follow the kids and love a cuddle.
// `emoji` is the pet; `cry` names the sfx it makes when petted (see systems/sfx.js).
export const PETS = {
  dog:     { name: 'Puppy',   emoji: '🐶', cry: 'bark' },
  cat:     { name: 'Kitten',  emoji: '🐱', cry: 'mew' },
  rabbit:  { name: 'Bunny',   emoji: '🐰', cry: 'squeak' },
  hamster: { name: 'Hamster', emoji: '🐹', cry: 'squeak' },
  chick:   { name: 'Chick',   emoji: '🐥', cry: 'chirp' },
};
export const PET_KINDS = Object.keys(PETS);
export const MAX_PETS = 3;
