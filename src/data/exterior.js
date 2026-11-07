// A building's outside: wall colour, trim, roof — and the little hand-inked model of it used on the
// city map and in the building-maker. Models are chubby and wonky on purpose (art/reference/): floors
// lean and shift a bit, roofs slump, windows are crooked, every edge is wobbly ink. Pure data + painters.
import { INK, blob, inkFill, inkLine, inkStroke, noise, wobblyPoly } from './ink.js';
import { shade } from './style.js';

export const EXTERIOR_WALLS = {
  butter:  { name: 'Butter',   color: 0xf3d98b, pattern: 'siding' },
  cream:   { name: 'Cream',    color: 0xf3e6c8, pattern: 'planks' },
  blush:   { name: 'Blush',    color: 0xf2b3c2, pattern: 'planks' },
  sky:     { name: 'Sky',      color: 0xa9d3ee, pattern: 'siding' },
  mint:    { name: 'Mint',     color: 0xa8dcc0, pattern: 'planks' },
  lilac:   { name: 'Lilac',    color: 0xc7b3ea, pattern: 'siding' },
  brick:   { name: 'Brick',    color: 0xd27a60, pattern: 'brick' },
  stone:   { name: 'Stone',    color: 0xbfc0c8, pattern: 'brick' },
  meadow:  { name: 'Hedge',    color: 0x7fc46a, pattern: 'planks' },
};
export const TRIMS = { white: 0xf4f1e8, brown: 0x8a5e3b, navy: 0x34466e, pink: 0xff8fa3, black: 0x33333a };
export const ROOF_STYLES = { gable: 'Peaked', flat: 'Flat', dome: 'Dome', none: 'None' };
export const ROOF_COLORS = {
  terracotta: 0xc9654a, slate: 0x6a7490, berry: 0xb8405f, forest: 0x4f8f5c, sunny: 0xe0b23f, plum: 0x7a58a8,
};

export const defaultExterior = () => ({ wall: 'cream', trim: 'white', roofStyle: 'gable', roofColor: 'terracotta' });

// Models are chubby: a room's width on the model grows slower than its real width (a three-room floor is
// not three times as wide as it is tall), so every building ends up squat and round-shouldered.
export const modelRoomW = w => 250 * Math.pow(w / 960, 0.7);

export const hashStr = s => { let h = 7; for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) | 0; return Math.abs(h) % 997 + 1; };

// Paint `building` as a model standing on the ground line y=baseY, centred on cx, scaled to fit in
// maxW x maxH. Returns { x0, x1, top } (its bounds) so the caller can place labels.
export function paintBuildingMini(g, building, cx, baseY, maxW, maxH, seedIn) {
  const ex = building.exterior || defaultExterior(), seed = seedIn ?? hashStr(building.name);
  const wall = EXTERIOR_WALLS[ex.wall] || EXTERIOR_WALLS.cream, trim = TRIMS[ex.trim] ?? TRIMS.white;
  const roofColor = ROOF_COLORS[ex.roofColor] ?? ROOF_COLORS.terracotta;
  const widths = building.floors.map(f => f.rooms.reduce((n, r) => n + modelRoomW(r.w), 0));
  const fullW = Math.max(...widths), FH = 285;
  const roofH = ex.roofStyle === 'none' ? 0 : ex.roofStyle === 'flat' ? 40 : 190;
  const squash = 0.84;                                                      // chubby: squashed taller-than-wide proportions
  const k = Math.min(maxW / (fullW * 1.06), maxH / ((building.floors.length * FH + roofH) * squash));
  const sx = k, sy = k * squash, lw = Math.max(2, Math.min(4.2, 2.6 + k * 4));    // ink weight follows the model's size
  const outdoor = building.floors.every(f => f.rooms.every(r => r.type === 'park' || r.type === 'playground'));
  const left = cx - (fullW * sx) / 2;

  if (outdoor) return paintGarden(g, cx, baseY, fullW * sx, maxH, seed, lw);

  // a soft flat shadow on the ground
  g.fillStyle(0x000000, 0.14).fillPoints(blob(cx, baseY + 2, fullW * sx * 0.58, 7, { n: 16, amp: 0.1, seed }), true);

  let y = baseY, topPoly = null;
  building.floors.forEach((f, i) => {
    const w = widths[i] * sx, h = FH * sy;
    const off = noise(i * 2.3, seed) * fullW * sx * 0.025, lean = noise(i * 1.7 + 5, seed) * w * 0.035;     // floors shift and lean a little
    const x0 = left + (fullW * sx - w) / 2 + off, top = y - h;
    const P = (u, v) => ({ x: x0 + w * u + lean * v, y: y - h * v });             // unit square -> this floor's leaning quad
    const quad = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)];
    inkFill(g, wobblyPoly(quad, { amp: 1.4, seed: seed + i, step: 14 }), wall.color, { w: lw, seed: seed + i });

    const line = shade(wall.color, 0.74);                                           // wall texture, as thin ink-ish lines
    if (wall.pattern === 'planks') {
      for (let j = 1; j < 9; j++) { const u = j / 9 + noise(j, seed) * 0.012; inkLine(g, P(u, 0.02), P(u, 0.98), { color: line, w: 1.6, seed: seed + j, amp: 0.9 }); }
    } else if (wall.pattern === 'siding') {
      for (let j = 1; j < 6; j++) { const v = j / 6; inkLine(g, P(0.02, v), P(0.98, v), { color: line, w: 1.6, seed: seed + j, amp: 0.9 }); }
    } else {
      for (let j = 1; j < 7; j++) {
        const v = j / 7; inkLine(g, P(0.02, v), P(0.98, v), { color: line, w: 1.4, seed: seed + j, amp: 0.8 });
        for (let u = (j % 2 ? 0.1 : 0.17); u < 1; u += 0.14) inkLine(g, P(u, v - 1 / 7), P(u, v), { color: line, w: 1.4, seed: seed + j + u * 9, amp: 0.6 });
      }
    }
    // a slab line between floors and the trim along the base of each floor
    inkLine(g, P(-0.01, 0.02), P(1.01, 0.02), { color: INK, w: lw * 1.1, seed: seed + 11 + i, amp: 1.2 });

    let rx = 0;
    f.rooms.forEach((r, ri) => {
      const u0 = rx / widths[i], u1 = (rx + modelRoomW(r.w)) / widths[i], uc = (u0 + u1) / 2;
      if (ri > 0) inkLine(g, P(u0, 0.03), P(u0, 0.97), { color: trim, w: lw * 0.9, seed: seed + ri * 5, amp: 1.4 });
      const ww = Math.min((u1 - u0) * 0.42, 0.3), wv0 = 0.4 + noise(ri * 3 + i, seed) * 0.05, wv1 = wv0 + 0.3 + noise(ri + i * 2, seed) * 0.05;
      const dx = (i === 0 && ri === 0) ? (u1 - u0) * 0.18 : 0, cxu = uc + dx;
      const win = [P(cxu - ww / 2, wv0), P(cxu + ww / 2, wv0 + 0.01), P(cxu + ww / 2 + 0.005, wv1), P(cxu - ww / 2, wv1 - 0.01)];
      inkFill(g, wobblyPoly(win, { amp: 1, seed: seed + ri + i * 7, step: 10 }), 0xcfe8f0, { w: lw * 0.85, seed: seed + ri + i, heavy: 0 });
      inkLine(g, P(cxu, wv0 + 0.01), P(cxu, wv1 - 0.01), { w: lw * 0.6, seed: seed + 3, amp: 0.6, step: 8 });
      inkLine(g, P(cxu - ww / 2, (wv0 + wv1) / 2), P(cxu + ww / 2, (wv0 + wv1) / 2), { w: lw * 0.6, seed: seed + 4, amp: 0.6, step: 8 });
      if (i === 0 && ri === 0) {                                                       // front door, a bit crooked
        const dw = Math.min((u1 - u0) * 0.12, 0.09), d0 = u0 + (u1 - u0) * 0.1;
        inkFill(g, wobblyPoly([P(d0, 0.02), P(d0 + dw * 2, 0.02), P(d0 + dw * 2 - 0.004, 0.52), P(d0 + 0.004, 0.5)], { amp: 0.9, seed: seed + 9, step: 10 }), shade(roofColor, 0.82), { w: lw * 0.9, seed: seed + 9, heavy: 0 });
      }
      rx += modelRoomW(r.w);
    });
    topPoly = quad;
    y = top;
  });

  const tl = topPoly[3], tr = topPoly[2], tw = tr.x - tl.x, over = tw * 0.09, rsy = sy;
  const slump = noise(3, seed) * tw * 0.05;
  if (ex.roofStyle === 'gable') {
    const apex = { x: tl.x + tw * (0.5 + noise(1, seed) * 0.12), y: tl.y - roofH * rsy };
    const chim = { x: tl.x + tw * (0.7 + noise(2, seed) * 0.1) };
    inkFill(g, wobblyPoly([{ x: chim.x, y: tl.y - roofH * rsy * 0.35 }, { x: chim.x + tw * 0.07, y: tl.y - roofH * rsy * 0.35 }, { x: chim.x + tw * 0.07, y: tl.y - roofH * rsy * 0.85 }, { x: chim.x, y: tl.y - roofH * rsy * 0.85 }], { amp: 0.8, seed: seed + 2, step: 8 }), 0x9a6a50, { w: lw * 0.9, seed: seed + 2, heavy: 0 });
    const roof = [{ x: tl.x - over, y: tl.y + 4 + slump }, apex, { x: tr.x + over, y: tr.y + 4 - slump }, { x: tr.x + over - tw * 0.04, y: tr.y + 12 - slump }, { x: tl.x - over + tw * 0.04, y: tl.y + 12 + slump }];
    inkFill(g, wobblyPoly(roof, { amp: 1.3, seed: seed + 5, step: 12 }), roofColor, { w: lw * 1.1, seed: seed + 5 });
    for (let j = 0; j < 6; j++) {                                                  // a few scribbled shingles
      const u = 0.25 + (j % 3) * 0.2, vv = 0.3 + Math.floor(j / 3) * 0.28;
      const px = tl.x + tw * u + (apex.x - tl.x - tw * 0.5) * (1 - vv) * 0.4, py = tl.y - roofH * rsy * vv;
      inkStroke(g, [{ x: px - 4, y: py + 1 }, { x: px, y: py - 2 }, { x: px + 4, y: py + 1 }], { color: shade(roofColor, 0.7), w: 1.6, heavy: 0, seed: j });
    }
  } else if (ex.roofStyle === 'flat') {
    const slab = [{ x: tl.x - over * 0.5, y: tl.y - roofH * rsy + slump * 0.3 }, { x: tr.x + over * 0.5, y: tr.y - roofH * rsy - slump * 0.3 }, { x: tr.x + over * 0.5, y: tr.y + 3 }, { x: tl.x - over * 0.5, y: tl.y + 3 }];
    inkFill(g, wobblyPoly(slab, { amp: 1.2, seed: seed + 6, step: 12 }), roofColor, { w: lw * 1.1, seed: seed + 6 });
  } else if (ex.roofStyle === 'dome') {
    inkFill(g, blob(tl.x + tw / 2, tl.y, tw * 0.58, roofH * rsy * 0.95, { n: 22, amp: 0.05, seed: seed + 4 }).filter(p => p.y <= tl.y + 2).concat([{ x: tr.x + over, y: tl.y + 3 }, { x: tl.x - over, y: tl.y + 3 }]), roofColor, { w: lw * 1.1, seed: seed + 4 });
  }
  return { x0: left, x1: left + fullW * sx, top: tl.y - roofH * rsy };
}

// A park: a lumpy green mound with a couple of wobbly trees.
function paintGarden(g, cx, baseY, w, maxH, seed, lw) {
  inkFill(g, blob(cx, baseY - maxH * 0.18, w * 0.56, maxH * 0.2, { n: 20, amp: 0.08, seed }), 0x8fcf74, { w: lw, seed });
  for (const [dx, s] of [[-0.28, 1], [0.05, 1.25], [0.3, 0.9]]) {
    const tx = cx + w * dx, ty = baseY - maxH * 0.2;
    inkFill(g, wobblyPoly([{ x: tx - 3 * s, y: ty }, { x: tx + 3 * s, y: ty }, { x: tx + 2.4 * s, y: ty - maxH * 0.3 * s }, { x: tx - 2.4 * s, y: ty - maxH * 0.3 * s }], { amp: 0.6, seed: seed + dx * 10, step: 8 }), 0x8a5a3b, { w: lw * 0.8, seed, heavy: 0 });
    for (const [ox, oy, r] of [[-0.12, -0.34, 0.14], [0.12, -0.34, 0.14], [0, -0.46, 0.17]]) inkFill(g, blob(tx + ox * w * s, ty + oy * maxH * s, r * w * s, r * w * s * 0.9, { n: 14, amp: 0.1, seed: seed + oy * 20 }), 0x58a65a, { w: lw * 0.9, seed: seed + ox * 9, heavy: 0 });
  }
  return { x0: cx - w / 2, x1: cx + w / 2, top: baseY - maxH * 0.75 };
}

// The building-maker's cut-through: floors stacked bottom to top, each room a wobbly box as wide as it is, floors
// shifted and leaning a little, crooked supports holding each floor up, and the roof slumping on top (the "stackable
// rooms" panel of the style guide). Returns the room rectangles for hit-testing: [{ id, x, y, w, h }].
//   opts: { x, y (top of the roof), width (max floor width in px), rowH, gap, roofH, colorOf(type), selected (room id) }
export function paintCutaway(g, building, opts) {
  const { x, y, width, rowH, gap, roofH, colorOf, selected } = opts, seed = hashStr(building.name) + 3;
  const ex = building.exterior || defaultExterior(), roofColor = ROOF_COLORS[ex.roofColor] ?? ROOF_COLORS.terracotta;
  const widths = building.floors.map(f => f.rooms.reduce((n, r) => n + r.w, 0));
  const k = width / Math.max(...widths), rects = [];
  const floorTop = i => y + roofH + (building.floors.length - 1 - i) * (rowH + gap);          // top floor first, from the top
  const offs = building.floors.map((_, i) => noise(i * 1.9, seed) * 6);

  // crooked supports first (they sit behind the rooms)
  building.floors.forEach((f, i) => {
    if (i === building.floors.length - 1) return;
    const lowerTop = floorTop(i), upperBottom = floorTop(i + 1) + rowH, w = Math.min(widths[i], widths[i + 1]) * k;
    const left = x + Math.max(offs[i], offs[i + 1]);
    for (const u of [0.1, 0.5, 0.9]) {
      const px = left + w * u, lean = noise(u * 9 + i, seed) * 7;
      inkLine(g, { x: px + lean, y: upperBottom - 1 }, { x: px, y: lowerTop + 1 }, { w: 6, seed: seed + i * 5 + u * 20, amp: 1.5, heavy: 0 });
    }
  });
  // ground
  const gy = floorTop(0) + rowH + 4;
  inkLine(g, { x: x - 14, y: gy }, { x: x + width + 14, y: gy + noise(2, seed) * 3 }, { w: 5, seed, amp: 2, heavy: 1 });

  building.floors.forEach((f, i) => {
    const top = floorTop(i);
    let rx = x + offs[i];
    f.rooms.forEach((r, ri) => {
      const rw = r.w * k, lean = noise(ri * 2.3 + i * 1.7, seed) * 4, sel = r.id === selected;
      const quad = [{ x: rx, y: top }, { x: rx + rw - 4, y: top + noise(ri + i, seed) * 2 }, { x: rx + rw - 4 + lean, y: top + rowH }, { x: rx + lean * 0.5, y: top + rowH + noise(ri * 3 + i, seed) * 2 }];
      inkFill(g, wobblyPoly(quad, { amp: 1.4, seed: r.id + 11, step: 18 }), colorOf(r.type), { w: sel ? 6.4 : 3.6, seed: r.id + 11, heavy: sel ? 3 : 1 });
      // a crooked little window in each room, for character
      const wx = rx + rw * 0.18, ww = Math.min(rw * 0.22, 22), wy = top + rowH * 0.18, wh = rowH * 0.38;
      if (rowH > 30) inkFill(g, wobblyPoly([{ x: wx, y: wy }, { x: wx + ww, y: wy + 1 }, { x: wx + ww + 1, y: wy + wh }, { x: wx, y: wy + wh - 1 }], { amp: 0.7, seed: r.id, step: 8 }), 0xcfe8f0, { w: 2.2, seed: r.id, heavy: 0 });
      rects.push({ id: r.id, x: rx, y: top, w: rw - 4, h: rowH });
      rx += rw;
    });
  });

  // the roof, slumped on top of the highest floor
  const topI = building.floors.length - 1, tx0 = x + offs[topI], tx1 = tx0 + widths[topI] * k, tw = tx1 - tx0, ty = floorTop(topI), over = tw * 0.05;
  const slump = noise(5, seed) * 5, lw = 4;
  if (ex.roofStyle === 'gable') {
    const apex = { x: tx0 + tw * (0.5 + noise(1, seed) * 0.12), y: ty - roofH * 0.95 };
    inkFill(g, wobblyPoly([{ x: tx0 - over, y: ty + 3 + slump }, apex, { x: tx1 + over, y: ty + 3 - slump }, { x: tx1 + over - 8, y: ty + 9 - slump }, { x: tx0 - over + 8, y: ty + 9 + slump }], { amp: 1.4, seed: seed + 6, step: 14 }), roofColor, { w: lw, seed: seed + 6 });
  } else if (ex.roofStyle === 'flat') {
    inkFill(g, wobblyPoly([{ x: tx0 - over, y: ty - roofH * 0.35 + slump * 0.4 }, { x: tx1 + over, y: ty - roofH * 0.35 - slump * 0.4 }, { x: tx1 + over, y: ty + 3 }, { x: tx0 - over, y: ty + 3 }], { amp: 1.2, seed: seed + 7, step: 14 }), roofColor, { w: lw, seed: seed + 7 });
  } else if (ex.roofStyle === 'dome') {
    inkFill(g, blob(tx0 + tw / 2, ty, tw * 0.55, roofH * 0.95, { n: 22, amp: 0.05, seed: seed + 8 }).filter(p => p.y <= ty + 2).concat([{ x: tx1 + over, y: ty + 3 }, { x: tx0 - over, y: ty + 3 }]), roofColor, { w: lw, seed: seed + 8 });
  }
  return rects;
}
