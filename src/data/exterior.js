// A building's outside: wall colour, trim, roof. Pure data + painters (used on the city map and
// by the building-maker). `paintBuildingMini` draws a little cut-through model of a building.


export const EXTERIOR_WALLS = {
  butter:  { name: 'Butter',   color: 0xffe9a8, pattern: 'siding' },
  cream:   { name: 'Cream',    color: 0xfdf3e0, pattern: 'plain' },
  blush:   { name: 'Blush',    color: 0xffc9d6, pattern: 'plain' },
  sky:     { name: 'Sky',      color: 0xbfe1f7, pattern: 'siding' },
  mint:    { name: 'Mint',     color: 0xbfe8d2, pattern: 'plain' },
  lilac:   { name: 'Lilac',    color: 0xd7c8f0, pattern: 'siding' },
  brick:   { name: 'Brick',    color: 0xd9826a, pattern: 'brick' },
  stone:   { name: 'Stone',    color: 0xcfcfd6, pattern: 'brick' },
  meadow:  { name: 'Hedge',    color: 0x7fc46a, pattern: 'plain' },
};
export const TRIMS = { white: 0xffffff, brown: 0x8a5e3b, navy: 0x34466e, pink: 0xff8fa3, black: 0x33333a };
export const ROOF_STYLES = { gable: 'Peaked', flat: 'Flat', dome: 'Dome', none: 'None' };
export const ROOF_COLORS = {
  terracotta: 0xd9694a, slate: 0x66708a, berry: 0xc9406a, forest: 0x4f9a62, sunny: 0xf2c04a, plum: 0x7a58b8,
};

export const defaultExterior = () => ({ wall: 'cream', trim: 'white', roofStyle: 'gable', roofColor: 'terracotta' });

const shade = (c, k) => {                                        // multiply a colour's brightness
  const r = Math.min(255, Math.round(((c >> 16) & 255) * k)), g = Math.min(255, Math.round(((c >> 8) & 255) * k)), b = Math.min(255, Math.round((c & 255) * k));
  return (r << 16) | (g << 8) | b;
};

// Paint `building` as a model standing on the ground line y=baseY, centred on cx, scaled to fit
// in maxW x maxH. Returns { x0, x1, top } (its bounds) so the caller can place labels.
export function paintBuildingMini(g, building, cx, baseY, maxW, maxH) {
  const ex = building.exterior || defaultExterior();
  const wall = EXTERIOR_WALLS[ex.wall] || EXTERIOR_WALLS.cream, trim = TRIMS[ex.trim] ?? TRIMS.white;
  const roofColor = ROOF_COLORS[ex.roofColor] ?? ROOF_COLORS.terracotta;
  const widths = building.floors.map(f => f.rooms.reduce((n, r) => n + r.w, 0));
  const fullW = Math.max(...widths), floorH = 330;
  const roofH = ex.roofStyle === 'none' ? 0 : ex.roofStyle === 'flat' ? 50 : 230;
  const k = Math.min(maxW / fullW, maxH / (building.floors.length * floorH + roofH));
  const x0 = cx - (fullW * k) / 2;
  const outdoor = building.floors.every(f => f.rooms.every(r => r.type === 'park' || r.type === 'playground'));

  if (outdoor) {                                                  // a park: lawn and trees instead of walls
    g.fillStyle(0x8bd17c, 1).fillRoundedRect(x0, baseY - 70 * k * 2.2, fullW * k, 70 * k * 2.2, 10);
    for (let i = 0; i < 3; i++) {
      const tx = x0 + fullW * k * (0.2 + i * 0.3);
      g.fillStyle(0x8a5e3b, 1).fillRect(tx - 4, baseY - 100 * k * 2.2, 8, 60 * k * 2.2);
      g.fillStyle(0x3e9a4a, 1).fillCircle(tx, baseY - 110 * k * 2.2, 26 * k * 2.2);
    }
    return { x0, x1: x0 + fullW * k, top: baseY - 140 * k * 2.2 };
  }

  let y = baseY;
  building.floors.forEach((f, i) => {
    const w = widths[i] * k, h = floorH * k, top = y - h;
    g.fillStyle(wall.color, 1).fillRect(x0, top, w, h);
    g.lineStyle(Math.max(1, 2 * k * 3), shade(wall.color, 0.8), 0.7);                            // wall pattern
    if (wall.pattern === 'siding') for (let ly = top + h / 5; ly < y - 1; ly += h / 5) g.lineBetween(x0, ly, x0 + w, ly);
    if (wall.pattern === 'brick') {
      for (let ly = top + h / 6, r = 0; ly < y - 1; ly += h / 6, r++) {
        g.lineBetween(x0, ly, x0 + w, ly);
        for (let lx = x0 + (r % 2 ? 0.5 : 0) * 70 * k * 3; lx < x0 + w; lx += 70 * k * 3) g.lineBetween(lx, ly - h / 6, lx, ly);
      }
    }
    let rx = x0;                                                                                   // rooms: a window each, a door on the ground floor
    f.rooms.forEach((r, ri) => {
      const rw = r.w * k;
      if (ri > 0) { g.lineStyle(Math.max(1, 6 * k), trim, 1).lineBetween(rx, top, rx, y); }
      const ww = Math.min(rw * 0.4, 260 * k), wh = h * 0.36;
      g.fillStyle(0x9bd8ff, 1).fillRect(rx + rw / 2 - ww / 2 + (i === 0 && ri === 0 ? rw * 0.12 : 0), top + h * 0.22, ww, wh);
      g.lineStyle(Math.max(1, 5 * k), trim, 1).strokeRect(rx + rw / 2 - ww / 2 + (i === 0 && ri === 0 ? rw * 0.12 : 0), top + h * 0.22, ww, wh);
      if (i === 0 && ri === 0) {                                                                    // front door
        const dw = Math.min(rw * 0.12, 100 * k), dh = h * 0.5;
        g.fillStyle(shade(roofColor, 0.9), 1).fillRoundedRect(rx + rw * 0.12 - dw / 2, y - dh, dw, dh, 3);
      }
      rx += rw;
    });
    g.lineStyle(Math.max(1.5, 8 * k), trim, 1).strokeRect(x0, top, w, h);                           // floor frame
    y = top;
  });

  const topW = widths[widths.length - 1] * k, over = 36 * k;
  if (ex.roofStyle === 'gable') {
    g.fillStyle(roofColor, 1).fillTriangle(x0 - over, y, x0 + topW + over, y, x0 + topW / 2, y - roofH * k);
    g.fillStyle(shade(roofColor, 0.82), 1).fillTriangle(x0 + topW / 2, y - roofH * k, x0 + topW + over, y, x0 + topW / 2, y);
    g.fillStyle(trim, 1).fillRect(x0 - over, y - 5 * k, topW + over * 2, 10 * k);
  } else if (ex.roofStyle === 'flat') {
    g.fillStyle(roofColor, 1).fillRect(x0 - over / 2, y - roofH * k, topW + over, roofH * k);
    g.fillStyle(shade(roofColor, 1.15), 1).fillRect(x0 - over / 2, y - roofH * k, topW + over, 12 * k);
  } else if (ex.roofStyle === 'dome') {
    g.fillStyle(roofColor, 1).fillEllipse(x0 + topW / 2, y, topW + over, roofH * 2 * k);
    g.fillStyle(trim, 1).fillRect(x0 - over / 2, y - 4 * k, topW + over, 10 * k);
  }
  return { x0, x1: x0 + fullW * k, top: y - roofH * k };
}
