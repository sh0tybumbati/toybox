// How rooms look, as data — hand-inked (art/reference/). An indoor room is a wallpaper + a floor + windows
// (+ fixed `decor` art), so players can repaint walls and floors and move windows (the look is saved per
// room; see systems/save.js `looks`). Wall area is y 0..WALL_H, floor is WALL_H..H. All painters draw onto a
// Graphics in room-local coordinates (0..w). Flat matte colour, wobbly lines, uneven boards: nothing is straight.
import { W, H } from '../config.js';
import { sunbeamShapes, SUNBEAM_ALPHA, shade } from './style.js';
import { INK, LINE, blob, inkFill, inkLine, inkStroke, noise, rectPoints, wobblyPoly } from './ink.js';
import { InkPen } from './inkpen.js';
import { MAP_COLORS, paintBush, paintHill, paintMountain, paintTree } from './mapart.js';

export const WALL_H = 430;

const wob = (g, a, b, color, w, seed, amp = 1.8) => inkLine(g, a, b, { color, w, seed, amp, heavy: 0, step: 16 });
const patch = (g, x, y, w, h, color, seed, amp = 1.4) => g.fillStyle(color, 1).fillPoints(wobblyPoly(rectPoints(x, y, w, h), { amp, seed, step: 26 }), true);
const lineTone = c => shade(c, 0.84);

// Uneven floorboards: staggered boards, each a slightly different tone, wobbly seams, a thick wobbly skirting.
function boards(g, w, base, rowH, seed) {
  g.fillStyle(base, 1).fillRect(0, WALL_H, w, H - WALL_H);
  let r = 0;
  for (let y = WALL_H; y < H; y += rowH, r++) {
    let x = -((r * 137 + seed * 31) % 190);
    while (x < w) {
      const len = 150 + 70 * Math.abs(noise(r * 5 + x * 0.01, seed));
      patch(g, x, y, len, rowH, shade(base, 0.93 + 0.09 * noise(r * 3 + x * 0.02, seed + 2)), seed + r, 1.2);
      wob(g, { x: x + len, y }, { x: x + len + noise(x, seed) * 3, y: y + rowH }, lineTone(base), 2.2, seed + r + x);
      x += len;
    }
    if (y > WALL_H) wob(g, { x: 0, y }, { x: w, y: y + noise(r, seed) * 2 }, lineTone(base), 2.4, seed + r * 7, 2.2);
  }
  patch(g, 0, WALL_H, w, 9, shade(base, 0.8), seed + 90, 0.8);
  wob(g, { x: 0, y: WALL_H }, { x: w, y: WALL_H }, INK, 5, seed + 91, 2.4);                       // the skirting line, thick and wavering
}

export const WALLPAPERS = {
  cream:    { name: 'Cream', swatch: 0xf6e3b0,          paint: (g, w) => { g.fillStyle(0xf6e3b0, 1).fillRect(0, 0, w, WALL_H); for (let x = 90; x < w; x += 130) wob(g, { x, y: 0 }, { x: x + noise(x, 1) * 5, y: WALL_H }, lineTone(0xf6e3b0), 2, x); } },
  sage:     { name: 'Sage', swatch: 0xb9dccb,           paint: (g, w) => { g.fillStyle(0xb9dccb, 1).fillRect(0, 0, w, WALL_H); g.fillStyle(shade(0xb9dccb, 0.9), 1).fillPoints(wobblyPoly(rectPoints(0, 332, w, 98), { amp: 2, seed: 4, step: 30 }), true); wob(g, { x: 0, y: 332 }, { x: w, y: 332 }, INK, 3.2, 5, 2.4); } },
  blush:    { name: 'Blush', swatch: 0xf8e1d8,          paint: (g, w) => { g.fillStyle(0xf8e1d8, 1).fillRect(0, 0, w, WALL_H); for (let x = 70; x < w; x += 150) wob(g, { x, y: 0 }, { x: x + noise(x, 2) * 4, y: WALL_H }, lineTone(0xf8e1d8), 2, x + 3); } },
  mintTiles: { name: 'Mint tiles', swatch: 0xc4e8dc,    paint: (g, w) => { g.fillStyle(0xc4e8dc, 1).fillRect(0, 0, w, WALL_H); for (let x = 0; x < w; x += 62) wob(g, { x, y: 0 }, { x: x + noise(x, 3) * 3, y: WALL_H }, lineTone(0xc4e8dc), 2, x); for (let y = 0; y < WALL_H; y += 62) wob(g, { x: 0, y }, { x: w, y: y + noise(y, 4) * 3 }, lineTone(0xc4e8dc), 2, y + 9); } },
  pinkStripes: { name: 'Pink stripes', swatch: 0xf4b9ca, paint: (g, w) => { g.fillStyle(0xf9d9e2, 1).fillRect(0, 0, w, WALL_H); for (let x = 0; x < w; x += 84) patch(g, x, 0, 40, WALL_H, 0xf4b9ca, x, 2.2); } },
  panel:    { name: 'Lavender panel', swatch: 0xd7def0, paint: (g, w) => { g.fillStyle(0xd7def0, 1).fillRect(0, 0, w, WALL_H); g.fillStyle(shade(0xd7def0, 0.9), 1).fillPoints(wobblyPoly(rectPoints(0, 300, w, 130), { amp: 2, seed: 6, step: 30 }), true); wob(g, { x: 0, y: 300 }, { x: w, y: 300 }, INK, 3.2, 7, 2.4); } },
  shells:   { name: 'Seashells', swatch: 0x9fc9bd,      paint: (g, w) => {
    g.fillStyle(0xf1e6c8, 1).fillRect(0, 0, w, 300);
    for (let y = 0; y < 300; y += 72) for (let x = (y / 72 % 2) * 36; x < w; x += 72) {
      g.fillStyle(0x9fc9bd, 1).fillPoints(blob(x + 36, y + 36, 25, 24, { n: 12, amp: 0.1, seed: x + y }), true);
      g.fillStyle(0xf1e6c8, 1).fillPoints(blob(x + 36, y + 36, 14, 13, { n: 10, amp: 0.1, seed: x + y + 1 }), true);
    }
    g.fillStyle(0x93b8b2, 1).fillPoints(wobblyPoly(rectPoints(0, 300, w, WALL_H - 300), { amp: 2, seed: 8, step: 30 }), true);
    wob(g, { x: 0, y: 300 }, { x: w, y: 300 }, INK, 3.2, 9, 2.4);
  } },
  arcade:   { name: 'Arcade night', swatch: 0x4a3f7a, paint: (g, w) => { g.fillStyle(0x4a3f7a, 1).fillRect(0, 0, w, WALL_H); for (let i = 0; i < w / 46; i++) g.fillStyle(0xffe27a, 1).fillPoints(blob((i * 97) % w + 20, 30 + ((i * 61) % 360), 5, 5, { n: 5, seed: i }), true); } },
  grey:     { name: 'Factory grey', swatch: 0xb9bcc6, paint: (g, w) => { g.fillStyle(0xc8cad2, 1).fillRect(0, 0, w, WALL_H); for (let y = 0; y < WALL_H; y += 54) { wob(g, { x: 0, y }, { x: w, y: y + noise(y, 9) * 3 }, lineTone(0xc8cad2), 2, y); for (let x = (y / 54 % 2) * 40; x < w; x += 80) wob(g, { x, y }, { x: x + noise(x, 3), y: y + 54 }, lineTone(0xc8cad2), 2, x + y); } } },
  sky:      { name: 'Sky dots', swatch: 0xcfe6f8,       paint: (g, w) => { g.fillStyle(0xcfe6f8, 1).fillRect(0, 0, w, WALL_H); for (let y = 30; y < WALL_H; y += 62) for (let x = (y / 62 % 2) * 31; x < w; x += 62) g.fillStyle(0xffffff, 1).fillPoints(blob(x + 20, y, 7, 6, { n: 8, amp: 0.15, seed: x + y }), true); } },
};

export const FLOORS = {
  honey:   { name: 'Honey wood', swatch: 0xd09a62,    paint: (g, w) => boards(g, w, 0xd09a62, 40, 1) },
  oak:     { name: 'Light oak', swatch: 0xf0cfa8,     paint: (g, w) => boards(g, w, 0xf0cfa8, 42, 2) },
  warm:    { name: 'Warm wood', swatch: 0xdcae72,     paint: (g, w) => boards(g, w, 0xdcae72, 36, 3) },
  shop:    { name: 'Boardwalk', swatch: 0xd2b48c,     paint: (g, w) => boards(g, w, 0xd2b48c, 32, 4) },
  checker: { name: 'Checkered', swatch: 0xe2d0b4,     paint: (g, w) => {
    for (let row = 0; row < 3; row++) for (let col = 0; col * 62 < w; col++) patch(g, col * 62, WALL_H + row * 57, 62, 57, (row + col) % 2 ? 0xf3e7d2 : 0xe2d0b4, row * 31 + col, 1.4);
    for (let row = 1; row < 3; row++) wob(g, { x: 0, y: WALL_H + row * 57 }, { x: w, y: WALL_H + row * 57 }, lineTone(0xe2d0b4), 2.2, row);
    wob(g, { x: 0, y: WALL_H }, { x: w, y: WALL_H }, INK, 5, 12, 2.4);
  } },
  carpet:  { name: 'Purple carpet', swatch: 0x9a86cc, paint: (g, w) => { g.fillStyle(0x9a86cc, 1).fillRect(0, WALL_H, w, H - WALL_H); wob(g, { x: 0, y: WALL_H }, { x: w, y: WALL_H }, INK, 5, 13, 2.4); for (let i = 0; i < 40; i++) inkStroke(g, [{ x: (i * 97) % w, y: WALL_H + 20 + ((i * 53) % 140) }, { x: ((i * 97) % w) + 6, y: WALL_H + 22 + ((i * 53) % 140) }], { w: 2, color: 0x7d6bb0, heavy: 0 }); } },
  concrete: { name: 'Concrete', swatch: 0xb4b6be, paint: (g, w) => boards(g, w, 0xb9bbc3, 46, 7) },
  stars:   { name: 'Star tiles', swatch: 0xf3ece8,    paint: (g, w) => {
    g.fillStyle(0xf3ece8, 1).fillRect(0, WALL_H, w, H - WALL_H);
    for (let y = WALL_H + 30; y < H; y += 56) for (let x = (((y - WALL_H) / 56) % 2) * 50; x < w; x += 100) g.fillStyle(0xcdbfb8, 1).fillPoints(wobblyPoly([{ x: x + 50, y: y - 12 }, { x: x + 40, y: y + 6 }, { x: x + 60, y: y + 6 }], { amp: 0.6, seed: x + y, step: 8 }), true);
    wob(g, { x: 0, y: WALL_H }, { x: w, y: WALL_H }, INK, 5, 14, 2.4);
  } },
};

// A window looking out on rolling hills: a wobbly white frame, a patch of sky, a hill, a cloud, crooked bars.
// `w` = { x, y, w, h } in room-local coordinates.
export function paintWindow(g, w) {
  const pen = new InkPen(g, 40 + (w.x % 50), { weight: LINE });
  pen.fillStyle(0xf4f1e8, 1).fillRoundedRect(w.x, w.y, w.w, w.h, 12);
  const gx = w.x + 11, gy = w.y + 11, gw = w.w - 22, gh = w.h - 22;
  g.fillStyle(0xa9d9f0, 1).fillPoints(wobblyPoly(rectPoints(gx, gy, gw, gh), { amp: 1.2, seed: 5, step: 24 }), true);
  const hill = [{ x: gx, y: gy + gh }, { x: gx, y: gy + gh * 0.72 }, { x: gx + gw * 0.3, y: gy + gh * 0.55 }, { x: gx + gw * 0.62, y: gy + gh * 0.7 }, { x: gx + gw, y: gy + gh * 0.6 }, { x: gx + gw, y: gy + gh }];
  g.fillStyle(MAP_COLORS.grass, 1).fillPoints(hill, true);
  inkStroke(g, hill.slice(1, 5), { w: 2.6, seed: 6, heavy: 0 });
  inkFill(g, blob(gx + gw * 0.3, gy + gh * 0.25, gw * 0.18, gh * 0.1, { n: 12, amp: 0.1, seed: 7 }), 0xffffff, { w: 2.4, seed: 7, heavy: 0 });
  pen.lineStyle(5, INK).lineBetween(w.x + w.w / 2, w.y + 6, w.x + w.w / 2 + 1, w.y + w.h - 6).lineBetween(w.x + 6, w.y + w.h / 2, w.x + w.w - 6, w.y + w.h / 2 + 2);
}

// Light coming through each window as flat pale shapes on the wall and floor. Painted on its own Graphics so it
// can be hidden at night.
export function paintSunbeams(g, windows, w = W) {
  g.fillStyle(0xffffff, SUNBEAM_ALPHA);
  for (const win of windows) for (const poly of sunbeamShapes(win, w, WALL_H, H)) g.fillPoints(poly, true);
}

const hashName = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) % 900 + 1;

// A whole indoor room from its look; `decor` is the room type's fixed extra art (drawn through the ink pen).
// look = { wall, floor, windows } (ids from WALLPAPERS/FLOORS; unknown ids fall back to the defaults).
export function paintIndoor(g, type, look, w = W) {
  const wall = WALLPAPERS[look.wall] || WALLPAPERS[type.style.wall];
  const floor = FLOORS[look.floor] || FLOORS[type.style.floor];
  wall.paint(g, w);
  floor.paint(g, w);
  for (const win of look.windows) paintWindow(g, win);
  if (type.decor) {                                          // fixed art sits in the middle of a stretched room
    g.save().translateCanvas((w - W) / 2, 0);
    type.decor(new InkPen(g, hashName(type.label)));
    g.restore();
  }
}

// Outdoor rooms: a flat sky, wobbly clouds and hills, a lumpy ground line, trees and bushes. `kind` = 'park' | 'playground'.
export function paintOutdoor(g, kind) {
  g.fillStyle(0xbfe3f2, 1).fillRect(0, 0, W, WALL_H);
  paintMountain(g, 560, 300, 420, 120, 31); paintMountain(g, -40, 300, 330, 100, 32);
  inkFill(g, blob(830, 96, 40, 38, { n: 14, amp: 0.06, seed: 3 }), 0xffe27a, { w: 3.2, seed: 3, heavy: 1 });         // the sun
  for (const [x, y, s] of [[190, 96, 1], [470, 140, 0.8], [700, 70, 0.7]]) {
    for (const [ox, oy, rx, ry] of [[-26, 4, 30, 17], [0, -6, 36, 22], [28, 5, 28, 16]]) inkFill(g, blob(x + ox * s, y + oy * s, rx * s, ry * s, { n: 12, amp: 0.08, seed: x + ox }), 0xffffff, { w: 3, seed: x + ox, heavy: 0 });
  }
  paintHill(g, 250, 372, 260, 64, 0xa9d77c, 33); paintHill(g, 700, 380, 300, 70, 0x9bcf6c, 34);
  g.fillStyle(MAP_COLORS.grass, 1).fillRect(0, WALL_H, W, H - WALL_H);
  inkLine(g, { x: 0, y: WALL_H }, { x: W, y: WALL_H }, { w: 4.5, seed: 8, amp: 3, heavy: 1 });
  for (let i = 0; i < 70; i++) {                                                          // tufts and little flowers
    const x = (i * 211) % W, y = WALL_H + 12 + ((i * 97) % (H - WALL_H - 20));
    if (i % 5 === 0) { g.fillStyle([0xff8fa3, 0xffd166, 0xffffff][i % 3], 1).fillPoints(blob(x, y, 4, 4, { n: 6, seed: i }), true); inkStroke(g, [{ x, y: y + 3 }, { x, y: y + 9 }], { w: 1.8, heavy: 0, color: 0x3f7f3f }); }
    else inkStroke(g, [{ x: x - 5, y }, { x: x - 2, y: y - 5 }, { x, y }, { x: x + 3, y: y - 6 }, { x: x + 6, y }], { w: 1.8, heavy: 0, color: shade(MAP_COLORS.grass, 0.65) });
  }
  const pen = new InkPen(g, kind === 'park' ? 21 : 22);
  if (kind === 'pond') {                                                            // a pond with reeds and lily pads
    inkFill(g, blob(480, 500, 400, 62, { n: 30, amp: 0.05, seed: 41 }), 0x7fc4e8, { w: 4.4, seed: 41, heavy: 2 });
    for (const [x, y, rx] of [[330, 492, 24], [560, 510, 28], [680, 488, 20], [420, 520, 18]]) inkFill(g, blob(x, y, rx, rx * 0.42, { n: 10, seed: x }), 0x69b653, { w: 2.6, seed: x, heavy: 0 });
    for (const x of [110, 150, 790, 840]) for (let k = 0; k < 3; k++) inkStroke(g, [{ x: x + k * 9, y: 520 }, { x: x + k * 9 + noise(k, x) * 4, y: 470 - k * 6 }], { w: 3.2, color: 0x4a8f48, heavy: 0 });
    paintTree(g, 880, 430, 3.2, 17); paintBush(g, 140, 442, 2.2, 18);
  } else if (kind === 'campsite') {                                                 // tents, logs and trees under a big sky
    for (const [x, col] of [[180, 0xe0605a], [760, 0x6fb4ea]]) {
      inkFill(g, wobblyPoly([{ x: x - 90, y: 470 }, { x, y: 350 }, { x: x + 90, y: 470 }], { amp: 1.4, seed: x, step: 16 }), col, { w: 4, seed: x });
      inkFill(g, wobblyPoly([{ x: x - 24, y: 470 }, { x, y: 400 }, { x: x + 24, y: 470 }], { amp: 1, seed: x + 1, step: 12 }), 0x3a2a22, { w: 3, seed: x + 1, heavy: 0 });
    }
    pen.fillStyle(0x9a6238, 1).fillRoundedRect(330, 508, 90, 22, 10).fillRoundedRect(560, 512, 96, 22, 10);
    paintTree(g, 60, 430, 3.4, 19); paintTree(g, 880, 430, 3.0, 20); paintBush(g, 480, 440, 2.4, 21);
  } else if (kind === 'park') {
    paintTree(g, 335, 430, 3.4, 11); paintTree(g, 640, 430, 3.0, 12); paintBush(g, 200, 440, 2.4, 13); paintBush(g, 830, 442, 2.8, 14);
  } else {
    pen.fillStyle(0xe8cf93, 1).fillRoundedRect(300, 440, 360, 92, 34);                           // a sandbox with a rim
    pen.fillStyle(0xf3dfae, 1).fillRoundedRect(318, 454, 324, 62, 26);
    pen.fillStyle(0xd95f5f, 1).lineStyle(9).lineBetween(330, 250, 298, 436).lineBetween(430, 250, 462, 436).lineBetween(326, 250, 434, 250);          // swing frame
    pen.lineStyle(3).lineBetween(352, 250, 351, 362).lineBetween(410, 250, 411, 362);
    pen.fillStyle(0xffd166, 1).fillRoundedRect(338, 358, 84, 14, 5);
    pen.fillStyle(0x6ec6ff, 1).fillTriangle(604, 252, 600, 436, 764, 436);                          // a wobbly slide
    pen.fillStyle(0x4da3d9, 1).fillRect(584, 250, 16, 190);
    paintBush(g, 160, 442, 2.2, 15); paintTree(g, 880, 430, 2.6, 16);
  }
}

// The look a room starts with, as plain data (saves store only what differs from it).
export const defaultLook = (type, w = W) => ({
  wall: type.style ? type.style.wall : null,
  floor: type.style ? type.style.floor : null,
  windows: (type.windows || []).map(win => ({ ...win, x: Math.round(win.x * w / W / 10) * 10 })),
});

// Paint any room: outdoor rooms paint themselves, indoor ones come from their look.
export function paintRoom(g, type, look, w = W) {
  if (!type.outdoor) return paintIndoor(g, type, look, w);
  type.draw(g);                                                 // outdoor art is one screen; stretched rooms get more lawn
  if (w > W) g.fillStyle(MAP_COLORS.grass, 1).fillRect(W, WALL_H, w - W, H - WALL_H);
}

// The doorway between two neighbouring rooms, at world x = `x` (the seam): a wobbly white frame pillar with
// the next room's side wall receding beside it, as in the style guide.
export function paintDivider(g, x) {
  const P = 27, FOOT = 506, pen = new InkPen(g, 61, { weight: LINE });
  const wedge = [{ x: x + P, y: -4 }, { x: x + 112, y: -4 }, { x: x + 112, y: WALL_H }, { x: x + P, y: FOOT - 6 }];
  pen.fillStyle(0xeae3d0, 1).fillPoints(wedge, true);                                            // the receding side wall
  g.fillStyle(0x000000, 0.06).fillPoints(wedge, true);
  inkLine(g, { x: x + P, y: FOOT - 8 }, { x: x + 112, y: WALL_H + 4 }, { w: 5, seed: 62, amp: 2, heavy: 0 });     // sloping skirting
  pen.fillStyle(0xf4f1e8, 1).fillRect(x - P, -6, P * 2, FOOT + 6);                                // the pillar
  inkLine(g, { x: x - P + 12, y: 0 }, { x: x - P + 13, y: FOOT }, { w: 2.2, seed: 63, amp: 1.4, heavy: 0, color: shade(0xf4f1e8, 0.7) });
  pen.fillStyle(0xe2dcc8, 1).fillRoundedRect(x - P - 7, FOOT - 3, P * 2 + 14, 14, 4);              // foot block
}
