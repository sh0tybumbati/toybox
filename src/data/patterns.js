// Shirt patterns: stripes, dots, stars, hearts and checks, laid out inside a body outline. Pure geometry: `patternMarks`
// returns the shapes to paint (clipped to the outline by construction) and `paintPattern` draws them onto a Graphics.
export const PATTERNS = {
  stripes: { name: 'Stripes' },
  dots:    { name: 'Dots' },
  stars:   { name: 'Stars' },
  hearts:  { name: 'Hearts' },
  checks:  { name: 'Checks' },
};
export const PATTERN_IDS = Object.keys(PATTERNS);

// Is (x, y) inside the polygon?
export function insidePoly(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

// The left and right edge of the polygon along the horizontal line at y: { l, r } or null.
export function spanAt(poly, y) {
  const xs = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
  }
  return xs.length >= 2 ? { l: Math.min(...xs), r: Math.max(...xs) } : null;
}

const bounds = poly => ({
  x0: Math.min(...poly.map(p => p.x)), x1: Math.max(...poly.map(p => p.x)),
  y0: Math.min(...poly.map(p => p.y)), y1: Math.max(...poly.map(p => p.y)),
});

// The marks for `id` inside `poly` (an array of {x, y}). Each mark: { t: 'band', pts } | { t: 'dot'|'star'|'heart'|'square', x, y, r }.
export function patternMarks(id, poly) {
  const b = bounds(poly), marks = [];
  if (id === 'stripes') {
    for (let y = b.y0 + 8; y < b.y1 - 6; y += 22) {                  // horizontal bands as wide as the body at that height
      const top = spanAt(poly, y), bot = spanAt(poly, y + 11);
      if (top && bot) marks.push({ t: 'band', pts: [{ x: top.l, y }, { x: top.r, y }, { x: bot.r, y: y + 11 }, { x: bot.l, y: y + 11 }] });
    }
  } else if (id) {
    const step = id === 'checks' ? 20 : 25, r = id === 'checks' ? 8 : 6, kind = { dots: 'dot', stars: 'star', hearts: 'heart', checks: 'square' }[id];
    if (!kind) return marks;
    let row = 0;
    for (let y = b.y0 + 16; y < b.y1 - 8; y += step, row++) {
      for (let x = b.x0 + 14 + (id === 'checks' ? 0 : (row % 2) * step / 2); x < b.x1 - 8; x += step) {
        if (id === 'checks' && ((Math.round((x - b.x0) / step) + row) % 2)) continue;
        const m = id === 'checks' ? r + 1 : r + 4;
        if ([[0, 0], [m, 0], [-m, 0], [0, m], [0, -m]].every(([dx, dy]) => insidePoly(poly, x + dx, y + dy))) marks.push({ t: kind, x, y, r });
      }
    }
  }
  return marks;
}

// Paint marks in `color` (flat; the caller outlines the body afterwards).
export function paintPattern(g, marks, color) {
  g.fillStyle(color, 1);
  for (const m of marks) {
    if (m.t === 'band') g.fillPoints(m.pts, true);
    else if (m.t === 'dot') g.fillCircle(m.x, m.y, m.r);
    else if (m.t === 'square') g.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
    else if (m.t === 'star') {
      const pts = [];
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? 0.45 : 1; pts.push({ x: m.x + Math.cos(a) * m.r * 1.5 * k, y: m.y + Math.sin(a) * m.r * 1.5 * k }); }
      g.fillPoints(pts, true);
    } else if (m.t === 'heart') {
      const r = m.r;
      g.fillPoints([{ x: m.x, y: m.y + r * 1.3 }, { x: m.x - r * 1.4, y: m.y - r * 0.1 }, { x: m.x - r * 0.9, y: m.y - r * 1.1 }, { x: m.x, y: m.y - r * 0.4 }, { x: m.x + r * 0.9, y: m.y - r * 1.1 }, { x: m.x + r * 1.4, y: m.y - r * 0.1 }], true);
    }
  }
}
