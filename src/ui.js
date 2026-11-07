// The hand-inked UI kit shared by every scene (art/reference/): wobbly paper panels with a dark uneven outline,
// squishy buttons, chips, and text whose emoji are swapped for the drawn icons. Everything is flat matte colour.
import { iconImage, spriteImage } from './systems/itemTextures.js';
import { EMOJI_SPRITE } from './data/spriteart.js';
import { INK, LINE, blob, inkFill, wobblyPoly } from './data/ink.js';
import { roundedRectPoints } from './data/inkpen.js';

export const PAPER = 0xf8eed8;
export const CARD = 0xfffaf0;
export const TEXT = '#3a2a22';
export const COLORS = { green: 0x78c363, orange: 0xf2ae44, red: 0xe5685c, blue: 0x6fb4ea, grey: 0xc4b8a4, gold: 0xf0c868, purple: 0xb59ae0 };

// Make an object easy to hit with a finger: the hit area is the object plus `pad`
// pixels on every side. (Phaser hit areas are in the object's top-left local space.)
export function touchable(obj, pad = 10) {
  return obj.setInteractive({
    hitArea: new Phaser.Geom.Rectangle(-pad, -pad, obj.width + 2 * pad, obj.height + 2 * pad),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: true,
  });
}

// An invisible tap target (centred at x, y).
export function hitZone(scene, x, y, w, h, onTap, depth) {
  const z = scene.add.rectangle(x, y, w, h, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
  if (depth !== undefined) z.setDepth(depth);
  if (onTap) z.on('pointerdown', onTap);
  return z;
}

// Keep an object fixed to the screen while the camera scrolls (containers pass it on to their children).
export function pin(o) { return o.list ? o.setScrollFactor(0, 0, true) : o.setScrollFactor(0); }

// A close button etc.: the drawn icon for ✖, otherwise a text glyph.
export function iconButton(scene, x, y, glyph, onTap, depth = 10000) {
  const b = glyph === '✖'
    ? spriteImage(scene, 'icon-close', x, y, 44).setDepth(depth)                        // the drawn close button
    : scene.add.text(x, y, glyph, { fontSize: '30px' }).setOrigin(0.5).setDepth(depth);
  return touchable(b, 12).on('pointerdown', onTap);
}

// --- text with drawn icons ---------------------------------------------------------------------
const TOKEN = new RegExp(`(${Object.keys(EMOJI_SPRITE).join('|')})`, 'u');
const wordsOf = str => String(str).split(TOKEN).filter(p => p !== '');

// Text where any emoji we have a drawing for becomes that drawing. A Container centred on its middle; `.textWidth`
// is its width, and `.setText(str)` rebuilds it.
export function richText(scene, str, style = {}, { iconPx } = {}) {
  const c = scene.add.container(0, 0), size = parseInt(style.fontSize || 20, 10), px = iconPx || size * 1.25;
  c.setText = s => {
    c.removeAll(true);
    const items = [];
    for (const part of wordsOf(s)) {
      const key = EMOJI_SPRITE[part];
      if (key) items.push(iconImage(scene, key, 0, 0, px));
      else if (part.trim()) items.push(scene.add.text(0, 0, part.trim(), { color: TEXT, ...style }).setOrigin(0.5));
    }
    const gap = 5, total = items.reduce((n, o) => n + o.displayWidth + gap, -gap);
    let at = -total / 2;
    for (const o of items) { o.setPosition(at + o.displayWidth / 2, 0); at += o.displayWidth + gap; c.add(o); }
    c.textWidth = Math.max(0, total);
    c.textHeight = items.reduce((m, o) => Math.max(m, o.displayHeight), 0);
    return c;
  };
  return c.setText(str);
}

// Rich text laid out from its left edge (richText is centred on its position).
export function leftText(scene, x, y, str, style = {}) {
  const t = richText(scene, str, style);
  return t.setPosition(x + t.textWidth / 2, y);
}

// --- panels, buttons and chips -----------------------------------------------------------------
// A wobbly paper panel centred at (x, y) with a soft offset shadow and a dark uneven outline. Returns the Graphics.
export function inkPanel(scene, x, y, w, h, { fill = PAPER, depth, seed = 3, radius = 22, shadow = true, weight = LINE } = {}) {
  const g = scene.add.graphics();
  if (depth !== undefined) g.setDepth(depth);
  const shape = (dx, dy) => wobblyPoly(roundedRectPoints(x - w / 2 + dx, y - h / 2 + dy, w, h, radius), { amp: 1.6, seed, step: 16 });
  if (shadow) g.fillStyle(0x000000, 0.18).fillPoints(shape(6, 8), true);
  inkFill(g, shape(0, 0), fill, { w: weight, seed });
  return g;
}

// A squishy button: wobbly coloured pill with a label (emoji become drawn icons). Returns a Container you can
// `.on('pointerdown', fn)` (or pass `onTap`); `.setLabel(str)` changes the words.
export function inkButton(scene, x, y, label, { w, h = 46, fill = COLORS.green, color = TEXT, size = 22, onTap, depth = 10000, seed = 5 } = {}) {
  const content = richText(scene, label, { fontSize: `${size}px`, color }, { iconPx: size + 8 });
  const g = scene.add.graphics();
  const c = scene.add.container(x, y, [g, content]).setDepth(depth);
  const draw = () => {
    const bw = w ?? Math.max(56, content.textWidth + 38);
    g.clear();
    inkFill(g, wobblyPoly(roundedRectPoints(-bw / 2, -h / 2, bw, h, h / 2.4), { amp: 1.2, seed, step: 14 }), fill, { w: LINE, seed });
    c.setSize(bw, h);
    if (c.input) c.input.hitArea.setTo(0, 0, bw, h);
  };
  draw();
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => { scene.tweens.killTweensOf(c); c.setScale(0.9); scene.tweens.add({ targets: c, scale: 1, duration: 320, ease: 'Elastic.easeOut' }); });
  c.on('pointerover', () => c.setScale(1.04)).on('pointerout', () => c.setScale(1));
  if (onTap) c.on('pointerdown', onTap);
  c.setLabel = s => { content.setText(s); draw(); return c; };
  return c;
}

// A small non-interactive pill with text (coin counters, titles). `.setLabel(str)` updates it.
export function inkChip(scene, x, y, label, { fill = PAPER, color = TEXT, size = 22, depth = 10000, h = 38, seed = 7 } = {}) {
  const content = richText(scene, label, { fontSize: `${size}px`, color }, { iconPx: size + 8 });
  const g = scene.add.graphics();
  const c = scene.add.container(x, y, [g, content]).setDepth(depth);
  const draw = () => {
    const bw = Math.max(56, content.textWidth + 34);
    g.clear();
    inkFill(g, wobblyPoly(roundedRectPoints(-bw / 2, -h / 2, bw, h, h / 2.3), { amp: 1.1, seed, step: 14 }), fill, { w: LINE, seed });
    c.setSize(bw, h);
  };
  draw();
  c.setLabel = s => { content.setText(s); draw(); return c; };
  c.setText = c.setLabel;
  return c;
}

// A round colour swatch with an ink outline (and a thicker one when selected), drawn into `g`.
export function inkSwatch(g, x, y, r, color, selected, seed = 1) {
  inkFill(g, blob(x, y, r, r, { n: 16, amp: 0.06, seed }), color, { w: selected ? LINE * 1.8 : LINE, seed, heavy: 0 });
}
export { INK };
