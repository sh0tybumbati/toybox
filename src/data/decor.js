// How rooms look, as data. An indoor room is a wallpaper + a floor + windows (+ fixed `decor`
// art), so players can repaint walls and floors and move windows (the look is saved per room;
// see systems/save.js `looks`). Wall area is y 0..WALL_H, floor is WALL_H..H.
// All painters draw onto a Graphics in room-local coordinates (0..W).
import { W, H } from '../config.js';
import { sunbeamShapes, SUNBEAM_ALPHA, tonal } from './style.js';


export const WALL_H = 430;

const lines = (g, color, step, vertical, horizontal, w) => {
  g.lineStyle(2, color, 1);
  if (vertical) for (let x = 0; x < w; x += step) g.lineBetween(x, 0, x, WALL_H);
  if (horizontal) for (let y = 0; y < WALL_H; y += step) g.lineBetween(0, y, w, y);
};
const planks = (g, base, shade, line, rowH, w) => {
  g.fillStyle(base, 1).fillRect(0, WALL_H, w, H - WALL_H);
  g.lineStyle(2, line, 1);
  for (let y = WALL_H + rowH, r = 0; y < H; y += rowH, r++) {
    g.lineBetween(0, y, w, y);
    for (let x = (r % 2) * 110; x < w; x += 220) g.lineBetween(x, y - rowH, x, y);   // staggered boards
  }
  g.fillStyle(shade, 1).fillRect(0, WALL_H, w, 8);                                 // skirting
};

export const WALLPAPERS = {
  cream:    { name: 'Cream',          paint: (g, w) => g.fillStyle(0xffe8b0, 1).fillRect(0, 0, w, WALL_H) },
  sage:     { name: 'Sage',           paint: (g, w) => { g.fillStyle(0xbfe3d4, 1).fillRect(0, 0, w, WALL_H); g.fillStyle(0xa9d3c1, 1).fillRect(0, 380, w, 50); } },
  blush:    { name: 'Blush',          paint: (g, w) => g.fillStyle(0xfdeee6, 1).fillRect(0, 0, w, WALL_H) },
  mintTiles: { name: 'Mint tiles',    paint: (g, w) => { g.fillStyle(0xcdeee6, 1).fillRect(0, 0, w, WALL_H); lines(g, 0xb6dcd3, 60, true, true, w); } },
  pinkStripes: { name: 'Pink stripes', paint: (g, w) => { g.fillStyle(0xffe3ec, 1).fillRect(0, 0, w, WALL_H); g.fillStyle(0xffd0dc, 1); for (let x = 0; x < w; x += 80) g.fillRect(x, 0, 40, WALL_H); } },
  panel:    { name: 'Lavender panel', paint: (g, w) => { g.fillStyle(0xdfe6f2, 1).fillRect(0, 0, w, WALL_H); g.fillStyle(0xc9d3e6, 1).fillRect(0, 300, w, 130); g.lineStyle(3, 0xb3bfd6, 1).lineBetween(0, 300, w, 300); } },
  shells:   { name: 'Seashells',      paint: (g, w) => {
    g.fillStyle(0xf3ead2, 1).fillRect(0, 0, w, 300);
    g.fillStyle(0xa9cfc4, 1);
    for (let y = 0; y < 300; y += 70) for (let x = (y / 70 % 2) * 35; x < w; x += 70) g.fillCircle(x + 35, y + 35, 24);
    g.fillStyle(0xf3ead2, 1);
    for (let y = 0; y < 300; y += 70) for (let x = (y / 70 % 2) * 35; x < w; x += 70) g.fillCircle(x + 35, y + 35, 14);
    g.fillStyle(0x9dbdb8, 1).fillRect(0, 300, w, WALL_H - 300);                       // teal wainscot
    g.fillStyle(0xdfeceb, 1).fillRect(0, 296, w, 8);
  } },
  sky:      { name: 'Sky dots',       paint: (g, w) => { g.fillStyle(0xd6ecff, 1).fillRect(0, 0, w, WALL_H); g.fillStyle(0xffffff, 1); for (let y = 30; y < WALL_H; y += 60) for (let x = (y / 60 % 2) * 30; x < w; x += 60) g.fillCircle(x + 20, y, 7); } },
};

export const FLOORS = {
  honey:   { name: 'Honey wood',   paint: (g, w) => planks(g, 0xc98f5a, 0xb07a48, 0xb8824f, 38, w) },
  oak:     { name: 'Light oak',    paint: (g, w) => planks(g, 0xf0cfa8, 0xe3bd92, 0xe2bc92, 40, w) },
  warm:    { name: 'Warm wood',    paint: (g, w) => planks(g, 0xd9a86c, 0xb98550, 0xc2915a, 34, w) },
  shop:    { name: 'Boardwalk',    paint: (g, w) => planks(g, 0xcfae86, 0xb8936b, 0xb8936b, 30, w) },
  checker: { name: 'Checkered',    paint: (g, w) => {
    for (let row = 0; row < 3; row++) for (let col = 0; col * 60 < w; col++) g.fillStyle((row + col) % 2 ? 0xf1e4d0 : 0xe0cfb5, 1).fillRect(col * 60, WALL_H + row * 57, 60, 57);
    g.fillStyle(0xa8c9c0, 1).fillRect(0, WALL_H, w, 8);
  } },
  carpet:  { name: 'Purple carpet', paint: (g, w) => { g.fillStyle(0x8e7cc3, 1).fillRect(0, WALL_H, w, H - WALL_H); g.fillStyle(0x7a68b0, 1).fillRect(0, WALL_H, w, 8); } },
  stars:   { name: 'Star tiles',   paint: (g, w) => {
    g.fillStyle(0xf3ece8, 1).fillRect(0, WALL_H, w, H - WALL_H);
    g.fillStyle(0xcdbfb8, 1);
    for (let y = WALL_H + 30; y < H; y += 56) for (let x = (((y - WALL_H) / 56) % 2) * 50; x < w; x += 100) g.fillTriangle(x + 50, y - 12, x + 40, y + 6, x + 60, y + 6);
    g.fillStyle(0xd8cdc7, 1).fillRect(0, WALL_H, w, 8);
  } },
};

// A window: sky, white frame, cross bars. `w` = { x, y, w, h } in room-local coordinates.
export function paintWindow(g, w) {
  g.fillStyle(0x9bd8ff, 1).fillRoundedRect(w.x, w.y, w.w, w.h, 10);
  g.lineStyle(8, 0xffffff, 1).strokeRoundedRect(w.x, w.y, w.w, w.h, 10);
  g.lineStyle(5, tonal(0xffffff, 0.86), 1).lineBetween(w.x + w.w / 2, w.y, w.x + w.w / 2, w.y + w.h).lineBetween(w.x, w.y + w.h / 2, w.x + w.w, w.y + w.h / 2);   // bars: a tonal line, not pure white
}

// Light coming through each window as hard-edged pale shapes on the wall and floor (house style:
// the only light effect). Painted on its own Graphics so it can be hidden at night.
export function paintSunbeams(g, windows, w = W) {
  g.fillStyle(0xffffff, SUNBEAM_ALPHA);
  for (const win of windows) for (const poly of sunbeamShapes(win, w, WALL_H, H)) g.fillPoints(poly, true);
}

// A whole indoor room from its look; `decor` is the room type's fixed extra art.
// look = { wall, floor, windows } (ids from WALLPAPERS/FLOORS; unknown ids fall back to the defaults).
export function paintIndoor(g, type, look, w = W) {
  const wall = WALLPAPERS[look.wall] || WALLPAPERS[type.style.wall];
  const floor = FLOORS[look.floor] || FLOORS[type.style.floor];
  wall.paint(g, w);
  floor.paint(g, w);
  for (const win of look.windows) paintWindow(g, win);
  if (type.decor) {                                          // fixed art sits in the middle of a stretched room
    g.save().translateCanvas((w - W) / 2, 0);
    type.decor(g);
    g.restore();
  }
}

// Paint any room: outdoor rooms draw themselves, indoor ones come from their look.
export function paintRoom(g, type, look, w = W) {
  if (!type.outdoor) return paintIndoor(g, type, look, w);
  type.draw(g);                                                 // outdoor art is one screen; stretched rooms get more lawn
  if (w > W) g.fillStyle(0x66b552, 1).fillRect(W, 430, w - W, H - 430);
}

// The look a room starts with, as plain data (saves store only what differs from it).
export const defaultLook = (type, w = W) => ({
  wall: type.style ? type.style.wall : null,
  floor: type.style ? type.style.floor : null,
  windows: (type.windows || []).map(win => ({ ...win, x: Math.round(win.x * w / W / 10) * 10 })),
});

// The doorway between two neighbouring rooms, at world x = `x` (the seam): a white frame
// pillar with the next room's side wall receding beside it, as in Toca-style houses.
export function paintDivider(g, x) {
  const P = 27, FOOT = 506;                                           // half pillar width, where its foot meets the floor
  g.fillStyle(0xeaf0f1, 1).fillPoints([{ x: x + P, y: 0 }, { x: x + 112, y: 0 }, { x: x + 112, y: WALL_H }, { x: x + P, y: FOOT - 6 }], true);   // receding side wall
  g.fillStyle(0x000000, 0.06).fillPoints([{ x: x + P, y: 0 }, { x: x + 112, y: 0 }, { x: x + 112, y: WALL_H }, { x: x + P, y: FOOT - 6 }], true);
  g.lineStyle(8, 0xf6f9f9, 1).lineBetween(x + P, FOOT - 8, x + 112, WALL_H + 4);                    // sloping skirting
  g.lineStyle(3, 0xa9bcc0, 1).lineBetween(x + P, FOOT - 14, x + 112, WALL_H - 2);
  g.fillStyle(0xf4f7f7, 1).fillRect(x - P, 0, P * 2, FOOT);                                          // the pillar
  g.lineStyle(3, 0xa9bcc0, 1).strokeRect(x - P, -4, P * 2, FOOT + 4).lineBetween(x - P + 12, 0, x - P + 12, FOOT);
  g.fillStyle(0xdde6e8, 1).fillRect(x - P - 6, FOOT - 2, P * 2 + 12, 12);                           // foot block
  g.lineStyle(3, 0xa9bcc0, 1).strokeRect(x - P - 6, FOOT - 2, P * 2 + 12, 12);
}
