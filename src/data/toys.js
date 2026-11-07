// Toys sculpted at the Toy Workshop: a clay body, a few parts, a face. A design is plain data that is saved and
// can be drawn as an item (data/itemart.js ITEM_ART) so it behaves like any other toy once registered.
//   design = { id, name, body, color, partColor, parts: [partId], face }
import { H } from './itemart.js';
import { CATALOG } from './items.js';
import { ITEM_ART } from './itemart.js';

const { e, c, r, t, poly, ln, tiny } = H;
const INKC = 0x2a1f24;
const isColor = v => Number.isInteger(v) && v >= 0 && v <= 0xffffff;

// Bodies: where the body sits in the 128 box ({ cx, cy, rx, ry }) and how to draw it.
export const TOY_BODIES = {
  ball: { name: 'Ball',  dims: { cx: 64, cy: 78, rx: 40, ry: 40 }, draw: (p, d, col) => e(p, d.cx, d.cy, d.rx, d.ry, col) },
  bean: { name: 'Bean',  dims: { cx: 64, cy: 76, rx: 32, ry: 42 }, draw: (p, d, col) => e(p, d.cx, d.cy, d.rx, d.ry, col) },
  egg:  { name: 'Egg',   dims: { cx: 64, cy: 78, rx: 30, ry: 40 }, draw: (p, d, col) => { e(p, d.cx, d.cy + 6, d.rx + 4, d.ry - 6, col); e(p, d.cx, d.cy - 10, d.rx - 6, d.ry - 12, col); } },
  lump: { name: 'Lump',  dims: { cx: 64, cy: 84, rx: 42, ry: 34 }, draw: (p, d, col) => { e(p, d.cx - 12, d.cy, 26, 30, col); e(p, d.cx + 14, d.cy + 4, 28, 28, col); e(p, d.cx, d.cy - 10, 24, 22, col); } },
  tall: { name: 'Tall',  dims: { cx: 64, cy: 68, rx: 24, ry: 50 }, draw: (p, d, col) => r(p, d.cx - d.rx, d.cy - d.ry, d.rx * 2, d.ry * 2, col, 22) },
};

// Parts, each drawn relative to the body's dims.
export const TOY_PARTS = {
  ears:    { name: 'Ears',    draw: (p, d, col) => { c(p, d.cx - d.rx * 0.7, d.cy - d.ry + 8, 12, col); c(p, d.cx + d.rx * 0.7, d.cy - d.ry + 8, 12, col); } },
  horns:   { name: 'Horns',   draw: (p, d, col) => { t(p, d.cx - 22, d.cy - d.ry + 8, d.cx - 12, d.cy - d.ry - 20, d.cx - 2, d.cy - d.ry + 4, col); t(p, d.cx + 22, d.cy - d.ry + 8, d.cx + 12, d.cy - d.ry - 20, d.cx + 2, d.cy - d.ry + 4, col); } },
  tail:    { name: 'Tail',    draw: (p, d, col) => poly(p, [[d.cx + d.rx - 6, d.cy + 24], [d.cx + d.rx + 22, d.cy + 4], [d.cx + d.rx + 26, d.cy + 16], [d.cx + d.rx + 4, d.cy + 36]], col) },
  wings:   { name: 'Wings',   draw: (p, d, col) => { poly(p, [[d.cx - d.rx + 4, d.cy - 6], [d.cx - d.rx - 26, d.cy - 24], [d.cx - d.rx - 20, d.cy + 14]], col); poly(p, [[d.cx + d.rx - 4, d.cy - 6], [d.cx + d.rx + 26, d.cy - 24], [d.cx + d.rx + 20, d.cy + 14]], col); } },
  spots:   { name: 'Spots',   draw: (p, d, col) => tiny(p, () => { c(p, d.cx - d.rx * 0.5, d.cy + 14, 6, col); c(p, d.cx + d.rx * 0.45, d.cy + 24, 7, col); c(p, d.cx + d.rx * 0.2, d.cy - d.ry * 0.5, 5, col); c(p, d.cx - d.rx * 0.3, d.cy + d.ry * 0.5, 5, col); }) },
  hat:     { name: 'Party hat', draw: (p, d, col) => { t(p, d.cx - 18, d.cy - d.ry + 6, d.cx, d.cy - d.ry - 40, d.cx + 18, d.cy - d.ry + 6, col); c(p, d.cx, d.cy - d.ry - 42, 6, 0xffe27a); } },
  feet:    { name: 'Feet',    draw: (p, d, col) => { e(p, d.cx - d.rx * 0.5, 114, 14, 8, col); e(p, d.cx + d.rx * 0.5, 114, 14, 8, col); } },
  antenna: { name: 'Antenna', draw: (p, d, col) => { ln(p, d.cx, d.cy - d.ry + 4, d.cx + 6, d.cy - d.ry - 26, 4); c(p, d.cx + 6, d.cy - d.ry - 30, 7, col); } },
};
export const TOY_FACES = { smile: 'Smile', grin: 'Grin', sleepy: 'Sleepy', wow: 'Wow' };
export const MAX_PARTS = 4;

function drawFace(p, d, face) {
  const ey = d.cy - d.ry * 0.18, ex = Math.min(16, d.rx * 0.45);
  tiny(p, () => {
    if (face === 'sleepy') { ln(p, d.cx - ex - 5, ey, d.cx - ex + 5, ey + 1, 3); ln(p, d.cx + ex - 5, ey + 1, d.cx + ex + 5, ey, 3); }
    else { c(p, d.cx - ex, ey, face === 'wow' ? 5 : 3.6, INKC); c(p, d.cx + ex, ey, face === 'wow' ? 5 : 3.6, INKC); }
    c(p, d.cx - ex - 8, ey + 10, 5, 0xff9fb5); c(p, d.cx + ex + 8, ey + 10, 5, 0xff9fb5);
    const my = ey + 14;
    if (face === 'grin') poly(p, [[d.cx - 11, my - 2], [d.cx + 11, my - 2], [d.cx + 7, my + 10], [d.cx - 7, my + 10]], 0x8a2335);
    else if (face === 'wow') e(p, d.cx, my + 3, 5, 7, 0x8a2335);
    else if (face === 'sleepy') ln(p, d.cx - 5, my + 2, d.cx + 5, my + 2, 3);
    else { ln(p, d.cx - 8, my - 1, d.cx - 3, my + 4, 3); ln(p, d.cx - 3, my + 4, d.cx, my, 3); ln(p, d.cx, my, d.cx + 3, my + 4, 3); ln(p, d.cx + 3, my + 4, d.cx + 8, my - 1, 3); }
  });
}

// Draw a design onto an InkPen in the 128 box. Parts behind the body (wings, tail, feet) first, then the body, then the rest.
export function drawToy(pen, design) {
  const body = TOY_BODIES[design.body] || TOY_BODIES.ball, d = body.dims, parts = design.parts.filter(id => TOY_PARTS[id]);
  const behind = ['wings', 'tail', 'feet', 'horns', 'ears'];
  for (const id of parts.filter(id => behind.includes(id))) TOY_PARTS[id].draw(pen, d, design.partColor);
  body.draw(pen, d, design.color);
  for (const id of parts.filter(id => !behind.includes(id))) TOY_PARTS[id].draw(pen, d, design.partColor);
  drawFace(pen, d, design.face);
}

const NAMES = ['Squish', 'Bloop', 'Mochi', 'Pudge', 'Noodle', 'Wobble', 'Biscuit', 'Zigzag', 'Gloop', 'Pip'];
export const randomToyName = (rand = Math.random) => NAMES[Math.floor(rand() * NAMES.length)];
export const newToyId = (existing, rand = Math.random) => { let id; do id = Math.floor(rand() * 36 ** 5).toString(36).padStart(5, 'a'); while (existing.includes(id)); return id; };
export const toyKey = id => `toy:${id}`;
export const defaultToy = () => ({ body: 'bean', color: 0xf59ab4, partColor: 0x6aaee8, parts: ['ears'], face: 'smile' });

// A design from untrusted data, or null.
export function sanitizeToy(t) {
  if (!t || typeof t !== 'object' || typeof t.id !== 'string' || !/^[a-z0-9]{1,8}$/.test(t.id) || !TOY_BODIES[t.body]) return null;
  const parts = [...new Set(Array.isArray(t.parts) ? t.parts.filter(id => TOY_PARTS[id]) : [])].slice(0, MAX_PARTS);
  return {
    id: t.id, name: typeof t.name === 'string' && t.name ? t.name.slice(0, 14) : 'Toy', body: t.body,
    color: isColor(t.color) ? t.color : 0xf59ab4, partColor: isColor(t.partColor) ? t.partColor : 0x6aaee8, parts, face: TOY_FACES[t.face] ? t.face : 'smile',
  };
}

// Make a design usable as an item: catalogue entry + drawing. Safe to call twice.
export function registerToy(design) {
  const key = toyKey(design.id);
  CATALOG[key] = { emoji: '🧸', kind: 'toy', size: 76, custom: true };
  ITEM_ART[key] = pen => drawToy(pen, design);
  return key;
}
export const registerToys = list => list.map(registerToy);
