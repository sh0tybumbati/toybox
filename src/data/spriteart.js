// Hand-inked art for everything that isn't an item: pets, the bin, the coin, the little reaction faces and
// particles that float up, and the HUD/menu icons. Each entry is { box, weight, draw(pen) }: a drawing in a
// box x box square (128 for things that stand on the ground, 64 for icons), painted through the ink pen.
// systems/itemTextures.js turns them into textures. Flat matte colour, wobbly shapes, uneven outlines.
import { H } from './itemart.js';

const { e, c, r, t, poly, ln, tiny, dots, eyes } = H;
const { RED, ORANGE, YELLOW, GREEN, DKGREEN, BROWN, TAN, CREAM, WHITE, PINK, BLUE, PURPLE, GREY, DKGREY, CHOC } = H.COLORS;
const SKIN = 0xf7c9a6, INKC = 0x2a1f24, GOLD = 0xf0c040;

const big = draw => ({ box: 128, weight: 5.2, draw });
const small = draw => ({ box: 64, weight: 3.6, draw });

// A chubby, front-facing pet standing on y≈118: body, feet, face. o = { body, belly, ears(p), tail(p), extra(p) }
function pet(p, o) {
  if (o.tail) o.tail(p);
  e(p, 64, 92, 32, 25, o.body);
  e(p, 64, 98, 19, 15, o.belly || CREAM);
  e(p, 44, 112, 12, 7, o.body); e(p, 84, 112, 12, 7, o.body);
  if (o.ears) o.ears(p);
  e(p, 64, 54, 34, 30, o.body);
  if (o.extra) o.extra(p);
  e(p, 64, 64, 16, 12, o.belly || CREAM);
  eyes(p, 51, 77, 50, 3.8);
  tiny(p, () => e(p, 64, 59, 5.5, 3.6, o.nose || INKC));
  tiny(p, () => { ln(p, 64, 63, 64, 68, 2); ln(p, 56, 70, 64, 68, 2); ln(p, 72, 70, 64, 68, 2); });
}

export const SPRITE_ART = {
  // ---- pets ----
  'pet-dog': big(p => pet(p, { body: 0xd9a86a, ears: q => { e(q, 34, 52, 11, 24, 0x8a5a32); e(q, 94, 52, 11, 24, 0x8a5a32); }, tail: q => { poly(q, [[92, 100], [112, 76], [116, 86], [100, 106]], 0xd9a86a); }, extra: q => { e(q, 80, 44, 9, 8, 0x8a5a32); } })),
  'pet-cat': big(p => pet(p, { body: ORANGE, ears: q => { t(q, 36, 44, 40, 14, 58, 32, ORANGE); t(q, 92, 44, 88, 14, 70, 32, ORANGE); }, tail: q => { poly(q, [[92, 104], [118, 84], [122, 60], [112, 64], [110, 84], [92, 96]], ORANGE); }, extra: q => { tiny(q, () => { ln(q, 40, 60, 52, 62, 2); ln(q, 88, 60, 76, 62, 2); }); }, nose: PINK })),
  'pet-rabbit': big(p => pet(p, { body: 0xf0e6dc, ears: q => { e(q, 46, 22, 9, 26, 0xf0e6dc); e(q, 82, 22, 9, 26, 0xf0e6dc); tiny(q, () => { e(q, 46, 26, 4, 16, PINK); e(q, 82, 26, 4, 16, PINK); }); }, tail: q => c(q, 100, 104, 10, WHITE), nose: PINK })),
  'pet-hamster': big(p => pet(p, { body: 0xe6b67a, belly: WHITE, ears: q => { c(q, 42, 30, 10, 0xe6b67a); c(q, 86, 30, 10, 0xe6b67a); tiny(q, () => { c(q, 42, 30, 5, PINK); c(q, 86, 30, 5, PINK); }); }, extra: q => { e(q, 44, 50, 9, 9, 0xc99452); e(q, 84, 50, 9, 9, 0xc99452); }, nose: PINK })),
  'pet-chick': big(p => { e(p, 64, 82, 38, 34, YELLOW); poly(p, [[56, 52], [60, 38], [66, 50], [72, 36], [74, 52]], YELLOW); e(p, 40, 86, 12, 20, 0xf3c438); e(p, 88, 86, 12, 20, 0xf3c438); poly(p, [[56, 70], [72, 70], [64, 82]], ORANGE); eyes(p, 51, 77, 62, 3.8); ln(p, 54, 114, 54, 122, 4); ln(p, 74, 114, 74, 122, 4); tiny(p, () => { ln(p, 44, 120, 64, 120, 3); ln(p, 64, 120, 84, 120, 3); }); }),
  // ---- the bin ----
  bin: big(p => { poly(p, [[26, 40], [102, 40], [92, 114], [36, 114]], 0xa9c6d6); for (const x of [46, 64, 82]) tiny(p, () => ln(p, x, 44, x < 64 ? x + 2 : x > 64 ? x - 2 : x, 112, 2)); for (const y of [62, 84, 104]) tiny(p, () => ln(p, 32, y, 96, y, 2)); e(p, 64, 40, 40, 9, 0x8fb0c4); e(p, 64, 38, 33, 6, 0x6b7482); poly(p, [[44, 36], [56, 24], [70, 30], [62, 40]], CREAM); }),
  // ---- the coin and the little things that float up ----
  coin: small(p => { c(p, 32, 32, 25, GOLD); tiny(p, () => { c(p, 32, 32, 17, 0xf7d466); ln(p, 32, 22, 32, 42, 3); ln(p, 26, 28, 38, 28, 3); ln(p, 26, 38, 38, 38, 3); }); }),
  heart: small(p => poly(p, [[32, 56], [8, 32], [10, 16], [24, 10], [32, 20], [40, 10], [54, 16], [56, 32]], RED)),
  zzz: small(p => { poly(p, [[8, 38], [30, 38], [10, 56], [32, 56], [32, 62], [6, 62], [6, 56], [26, 44], [8, 44]], 0x8fa9e0); poly(p, [[34, 8], [52, 8], [36, 24], [54, 24], [54, 30], [30, 30], [30, 24], [46, 14], [34, 14]], 0xb9ccf2); }),
  sparkle: small(p => { poly(p, [[32, 4], [38, 26], [60, 32], [38, 38], [32, 60], [26, 38], [4, 32], [26, 26]], YELLOW); tiny(p, () => poly(p, [[52, 6], [55, 14], [62, 17], [55, 20], [52, 28], [49, 20], [42, 17], [49, 14]], 0xfff0a0)); }),
  fire: small(p => { poly(p, [[32, 4], [46, 22], [54, 40], [46, 58], [32, 62], [18, 58], [10, 40], [20, 28], [24, 40], [28, 22]], ORANGE); poly(p, [[32, 30], [42, 44], [38, 58], [26, 58], [22, 44]], YELLOW); }),
  laugh: small(p => { c(p, 32, 32, 26, SKIN); tiny(p, () => { ln(p, 18, 26, 26, 22, 3); ln(p, 38, 22, 46, 26, 3); poly(p, [[18, 36], [46, 36], [40, 50], [24, 50]], 0x8a2335); }); }),
  yum: small(p => { c(p, 32, 32, 26, SKIN); tiny(p, () => { ln(p, 18, 26, 26, 22, 3); ln(p, 38, 22, 46, 26, 3); poly(p, [[18, 36], [46, 36], [40, 50], [24, 50]], 0x8a2335); e(p, 38, 48, 7, 5, PINK); }); }),
  sour: small(p => { c(p, 32, 32, 26, 0xe8d56a); tiny(p, () => { ln(p, 16, 26, 28, 28, 3); ln(p, 36, 28, 48, 26, 3); ln(p, 22, 44, 28, 38, 3); ln(p, 28, 38, 36, 44, 3); ln(p, 36, 44, 42, 38, 3); }); }),
  spicy: small(p => { c(p, 32, 32, 26, 0xf07a5a); tiny(p, () => { c(p, 22, 26, 3.4, INKC); c(p, 42, 26, 3.4, INKC); ln(p, 16, 18, 26, 22, 3); ln(p, 48, 18, 38, 22, 3); poly(p, [[22, 38], [42, 38], [38, 52], [26, 52]], 0x8a2335); e(p, 32, 54, 6, 7, PINK); }); }),
  yuck: small(p => { c(p, 32, 32, 26, 0xa9d46a); tiny(p, () => { ln(p, 16, 28, 28, 26, 3); ln(p, 36, 26, 48, 28, 3); ln(p, 22, 46, 28, 40, 3); ln(p, 28, 40, 36, 46, 3); ln(p, 36, 46, 42, 40, 3); e(p, 44, 50, 4, 7, 0x7fb04a); }); }),
  marker: small(p => poly(p, [[32, 58], [8, 22], [22, 22], [22, 6], [42, 6], [42, 22], [56, 22]], YELLOW)),
  // ---- HUD and menu icons ----
  'icon-furniture': small(p => { r(p, 8, 24, 48, 26, 0x6aaee8, 10); r(p, 4, 32, 14, 24, 0x4a8fd8, 7); r(p, 46, 32, 14, 24, 0x4a8fd8, 7); r(p, 14, 18, 36, 20, 0x8cc4f4, 8); ln(p, 12, 56, 12, 62, 4); ln(p, 52, 56, 52, 62, 4); }),
  'icon-book': small(p => { poly(p, [[6, 14], [30, 18], [30, 56], [6, 52]], 0xd9a066); poly(p, [[58, 14], [34, 18], [34, 56], [58, 52]], 0xe8b878); tiny(p, () => { ln(p, 12, 24, 24, 26, 2); ln(p, 12, 32, 24, 34, 2); ln(p, 40, 26, 52, 24, 2); ln(p, 40, 34, 52, 32, 2); }); }),
  'icon-palette': small(p => { poly(p, [[10, 34], [14, 18], [30, 8], [48, 10], [58, 24], [52, 38], [40, 36], [34, 44], [38, 54], [24, 56], [12, 48]], 0xe8b878); dots(p, [[22, 24], [36, 18], [48, 26], [20, 38]], RED, 4.5); c(p, 36, 18, 4.5, BLUE); c(p, 48, 26, 4.5, GREEN); c(p, 20, 38, 4.5, YELLOW); }),
  'icon-broom': small(p => { ln(p, 52, 6, 28, 38, 6); poly(p, [[22, 34], [38, 38], [48, 60], [10, 58]], YELLOW); tiny(p, () => { ln(p, 20, 46, 24, 58, 2); ln(p, 30, 44, 32, 58, 2); ln(p, 38, 44, 40, 58, 2); }); }),
  'icon-sound': small(p => { poly(p, [[8, 24], [20, 24], [34, 10], [34, 54], [20, 40], [8, 40]], GREY); tiny(p, () => { ln(p, 42, 24, 46, 32, 4); ln(p, 46, 32, 42, 40, 4); ln(p, 48, 16, 56, 32, 4); ln(p, 56, 32, 48, 48, 4); }); }),
  'icon-mute': small(p => { poly(p, [[8, 24], [20, 24], [34, 10], [34, 54], [20, 40], [8, 40]], GREY); tiny(p, () => { ln(p, 42, 22, 58, 42, 5); ln(p, 58, 22, 42, 42, 5); }); }),
  'icon-map': small(p => { poly(p, [[6, 14], [22, 10], [42, 16], [58, 10], [58, 50], [42, 56], [22, 50], [6, 54]], 0xf3e6c0); tiny(p, () => { ln(p, 22, 10, 22, 50, 2); ln(p, 42, 16, 42, 56, 2); ln(p, 28, 36, 36, 30, 3); ln(p, 36, 30, 38, 40, 3); c(p, 46, 26, 4, RED); }); }),
  'icon-close': small(p => { poly(p, [[10, 18], [18, 10], [32, 24], [46, 10], [54, 18], [40, 32], [54, 46], [46, 54], [32, 40], [18, 54], [10, 46], [24, 32]], 0xe0453d); }),
  'icon-hammer': small(p => { ln(p, 14, 54, 38, 24, 7); poly(p, [[28, 10], [52, 10], [58, 26], [34, 30]], GREY); tiny(p, () => ln(p, 34, 16, 50, 16, 2)); }),
  'icon-door': small(p => { poly(p, [[14, 56], [14, 12], [40, 6], [50, 12], [50, 56]], 0xb98657); r(p, 20, 18, 24, 34, 0xd9a066, 4); c(p, 40, 36, 3.4, YELLOW); }),
  'icon-bed': small(p => { r(p, 6, 28, 52, 18, 0xf3ece0, 8); r(p, 6, 14, 10, 40, 0x9a6238, 4); r(p, 10, 22, 18, 12, WHITE, 6); r(p, 24, 28, 34, 18, 0x6aaee8, 8); ln(p, 56, 46, 56, 56, 4); }),
  'icon-plus': small(p => { poly(p, [[24, 8], [40, 8], [40, 24], [56, 24], [56, 40], [40, 40], [40, 56], [24, 56], [24, 40], [8, 40], [8, 24], [24, 24]], 0x4aa84a); }),
  'icon-pin': small(p => { poly(p, [[32, 60], [14, 32], [14, 16], [24, 6], [40, 6], [50, 16], [50, 32]], RED); c(p, 32, 24, 7, WHITE); }),
  'icon-minus': small(p => poly(p, [[8, 24], [56, 24], [56, 40], [8, 40]], 0xe0605a)),
  'icon-check': small(p => poly(p, [[8, 34], [18, 24], [26, 34], [48, 10], [58, 20], [26, 54]], 0x4aa84a)),
  'icon-dice': small(p => { r(p, 8, 8, 48, 48, WHITE, 12); dots(p, [[20, 20], [44, 20], [32, 32], [20, 44], [44, 44]], INKC, 4.5); }),
  'icon-lock': small(p => { poly(p, [[18, 28], [18, 18], [24, 8], [40, 8], [46, 18], [46, 28], [40, 28], [40, 18], [32, 14], [24, 18], [24, 28]], GREY); r(p, 10, 28, 44, 30, GOLD, 8); c(p, 32, 42, 5, INKC); }),
  'icon-ladder': small(p => { ln(p, 18, 6, 18, 60, 5); ln(p, 46, 6, 46, 60, 5); for (const y of [16, 30, 44]) ln(p, 18, y, 46, y, 4); }),
  'icon-elevator': small(p => { r(p, 8, 6, 48, 54, 0x6b7a99, 6); r(p, 14, 14, 17, 40, 0xc6cfe2, 3); r(p, 33, 14, 17, 40, 0xc6cfe2, 3); poly(p, [[32, 2], [38, 8], [26, 8]], GREEN); }),
  'icon-kid': small(p => { c(p, 32, 32, 24, SKIN); tiny(p, () => { c(p, 24, 32, 3.4, INKC); c(p, 40, 32, 3.4, INKC); ln(p, 28, 42, 32, 45, 3); ln(p, 32, 45, 36, 42, 3); }); poly(p, [[10, 26], [16, 10], [32, 6], [48, 10], [54, 26], [44, 18], [32, 22], [20, 18]], BROWN); }),
  'icon-grownup': small(p => { e(p, 32, 34, 20, 26, SKIN); tiny(p, () => { c(p, 25, 32, 3, INKC); c(p, 39, 32, 3, INKC); ln(p, 28, 46, 36, 46, 3); }); poly(p, [[10, 30], [14, 8], [32, 4], [50, 8], [54, 30], [46, 18], [32, 22], [18, 18]], CHOC); }),
  'icon-question': small(p => { poly(p, [[16, 20], [22, 8], [38, 6], [50, 16], [48, 30], [36, 38], [34, 44], [26, 44], [26, 34], [38, 28], [40, 20], [32, 14], [24, 18]], 0xb8aa94); c(p, 30, 56, 5, 0xb8aa94); }),
  'icon-feet': small(p => { e(p, 22, 42, 9, 14, 0x9a6238); e(p, 42, 24, 9, 14, 0x9a6238); dots(p, [[18, 26], [24, 24], [38, 8], [44, 6]], 0x9a6238, 3); }),
  'icon-hand': small(p => { poly(p, [[22, 58], [14, 36], [20, 30], [26, 38], [26, 10], [34, 10], [34, 30], [42, 28], [42, 36], [50, 36], [50, 58]], SKIN); }),
  arrow: small(p => poly(p, [[6, 22], [34, 22], [34, 6], [60, 32], [34, 58], [34, 42], [6, 42]], 0xfff3d0)),
  bobber: small(p => { c(p, 32, 34, 20, WHITE); poly(p, [[12, 34], [52, 34], [48, 22], [32, 14], [16, 22]], RED); ln(p, 32, 14, 32, 4, 4); }),
  basket: big(p => { poly(p, [[14, 54], [114, 54], [102, 112], [26, 112]], 0xd9a066); e(p, 64, 54, 50, 12, 0xe8b878); e(p, 64, 56, 40, 8, 0x8a5e3b); for (const x of [34, 56, 78, 98]) tiny(p, () => ln(p, x, 58, x - 4 + (x > 64 ? 4 : 0), 108, 2)); tiny(p, () => { ln(p, 24, 80, 104, 80, 2); ln(p, 20, 98, 108, 98, 2); }); }),
  sock: small(p => { poly(p, [[20, 6], [42, 6], [42, 34], [58, 44], [54, 58], [30, 54], [20, 38]], 0xe0605a); r(p, 18, 4, 28, 12, WHITE, 4); tiny(p, () => { ln(p, 26, 22, 40, 24, 2); ln(p, 26, 30, 40, 32, 2); }); }),
  marshmallow: small(p => { r(p, 12, 22, 40, 26, WHITE, 12); tiny(p, () => { ln(p, 26, 24, 26, 46, 2); ln(p, 40, 24, 40, 46, 2); }); }),
  star: small(p => poly(p, [[32, 4], [40, 24], [60, 24], [44, 38], [50, 58], [32, 46], [14, 58], [20, 38], [4, 24], [24, 24]], YELLOW)),
  moon: small(p => poly(p, [[40, 6], [26, 14], [18, 28], [20, 44], [32, 56], [48, 58], [58, 52], [44, 46], [36, 34], [38, 18]], 0xf7e27a)),
  'icon-trash': small(p => { poly(p, [[14, 18], [50, 18], [44, 58], [20, 58]], 0xa9c6d6); r(p, 10, 12, 44, 8, 0x8fb0c4, 4); r(p, 26, 6, 12, 8, 0x8fb0c4, 3); tiny(p, () => { ln(p, 26, 24, 26, 54, 2); ln(p, 38, 24, 38, 54, 2); }); }),
};

// Floating-reaction emoji -> the sprite that replaces them (used by floatText so old call sites keep working).
export const EMOJI_SPRITE = {
  '💖': 'heart', '💕': 'heart', '💞': 'heart', '❤️': 'heart', '💤': 'zzz', '✨': 'sparkle', '🔥': 'fire',
  '😄': 'laugh', '😋': 'yum', '😖': 'sour', '🥵': 'spicy', '🤢': 'yuck', '🪙': 'coin', '📖': 'icon-book', '🏗️': 'icon-hammer',
  '🔻': 'marker',
  // menu and HUD emoji -> drawn icons ('item:x' = that item's drawing)
  '🗺️': 'icon-map', '🛋️': 'icon-furniture', '➕': 'icon-plus', '➖': 'icon-minus', '✔': 'icon-check', '✖': 'icon-close', '✕': 'icon-close',
  '🗑': 'icon-trash', '🎲': 'icon-dice', '🔒': 'icon-lock', '📍': 'icon-pin', '🚪': 'icon-door', '🔨': 'icon-hammer', '🪜': 'icon-ladder',
  '🛗': 'icon-elevator', '🧒': 'icon-kid', '🧑': 'icon-grownup', '❓': 'icon-question', '👣': 'icon-feet', '👆': 'icon-hand', '🎨': 'icon-palette',
  '🌙': 'moon', '🧢': 'item:cap', '🍎': 'item:apple', '🍳': 'item:friedegg', '🧸': 'item:teddy',
};
