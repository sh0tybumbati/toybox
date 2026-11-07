// Face recipes. `eyes`: open | wide | squint | half | happy (^ ^) | closed (u u);
// `brows`: none | up | worried | angry; `mouth`: smile | grin | open | tongue | o | flat | frown | wavy;
// `tint`: optional [colour, alpha] wash over the face.
export const EXPRESSIONS = {
  neutral:   { eyes: 'open',  brows: 'none',    mouth: 'smile' },
  hungry:    { eyes: 'wide',  brows: 'up',      mouth: 'open' },
  chew:      { eyes: 'open',  brows: 'none',    mouth: 'open' },
  surprised: { eyes: 'wide',  brows: 'up',      mouth: 'o' },
  giggle:    { eyes: 'happy', brows: 'none',    mouth: 'grin' },
  sleepy:    { eyes: 'half',  brows: 'none',    mouth: 'flat' },
  asleep:    { eyes: 'closed', brows: 'none',   mouth: 'smile' },
  // food reactions
  yum:       { eyes: 'happy', brows: 'none',    mouth: 'grin' },
  sour:      { eyes: 'squint', brows: 'worried', mouth: 'wavy' },
  spicy:     { eyes: 'wide',  brows: 'angry',   mouth: 'tongue', tint: [0xff3b2f, 0.4] },
  yuck:      { eyes: 'half',  brows: 'worried', mouth: 'frown', tint: [0x9acd32, 0.3] },
};

// Vertical eye openness per eye style (multiplied with the blink).
export const EYE_OPEN = { open: 1, wide: 1.2, squint: 0.25, half: 0.5, happy: 0, closed: 0 };

// How a food makes the character feel. `grow`: yummy foods make them a bit bigger.
export const REACTIONS = {
  yum:   { expression: 'yum',   emoji: '😋', sfx: 'crunch', grow: true },
  sour:  { expression: 'sour',  emoji: '😖', sfx: 'sour' },
  spicy: { expression: 'spicy', emoji: '🥵', sfx: 'spicy', extra: '🔥' },
  yuck:  { expression: 'yuck',  emoji: '🤢', sfx: 'yuck' },
};
