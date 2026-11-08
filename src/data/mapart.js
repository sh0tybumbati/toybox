// The city map's landscape, hand-inked (art/reference/): bumpy hills, jagged mountains, winding dirt
// paths, a river, wobbly trees and bushes, fences, signposts and dashed dirt build plots. Everything
// is flat matte colour with a dark uneven outline, drawn from fixed seeds so the map never jitters.
import { INK, blob, inkDashed, inkFill, inkLine, inkRect, inkStroke, inkTube, noise, smoothPath, wobblyPoly } from './ink.js';
import { shade } from './style.js';

export const MAP_COLORS = {
  grass: 0x9bcf6c, grassDark: 0x84bb58, hill: 0xaad87b, path: 0xead4a0, river: 0x7fc4e8, dirt: 0xb98a56,
  rock: 0xa6adb8, snow: 0xf3f2ee, tree: 0x5aa75a, treeDark: 0x47934b, trunk: 0x8a5a3b, wood: 0xd6a566, fence: 0xb88c5c,
};

// A lumpy hill: flat fill, ink only along the top (the bottom melts into the grass).
export function paintHill(g, cx, cy, rx, ry, color, seed) {
  const top = blob(cx, cy + ry * 0.2, rx, ry, { n: 26, amp: 0.1, seed }).filter(p => p.y <= cy + ry * 0.2).sort((a, b) => a.x - b.x);
  g.fillStyle(color, 1).fillPoints([...top, { x: cx + rx, y: cy + ry }, { x: cx - rx, y: cy + ry }], true);
  inkStroke(g, top, { w: 3.2, seed, heavy: 1 });
}

export function paintMountain(g, x, baseY, w, h, seed) {
  const peaks = 4, top = [];
  for (let i = 0; i <= peaks * 2; i++) {
    const u = i / (peaks * 2), up = i % 2 === 0 ? 1 : 0.55;
    top.push({ x: x + w * u + noise(i, seed) * 6, y: baseY - h * (Math.sin(Math.PI * u) * 0.7 + 0.3) * up * (0.85 + 0.15 * noise(i + 9, seed)) });
  }
  const poly = [{ x, y: baseY }, ...top, { x: x + w, y: baseY }];
  inkFill(g, wobblyPoly(poly, { amp: 1.2, seed, step: 22 }), MAP_COLORS.rock, { w: 3.4, seed });
  const peak = top.reduce((a, b) => (b.y < a.y ? b : a), top[0]);                               // a wobbly snow cap on the tallest peak
  inkFill(g, [{ x: peak.x - 22, y: peak.y + 26 }, { x: peak.x - 8, y: peak.y + 18 }, { x: peak.x, y: peak.y }, { x: peak.x + 10, y: peak.y + 20 }, { x: peak.x + 22, y: peak.y + 28 }, { x: peak.x + 6, y: peak.y + 24 }, { x: peak.x - 6, y: peak.y + 32 }], MAP_COLORS.snow, { w: 2.6, seed, heavy: 0 });
}

export function paintTree(g, x, y, s, seed) {
  inkFill(g, wobblyPoly([{ x: x - 4 * s, y }, { x: x + 4 * s, y }, { x: x + 3 * s, y: y - 22 * s }, { x: x - 3 * s, y: y - 22 * s }], { amp: 0.8, seed, step: 8 }), MAP_COLORS.trunk, { w: 2.6, seed, heavy: 0 });
  g.fillStyle(0x000000, 0.12).fillPoints(blob(x, y + 1, 16 * s, 4 * s, { n: 10, seed }), true);
  for (const [ox, oy, r, c] of [[-11, -30, 14, 0], [11, -30, 14, 0], [0, -42, 17, 1], [0, -26, 15, 1]]) {
    inkFill(g, blob(x + ox * s, y + oy * s, r * s, r * s * 0.92, { n: 14, amp: 0.12, seed: seed + ox + oy }), c ? MAP_COLORS.tree : MAP_COLORS.treeDark, { w: 2.8, seed: seed + oy, heavy: 0 });
  }
}

export function paintBush(g, x, y, s, seed) {
  for (const [ox, r] of [[-8, 9], [8, 9], [0, 11]]) inkFill(g, blob(x + ox * s, y - 8 * s, r * s, r * s * 0.85, { n: 11, amp: 0.12, seed: seed + ox }), MAP_COLORS.treeDark, { w: 2.4, seed: seed + ox, heavy: 0 });
}

// A winding track: a pale tube with a thin ink edge and a few scuff marks. `pts` are waypoints.
export function paintPath(g, pts, width, seed, color = MAP_COLORS.path) {
  const c = smoothPath(pts, 7);
  inkTube(g, c, () => width, color, { w: 2.6, seed, heavy: 3 });
  for (let i = 5; i < c.length - 5; i += 9) inkStroke(g, [{ x: c[i].x - 4, y: c[i].y + 1 }, { x: c[i].x + 3, y: c[i].y - 1 }], { color: shade(color, 0.8), w: 1.6, heavy: 0, seed: i });
}

export function paintRiver(g, pts, width, seed) {
  const c = smoothPath(pts, 7);
  inkTube(g, c, k => width * (0.9 + 0.2 * Math.sin(k * 9)), MAP_COLORS.river, { w: 3, seed, heavy: 3 });
  for (let i = 4; i < c.length - 4; i += 8) inkStroke(g, [{ x: c[i].x - 6, y: c[i].y }, { x: c[i].x - 2, y: c[i].y - 3 }, { x: c[i].x + 2, y: c[i].y }, { x: c[i].x + 6, y: c[i].y - 3 }], { color: 0xdff2fb, w: 1.8, heavy: 0, seed: i });
}

export function paintFence(g, x0, y0, x1, y1, seed) {
  const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 22));
  inkLine(g, { x: x0, y: y0 - 14 }, { x: x1, y: y1 - 14 }, { color: INK, w: 2.8, seed, amp: 1.5 });
  inkLine(g, { x: x0, y: y0 - 6 }, { x: x1, y: y1 - 6 }, { color: INK, w: 2.8, seed: seed + 1, amp: 1.5 });
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
    inkRect(g, x - 2.5, y - 20, 5, 22, MAP_COLORS.fence, { w: 2.2, seed: seed + i, amp: 0.7, step: 8, heavy: 0 });
  }
}

// A wooden signpost; returns the board's centre so the caller can put its words there.
export function paintSign(g, x, y, w, h, seed) {
  inkRect(g, x - 3, y - h * 0.2, 6, h * 0.9, MAP_COLORS.trunk, { w: 2.4, seed, amp: 0.7, step: 8, heavy: 0 });
  inkRect(g, x - w / 2, y - h * 1.0, w, h * 0.8, MAP_COLORS.wood, { w: 3, seed: seed + 2, amp: 1.3, step: 12 });
  return { x, y: y - h * 0.6 };
}

// A flat, uneven plot of dirt. `empty` plots get a dashed outline (an invitation to build).
export function paintPlot(g, cx, cy, rx, ry, seed, empty) {
  const pts = blob(cx, cy, rx, ry, { n: 22, amp: 0.1, seed });
  g.fillStyle(MAP_COLORS.dirt, 1).fillPoints(pts, true);
  g.fillStyle(0x000000, 0.08).fillPoints(blob(cx + 6, cy + 4, rx * 0.7, ry * 0.6, { n: 14, amp: 0.1, seed: seed + 3 }), true);
  if (empty) inkDashed(g, pts, { w: 3, on: 3, off: 2 });
  else inkStroke(g, pts, { w: 2.4, seed, heavy: 1 });
}

// The whole landscape behind the lots.
export function paintTerrain(g, W, H, paths, riverPts) {
  g.fillStyle(MAP_COLORS.grass, 1).fillRect(0, 0, W, H);
  for (let i = 0; i < 14; i++) {                                                 // patches of darker, lumpier grass
    g.fillStyle(MAP_COLORS.grassDark, 0.55).fillPoints(blob(40 + ((i * 193) % 900), 120 + ((i * 131) % 440), 70 + (i % 3) * 18, 26 + (i % 2) * 10, { n: 14, amp: 0.15, seed: i + 30 }), true);
  }
  paintMountain(g, -20, 130, 250, 120, 1);
  paintMountain(g, 730, 118, 260, 108, 2);
  paintHill(g, 330, 112, 120, 38, MAP_COLORS.hill, 4);
  paintHill(g, 560, 104, 100, 30, MAP_COLORS.hill, 5);
  paintHill(g, 60, 560, 100, 34, MAP_COLORS.hill, 6);
  paintRiver(g, riverPts, 24, 9);
  paths.forEach((p, i) => paintPath(g, p, i < 2 ? 34 : 26, 10 + i));
}

// Trees, bushes and fences scattered about (called after the plots so they sit in front where needed).
export function paintScenery(g) {
  const trees = [];
  for (const [i, x] of [195, 385, 575, 765].entries()) for (const [j, y] of [118, 250, 380, 512].entries()) if ((i + j) % 2 === 0) trees.push([x + (j % 2 ? 14 : -12), y, 0.78 + ((i * 3 + j) % 3) * 0.06]);
  trees.push([24, 112, 0.9], [940, 236, 0.9], [26, 380, 0.9], [940, 505, 0.9], [20, 260, 0.8], [942, 120, 0.85]);
  for (const [x, y, s] of trees.sort((a, b) => a[1] - b[1])) paintTree(g, x, y, s, Math.round(x + y));
  for (const [x, y, s] of [[392, 188, 0.9], [196, 322, 0.9], [580, 452, 0.9], [770, 326, 0.9], [380, 454, 0.8], [60, 330, 0.9], [900, 190, 0.9]]) paintBush(g, x, y, s, Math.round(x * 3 + y));
}
