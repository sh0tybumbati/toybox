// The ink painter: hand-drawn, wobbly shapes with uneven line weight (the "Adventure Time" house
// style, see art/reference/). Everything here is deterministic (seeded) so a shape looks the same
// every time it's drawn, and pure apart from calls on a Phaser Graphics. Shapes are flat matte fills
// with a dark ink outline; there are no gradients and no highlights.
export const INK = 0x2a1f24;                      // warm near-black

// A tiny seeded random generator (mulberry32).
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth deterministic noise in [-1, 1] for `x` (any real) and `seed`.
export function noise(x, seed = 0) {
  const r = rng(seed * 7919 + 13);
  const a = r() * 6.283, b = r() * 6.283, c = r() * 6.283;
  return (Math.sin(x * 1.0 + a) * 0.5 + Math.sin(x * 2.3 + b) * 0.3 + Math.sin(x * 4.1 + c) * 0.2);
}

// A cubic bezier sampled into n+1 points.
export function bezier(p0, p1, p2, p3, n = 10) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    });
  }
  return out;
}

// A wobbly closed blob (a squashed circle that isn't quite round): n points around an ellipse
// with radii (rx, ry) whose radius drifts by `amp` (fraction) from place to place.
// The house line: every main outline is LINE px wide on screen (art scaled down is drawn with a heavier pen so the
// result is the same: see Character's ink gain and the item textures), edges wobble by WOBBLE of the raw amount
// (1 = the old shaky look, 0 = ruler straight), and a pen's pressure only varies the width a little.
export const LINE = 3.2;
export const WOBBLE = 0.4;
export const PRESSURE = 0.3;
// A multiplier on every stroke width: a character drawn at 64% size sets this so its lines still come out LINE wide.
export const inkGain = {
  k: 1,
  with(k, fn) { const prev = this.k; this.k = k; try { return fn(); } finally { this.k = prev; } },
};

export function blob(cx, cy, rx, ry, { n = 28, amp = 0.045, seed = 1, rot = 0 } = {}) {
  amp *= WOBBLE;
  n = Math.max(n, 12 + Math.round(Math.max(rx, ry) / 2.5));            // big round things need enough points to stay round
  const out = [], cos = Math.cos(rot), sin = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, k = 1 + amp * noise(a * 1.7, seed);
    const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    out.push({ x: cx + x * cos - y * sin, y: cy + x * sin + y * cos });
  }
  return out;
}

// Wobble a polyline: nudge each point sideways by up to `amp` px (deterministic).
export function wobble(points, amp = 1.5, seed = 1) {
  amp *= WOBBLE;
  return points.map((p, i) => ({ x: p.x + amp * noise(i * 0.9, seed), y: p.y + amp * noise(i * 0.9 + 40, seed + 3) }));
}

// The outline polygon of a noodle: a centre line with a width at each point. `width(t)` t in 0..1.
// Returns { left, right, outline } (outline = left then right reversed, a closed polygon).
export function tube(center, width) {
  const left = [], right = [], n = center.length;
  for (let i = 0; i < n; i++) {
    const a = center[Math.max(0, i - 1)], b = center[Math.min(n - 1, i + 1)];
    let dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const w = width(n > 1 ? i / (n - 1) : 0) / 2, nx = -dy, ny = dx;
    left.push({ x: center[i].x + nx * w, y: center[i].y + ny * w });
    right.push({ x: center[i].x - nx * w, y: center[i].y - ny * w });
  }
  return { left, right, outline: [...left, ...[...right].reverse()] };
}

// Stroke a polyline in ink with an uneven weight: one steady pass, plus a few thicker runs.
export function inkStroke(g, pts, { color = INK, w = 4, seed = 1, closed = false, heavy = 2 } = {}) {
  if (pts.length < 2) return;
  const path = closed ? [...pts, pts[0]] : pts;
  w *= inkGain.k;                                                        // (once: the pressure patches below build on this)
  g.lineStyle(w, color, 1).strokePoints(path, false);
  const r = rng(seed * 31 + 5);
  for (let k = 0; k < heavy; k++) {                                     // thicker patches, where the pen pressed harder
    const from = Math.floor(r() * Math.max(1, path.length - 5)), run = path.slice(from, from + 4 + Math.floor(r() * 4));
    if (run.length > 1) g.lineStyle(w * (1 + (0.35 + r() * 0.4) * PRESSURE), color, 1).strokePoints(run, false);
  }
}

// A flat-filled shape with its ink outline.
export function inkFill(g, pts, fill, opts = {}) {
  g.fillStyle(fill, 1).fillPoints(pts, true);
  inkStroke(g, pts, { ...opts, closed: true });
}

// A noodle: tapering tube along `center`, filled and outlined. Ends are rounded by capping circles.
export function inkTube(g, center, width, fill, opts = {}) {
  const t = tube(center, width);
  g.fillStyle(fill, 1).fillPoints(t.outline, true);
  const last = center[center.length - 1], first = center[0];
  g.fillCircle(last.x, last.y, width(1) / 2).fillCircle(first.x, first.y, width(0) / 2);
  inkStroke(g, t.left, opts);
  inkStroke(g, t.right, { ...opts, seed: (opts.seed || 1) + 7 });
  const cap = (p, w) => blob(p.x, p.y, w / 2, w / 2, { n: 10, amp: 0.03, seed: opts.seed || 1 });
  inkStroke(g, cap(last, width(1)).slice(0, 7), { ...opts, heavy: 0, seed: (opts.seed || 1) + 2 });   // rounded tip
}

// --- Wonky straight things: walls, windows, planks ----------------------------------------------
export const rectPoints = (x, y, w, h) => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];

// Subdivide a polygon's edges and wobble them, so "straight" walls look drawn by hand.
export function wobblyPoly(points, { amp = 1.6, seed = 1, step = 16 } = {}) {
  amp *= WOBBLE;
  const out = [], n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n], k = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let j = 0; j < k; j++) {
      const t = j / k, e = j === 0 ? 0.6 : 1;                         // corners stay a little crooked too
      out.push({ x: a.x + (b.x - a.x) * t + amp * e * noise(i * 3 + j * 0.8, seed), y: a.y + (b.y - a.y) * t + amp * e * noise(i * 3 + j * 0.8 + 40, seed + 3) });
    }
  }
  return out;
}

// A wobbly flat-filled rectangle with an ink outline.
export function inkRect(g, x, y, w, h, fill, opts = {}) {
  inkFill(g, wobblyPoly(rectPoints(x, y, w, h), { amp: opts.amp ?? 1.6, seed: opts.seed ?? 1, step: opts.step ?? 16 }), fill, opts);
}

// A wobbly stroked line between two points (a plank seam, a window bar, a fence rail).
export function inkLine(g, a, b, opts = {}) {
  const k = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / (opts.step ?? 14))), amp = (opts.amp ?? 1.2) * WOBBLE, seed = opts.seed ?? 1;
  const pts = [...Array(k + 1)].map((_, i) => ({
    x: a.x + (b.x - a.x) * (i / k) + (i && i < k ? amp * noise(i * 0.9, seed) : 0),
    y: a.y + (b.y - a.y) * (i / k) + (i && i < k ? amp * noise(i * 0.9 + 40, seed + 3) : 0),
  }));
  inkStroke(g, pts, { heavy: 0, ...opts });
}

// Catmull-Rom through the given points (winding paths and rivers): `steps` samples per span.
export function smoothPath(points, steps = 6) {
  if (points.length < 3) return points.slice();
  const p = [points[0], ...points, points[points.length - 1]], out = [];
  for (let i = 1; i < p.length - 2; i++) {
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p[i - 1].x, p[i].x, p[i + 1].x, p[i + 2].x), y: f(p[i - 1].y, p[i].y, p[i + 1].y, p[i + 2].y) });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

// A dashed ink outline (for build plots): draws every other stretch of the polyline.
export function inkDashed(g, pts, { color = INK, w = 3, on = 3, off = 2, seed = 1 } = {}) {
  const path = [...pts, pts[0]];
  g.lineStyle(w, color, 1);
  for (let i = 0; i + on < path.length; i += on + off) g.strokePoints(path.slice(i, i + on + 1), false);
}
