// The face: dot eyes (no whites), floating blush spots, a tiny wobbly mouth that stretches and squashes
// (art/reference/). Painted each frame onto a cleared Graphics from an expression recipe
// (data/expressions.js); no Phaser imports, only Graphics calls, so it is tested with a stub.
import { INK, blob, inkFill, inkStroke } from './ink.js';
import { cheekFor } from './look.js';

const MOUTH = 0x8a2335, TONGUE = 0xff8fa3, TEETH = 0xfff6e8;

// Points of an arc: from angle a0 to a1 (radians), centre (cx,cy), radii (rx, ry).
const arc = (cx, cy, rx, ry, a0, a1, n = 8) => [...Array(n + 1)].map((_, i) => { const a = a0 + (a1 - a0) * (i / n); return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }; });
const line = (g, pts, w = 4, color = INK) => g.lineStyle(w, color, 1).strokePoints(pts, false);

// state: { blink (1 open .. 0.1 shut), gx, gy (gaze, px), chew (0..1 mouth jiggle), headPts (for tints) }
export function paintFace(g, L, look, e, state = {}) {
  const { blink = 1, gx = 0, gy = 0, chew = 0, headPts = null } = state;
  const k = L.head.rx / 72;                                            // adults' faces are a little smaller
  const ey = L.eyes.y, ex = L.eyes.gap / 2, r = L.eyes.r;

  if (e.tint && headPts) g.fillStyle(e.tint[0], e.tint[1]).fillPoints(headPts, true);

  const ck = cheekFor(look.skin);                                      // floating blush spots, flat and unoutlined
  g.fillStyle(ck, 0.95);
  for (const s of [-1, 1]) g.fillEllipse(s * L.cheek.dx + gx * 0.3, L.cheek.y, L.cheek.rx * 2, L.cheek.ry * 2);

  for (const s of [-1, 1]) {                                           // eyes
    const x = s * ex + gx, y = ey + gy;
    switch (e.eyes) {
      case 'happy': line(g, arc(x, y + 5, 10 * k + 2, 11, Math.PI * 1.1, Math.PI * 1.9), 4.4); break;
      case 'closed': line(g, arc(x, y - 3, 10 * k + 2, 8, Math.PI * 0.12, Math.PI * 0.88), 4.2); break;
      case 'squint': line(g, [{ x: x - 9, y: y - 3 }, { x: x + 8, y: y + 2 }].map((p, i) => (s < 0 ? p : { x: 2 * x - p.x, y: p.y })), 4.6); break;
      case 'half': g.fillStyle(INK, 1).fillEllipse(x, y + 2, r * 2.1, r * 1.1 * blink + 1); line(g, [{ x: x - r - 2, y: y - 2 }, { x: x + r + 2, y: y - 2 }], 3.4); break;
      case 'wide': g.fillStyle(INK, 1).fillEllipse(x, y, r * 2.7, r * 2.9 * (0.15 + 0.85 * blink)); break;
      default: g.fillStyle(INK, 1).fillEllipse(x, y, r * 2, r * 2 * (0.12 + 0.88 * blink));
    }
  }

  if (e.brows && e.brows !== 'none') {                                 // choppy ink brows
    const by = L.brow.y + gy * 0.5, w = 12 * k + 4;
    const tilt = e.brows === 'angry' ? [5, -5] : e.brows === 'worried' ? [-6, 4] : [-3, -3];
    for (const s of [-1, 1]) {
      const a = tilt[0] * s * -1, b = tilt[1] * s * -1;
      line(g, [{ x: s * ex - w + gx, y: by + (s < 0 ? a : b) }, { x: s * ex + w + gx, y: by + (s < 0 ? b : a) - (e.brows === 'up' ? 6 : 0) }], 4.4);
    }
  }

  const my = L.mouthY, m = k * (1 + chew * 0.35 * Math.sin(chew * 40));
  const hole = (rx, ry, tongue) => {                                   // an open, squishy mouth
    const pts = blob(gx * 0.5, my + ry * 0.4, rx * m, ry * m, { n: 16, amp: 0.07, seed: 9 });
    inkFill(g, pts, MOUTH, { w: 3.6, seed: 4, heavy: 1 });
    if (tongue) { g.fillStyle(TONGUE, 1).fillEllipse(gx * 0.5, my + ry * 0.4 + ry * 0.55 * m, rx * 1.1 * m, ry * 0.7 * m); }
    return pts;
  };
  switch (e.mouth) {
    case 'grin': {                                                     // goofy wide grin with blunt teeth
      const pts = [...arc(gx * 0.5, my - 4, 24 * m, 24 * m, 0.05 * Math.PI, 0.95 * Math.PI, 10)];
      inkFill(g, pts, MOUTH, { w: 3.6, seed: 5, heavy: 1 });
      g.fillStyle(TEETH, 1).fillRect(gx * 0.5 - 13 * m, my - 4, 8 * m, 7 * m).fillRect(gx * 0.5 + 5 * m, my - 4, 8 * m, 7 * m);
      g.fillStyle(TONGUE, 1).fillEllipse(gx * 0.5 + 2, my + 14 * m, 20 * m, 9 * m);
      break;
    }
    case 'open': hole(13, 18, true); break;                            // stretch & squash gasp
    case 'tongue': hole(15, 20, false); g.fillStyle(TONGUE, 1).fillEllipse(gx * 0.5, my + 26 * m, 17 * m, 22 * m); break;
    case 'o': hole(6.5, 8.5, false); break;
    case 'flat': line(g, [{ x: -9 * m, y: my }, { x: -3, y: my + 1.5 }, { x: 4, y: my - 1 }, { x: 10 * m, y: my + 1 }], 3.6); break;
    case 'frown': line(g, arc(gx * 0.5, my + 12, 11 * m, 9, Math.PI * 1.15, Math.PI * 1.85), 3.8); break;
    case 'wavy': line(g, [-1, -0.5, 0, 0.5, 1].map((u, i) => ({ x: u * 14 * m, y: my + (i % 2 ? -4 : 3) })), 3.6); break;
    default: line(g, [{ x: -9 * m, y: my - 1 }, { x: -5 * m, y: my + 3 }, { x: 0, y: my }, { x: 5 * m, y: my + 3 }, { x: 9 * m, y: my - 1 }], 3.4);   // the tiny wobbly puff of a smile
  }
}
