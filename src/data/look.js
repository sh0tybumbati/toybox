// What a character looks like. Pure data + drawing recipes (the hair functions take a Phaser
// Graphics and a head ellipse { x, y, rx, ry } but know nothing else about Phaser, so this module is testable).
// Hair is hand-inked: flat matte colour, a wobbly dark outline and a choppy fringe (art/reference/).
import { blob, inkFill, inkStroke, INK } from './ink.js';
import { AGES } from './body.js';
import { PATTERNS } from './patterns.js';

export const SKIN_TONES = [0xffe6d0, 0xffd9a8, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0x5e3a1e, 0xb5ead7, 0xd0c1ff];
export const HAIR_COLORS = [0x2b1b12, 0x6b4226, 0xb5651d, 0xe8c15a, 0xdcdcdc, 0xc0392b, 0x3b6fd4, 0xe667a8];
export const SHIRT_COLORS = [0x6ec6ff, 0xff9f68, 0xff6b8b, 0x7bd88f, 0xffd166, 0xb28dff, 0x4a4e69, 0xf4f4f4];
export const PANTS_COLORS = [0x3b6fb4, 0x4a8f8b, 0x8a5aa8, 0x7a3b2e, 0x4a4e69, 0xd98fb0];
export const SHOE_COLORS = [0x3b5b8c, 0x7a3b2e, 0x222222, 0xd64545, 0x2e7d5b, 0xf0c030];
export const NAMES = ['Kid', 'Pal', 'Bean', 'Pip', 'Moxie', 'Juno', 'Sunny', 'Beau', 'Dot', 'Fig'];

const W = 4;                                              // ink weight of hair outlines
const pt = (h, a, k = 1, kk = 1) => ({ x: h.x + Math.cos(a) * h.rx * k, y: h.y + Math.sin(a) * h.ry * (kk === 1 ? k : kk) });

// The top of the head from the left temple over to the right temple.
const arcTop = (h, k = 1.05, steps = 12, a0 = 1.0, a1 = 2.0) => [...Array(steps + 1)].map((_, i) => pt(h, (a0 + (a1 - a0) * (i / steps)) * Math.PI, k));

// A choppy fringe across the forehead, right to left: jagged teeth, like the reference sheet.
function fringe(h, teeth = 6, depth = 0.34, seedShift = 0) {
  const out = [], y0 = h.y - h.ry * 0.56, x0 = h.x + h.rx * 0.96, x1 = h.x - h.rx * 0.96;
  for (let i = 0; i <= teeth; i++) {
    const x = x0 + (x1 - x0) * (i / teeth), low = i % 2 === 1;
    out.push({ x, y: y0 + (low ? h.ry * depth * (0.8 + 0.4 * ((i * 7 + seedShift) % 5) / 5) : h.ry * 0.04) });
  }
  return out;
}
const cap = (h, opts = {}) => [...arcTop(h, opts.k || 1.05), ...fringe(h, opts.teeth || 6, opts.depth || 0.34, opts.shift || 0)];
const none = () => {};

export const HAIR_STYLES = {
  none:     { label: 'Bald',     back: none, front: none },
  short:    { label: 'Short',    back: none, front: (g, c, h) => inkFill(g, cap(h), c, { w: W, seed: 2 }) },
  bob:      { label: 'Bob',
    back: (g, c, h) => inkFill(g, [...arcTop(h, 1.12), { x: h.x + h.rx * 1.12, y: h.y + h.ry * 0.62 }, { x: h.x + h.rx * 0.7, y: h.y + h.ry * 0.7 }, { x: h.x - h.rx * 0.7, y: h.y + h.ry * 0.7 }, { x: h.x - h.rx * 1.12, y: h.y + h.ry * 0.62 }], c, { w: W, seed: 5 }),
    front: (g, c, h) => inkFill(g, cap(h, { depth: 0.4, teeth: 7 }), c, { w: W, seed: 6 }) },
  spiky:    { label: 'Messy',    back: none, front: (g, c, h) => {
    const top = [...Array(9)].map((_, i) => { const a = (1.04 + i * 0.115) * Math.PI, k = i % 2 ? 1.0 : 1.3; return pt(h, a, k); });
    inkFill(g, [...top, ...fringe(h, 6, 0.4, 2)], c, { w: W, seed: 8 });
  } },
  long:     { label: 'Long',
    back: (g, c, h) => inkFill(g, [...arcTop(h, 1.12), { x: h.x + h.rx * 1.18, y: h.y + h.ry * 1.55 }, { x: h.x + h.rx * 0.2, y: h.y + h.ry * 1.7 }, { x: h.x - h.rx * 0.5, y: h.y + h.ry * 1.62 }, { x: h.x - h.rx * 1.18, y: h.y + h.ry * 1.55 }], c, { w: W, seed: 9 }),
    front: (g, c, h) => inkFill(g, cap(h, { depth: 0.42 }), c, { w: W, seed: 10 }) },
  pigtails: { label: 'Pigtails',
    back: (g, c, h) => {
      inkFill(g, blob(h.x - h.rx * 1.12, h.y + h.ry * 0.35, h.rx * 0.3, h.ry * 0.38, { n: 14, seed: 11 }), c, { w: W, seed: 11 });
      inkFill(g, blob(h.x + h.rx * 1.12, h.y + h.ry * 0.35, h.rx * 0.3, h.ry * 0.38, { n: 14, seed: 12 }), c, { w: W, seed: 12 });
    },
    front: (g, c, h) => inkFill(g, cap(h), c, { w: W, seed: 13 }) },
  bun:      { label: 'Bun',
    back: (g, c, h) => inkFill(g, blob(h.x, h.y - h.ry * 1.08, h.rx * 0.34, h.ry * 0.3, { n: 14, seed: 14 }), c, { w: W, seed: 14 }),
    front: (g, c, h) => inkFill(g, cap(h), c, { w: W, seed: 15 }) },
  curly:    { label: 'Curly',    back: none, front: (g, c, h) => {
    for (let i = 0; i < 9; i++) {
      const a = (1.02 + i * 0.12) * Math.PI;
      inkFill(g, blob(h.x + Math.cos(a) * h.rx * 0.98, h.y + Math.sin(a) * h.ry * 0.98, h.rx * 0.27, h.ry * 0.27, { n: 12, seed: 20 + i }), c, { w: 3.2, seed: 20 + i, heavy: 0 });
    }
    inkFill(g, [...arcTop(h, 0.96, 10, 1.1, 1.9), ...fringe(h, 5, 0.3, 1)], c, { w: 0.01, seed: 30, heavy: 0 });
    inkStroke(g, fringe(h, 5, 0.3, 1), { w: 3.4, seed: 31, heavy: 1 });
  } },
  mohawk:   { label: 'Mohawk',   back: none, front: (g, c, h) => {
    const pts = [{ x: h.x - h.rx * 0.2, y: h.y - h.ry * 0.9 }, { x: h.x - h.rx * 0.3, y: h.y - h.ry * 1.5 }, { x: h.x - h.rx * 0.05, y: h.y - h.ry * 1.25 }, { x: h.x + h.rx * 0.05, y: h.y - h.ry * 1.7 }, { x: h.x + h.rx * 0.2, y: h.y - h.ry * 1.25 }, { x: h.x + h.rx * 0.32, y: h.y - h.ry * 1.45 }, { x: h.x + h.rx * 0.25, y: h.y - h.ry * 0.9 }];
    inkFill(g, pts, c, { w: W, seed: 40 });
  } },
};

export const DEFAULT_LOOK = { age: 'kid', skin: 0xffd9a8, hair: { style: 'short', color: 0x6b4226 }, shirt: 0x6ec6ff, pattern: null, pants: 0x3b6fb4, shoe: 0x3b5b8c };

// Blush colour: the skin tone nudged toward pink so it reads on every tone.
export function cheekFor(skin) {
  const mix = (a, b) => Math.round(a + (b - a) * 0.4);
  const r = mix((skin >> 16) & 255, 255), g = mix((skin >> 8) & 255, 107), b = mix(skin & 255, 107);
  return (r << 16) | (g << 8) | b;
}

const isColor = v => Number.isInteger(v) && v >= 0 && v <= 0xffffff;

// Anything in, a valid look out (unknown fields fall back to the default).
export function sanitizeLook(l) {
  const d = DEFAULT_LOOK, h = (l && l.hair) || {};
  return {
    age: l && AGES.includes(l.age) ? l.age : d.age,
    skin: l && isColor(l.skin) ? l.skin : d.skin,
    hair: {
      style: HAIR_STYLES[h.style] ? h.style : d.hair.style,
      color: isColor(h.color) ? h.color : d.hair.color,
    },
    shirt: l && isColor(l.shirt) ? l.shirt : d.shirt,
    pattern: l && l.pattern && PATTERNS[l.pattern.id] && isColor(l.pattern.color) ? { id: l.pattern.id, color: l.pattern.color } : null,
    pants: l && isColor(l.pants) ? l.pants : d.pants,
    shoe: l && isColor(l.shoe) ? l.shoe : d.shoe,
  };
}

export function randomLook(rand = Math.random) {
  const pick = list => list[Math.floor(rand() * list.length)];
  return {
    age: rand() < 0.65 ? 'kid' : 'adult',
    skin: pick(SKIN_TONES),
    hair: { style: pick(Object.keys(HAIR_STYLES)), color: pick(HAIR_COLORS) },
    shirt: pick(SHIRT_COLORS),
    pattern: rand() < 0.3 ? { id: pick(Object.keys(PATTERNS)), color: pick(SHIRT_COLORS) } : null,
    pants: pick(PANTS_COLORS),
    shoe: pick(SHOE_COLORS),
  };
}
export { INK };
