// What a character looks like. Pure data + drawing recipes (the hair functions
// take a Phaser Graphics but import nothing, so this module is testable).
// Graphics coordinates: origin at the character origin shifted up by FOOT, so
// the head is a circle at (0,-75), radius 70.

export const SKIN_TONES = [0xffe6d0, 0xffd9a8, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0x5e3a1e, 0xb5ead7, 0xd0c1ff];
export const HAIR_COLORS = [0x2b1b12, 0x6b4226, 0xb5651d, 0xe8c15a, 0xdcdcdc, 0xc0392b, 0x3b6fd4, 0xe667a8];
export const SHIRT_COLORS = [0x6ec6ff, 0xff9f68, 0xff6b8b, 0x7bd88f, 0xffd166, 0xb28dff, 0x4a4e69, 0xf4f4f4];
export const SHOE_COLORS = [0x3b5b8c, 0x7a3b2e, 0x222222, 0xd64545, 0x2e7d5b, 0xf0c030];
export const NAMES = ['Kid', 'Pal', 'Bean', 'Pip', 'Moxie', 'Juno', 'Sunny', 'Beau', 'Dot', 'Fig'];

// A cap of hair over the top of the head (an arc segment, not a pie wedge).
const cap = (g, color, r = 71, a0 = 1.16) => {
  g.fillStyle(color, 1).beginPath();
  g.arc(0, -75, r, a0 * Math.PI, (3 - a0) * Math.PI);
  g.closePath().fillPath();
};
const none = () => {};

export const HAIR_STYLES = {
  none:     { label: 'Bald',     back: none, front: none },
  short:    { label: 'Short',    back: none, front: (g, c) => cap(g, c) },
  spiky:    { label: 'Spiky',    back: none, front: (g, c) => {
    cap(g, c);
    for (let i = -2; i <= 2; i++) {
      const y = -128 + Math.abs(i) * 6;
      g.fillTriangle(i * 26 - 15, y, i * 26 + 15, y, i * 26 + i * 4, y - 38 + Math.abs(i) * 8);
    }
  } },
  long:     { label: 'Long',     back: (g, c) => g.fillStyle(c, 1).fillRoundedRect(-80, -125, 160, 215, 36),
                                 front: (g, c) => cap(g, c) },
  pigtails: { label: 'Pigtails', back: (g, c) => g.fillStyle(c, 1).fillCircle(-84, -55, 24).fillCircle(84, -55, 24),
                                 front: (g, c) => cap(g, c) },
  bun:      { label: 'Bun',      back: (g, c) => g.fillStyle(c, 1).fillCircle(0, -152, 26),
                                 front: (g, c) => cap(g, c) },
  curly:    { label: 'Curly',    back: none, front: (g, c) => {
    g.fillStyle(c, 1);
    for (let a = 1.04; a <= 1.97; a += 0.1) g.fillCircle(Math.cos(a * Math.PI) * 68, -75 + Math.sin(a * Math.PI) * 68, 17);
  } },
  mohawk:   { label: 'Mohawk',   back: none, front: (g, c) => g.fillStyle(c, 1).fillRoundedRect(-12, -172, 24, 70, 10) },
};

export const DEFAULT_LOOK = { skin: 0xffd9a8, hair: { style: 'short', color: 0x6b4226 }, shirt: 0x6ec6ff, shoe: 0x3b5b8c };

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
    skin: l && isColor(l.skin) ? l.skin : d.skin,
    hair: {
      style: HAIR_STYLES[h.style] ? h.style : d.hair.style,
      color: isColor(h.color) ? h.color : d.hair.color,
    },
    shirt: l && isColor(l.shirt) ? l.shirt : d.shirt,
    shoe: l && isColor(l.shoe) ? l.shoe : d.shoe,
  };
}

export function randomLook(rand = Math.random) {
  const pick = list => list[Math.floor(rand() * list.length)];
  return {
    skin: pick(SKIN_TONES),
    hair: { style: pick(Object.keys(HAIR_STYLES)), color: pick(HAIR_COLORS) },
    shirt: pick(SHIRT_COLORS),
    shoe: pick(SHOE_COLORS),
  };
}
