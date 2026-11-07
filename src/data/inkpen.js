// InkPen: wraps a Phaser Graphics with the same drawing methods (fillRect, fillRoundedRect, fillCircle…) but
// every filled shape comes out hand-inked — wobbly edges, a dark uneven outline, flat matte colour — so the
// existing furniture and room drawings get the house style (art/reference/) without being rewritten.
//   * strokes that merely re-outline a fill (strokeRect, strokeRoundedRect, strokeCircle) are ignored: the fill already has ink
//   * lineBetween draws a wobbly ink line; translucent fills (glows, shadows) stay plain and unoutlined
// Seeded, so a drawing looks the same every time it is painted.
import { INK, LINE, blob, inkFill, inkLine, inkStroke, wobblyPoly } from './ink.js';

// A rounded rectangle as a polygon (the radius is clamped to half the shorter side).
export function roundedRectPoints(x, y, w, h, r, arcSteps = 4) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (r < 1) return [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
  const out = [], corner = (cx, cy, a0) => { for (let i = 0; i <= arcSteps; i++) { const a = a0 + (Math.PI / 2) * (i / arcSteps); out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }); } };
  corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0); corner(x + r, y + h - r, Math.PI / 2); corner(x + r, y + r, Math.PI);
  return out;
}

export class InkPen {
  constructor(g, seed = 1, { weight = LINE } = {}) {
    this.g = g; this.seed = seed; this.weight = weight;
    this.fill = 0xffffff; this.alpha = 1; this.lw = 2; this.n = 0;
  }

  fillStyle(color, alpha = 1) { this.fill = color; this.alpha = alpha; return this; }
  lineStyle(width = 2, color, alpha) { this.lw = width; return this; }
  clear() { this.g.clear(); return this; }
  save() { this.g.save(); return this; }
  restore() { this.g.restore(); return this; }
  translateCanvas(x, y) { this.g.translateCanvas(x, y); return this; }

  shape(pts) {
    const s = this.seed + 17 * ++this.n;
    if (this.alpha < 1) this.g.fillStyle(this.fill, this.alpha).fillPoints(pts, true);          // glows and shadows: flat, no outline
    else inkFill(this.g, pts, this.fill, { w: this.weight, seed: s, heavy: 1 });
    return this;
  }
  amp(w, h) { return Math.min(1.8, 0.5 + Math.min(w, h) * 0.018); }

  fillRect(x, y, w, h) { return this.shape(wobblyPoly([{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }], { amp: this.amp(w, h), seed: this.seed + this.n, step: 14 })); }
  fillRoundedRect(x, y, w, h, r = 0) { return this.shape(wobblyPoly(roundedRectPoints(x, y, w, h, r), { amp: this.amp(w, h) * 0.7, seed: this.seed + this.n, step: 10 })); }
  fillCircle(x, y, r) { return this.shape(blob(x, y, r, r, { n: Math.max(18, Math.round(14 + r / 2)), amp: 0.07, seed: this.seed + this.n })); }
  fillEllipse(x, y, w, h) { return this.shape(blob(x, y, w / 2, h / 2, { n: Math.max(18, Math.round(14 + Math.max(w, h) / 4)), amp: 0.06, seed: this.seed + this.n })); }
  fillTriangle(x1, y1, x2, y2, x3, y3) { return this.shape(wobblyPoly([{ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }], { amp: 1, seed: this.seed + this.n, step: 14 })); }
  fillPoints(pts, close = true) { return this.shape(wobblyPoly(pts, { amp: 1, seed: this.seed + this.n, step: 14 })); }

  strokeRect() { return this; }
  strokeRoundedRect() { return this; }
  strokeCircle() { return this; }
  strokePoints(pts) { inkStroke(this.g, pts, { w: Math.max(2, this.lw), seed: this.seed + this.n++, heavy: 0 }); return this; }
  lineBetween(x1, y1, x2, y2) {
    inkLine(this.g, { x: x1, y: y1 }, { x: x2, y: y2 }, { w: Math.max(2.2, this.lw), seed: this.seed + 5 * ++this.n, amp: 1.1, heavy: 0 });
    return this;
  }
}

// An InkPen for a prop/room painter, seeded from a name so each piece wobbles its own way.
export const penFor = (g, name = '') => new InkPen(g, [...String(name)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) % 900 + 1);
export { INK };
