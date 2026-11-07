// Character bodies: two layouts (child and adult) and the boneless-limb maths. Pure data + functions,
// no Phaser. Coordinates are in the character's origin space: x=0 is the centre line, y=0 the centre of
// the hit box, and the feet touch y=+foot (so a body is `foot` px from its middle to the floor).
//
//   kid:   a top-heavy chibi — big wobbly head, small bean body, short noodle limbs.
//   adult: "stretched" — a smaller head on a tall slouching bean, long floppy noodle limbs.
// Limbs have NO joints: each is a bezier that bows and sags like cooked spaghetti (art/reference/).
import { bezier } from './ink.js';
import { clamp } from '../util.js';

export const LAYOUTS = {
  kid: {
    name: 'Kid', foot: 145,
    head: { x: 0, y: -62, rx: 72, ry: 66 },
    body: { x: 0, y: 28, w: 94, h: 86 },
    shoulder: { x: 38, y: 0 }, hip: { x: 20, y: 62 },
    handRest: { x: 60, y: 70 }, footRest: { x: 27, y: 135 },
    arm: { w0: 21, w1: 15, bow: 12, hand: 9 }, leg: { w0: 21, w1: 15, bow: 9 }, feet: { rx: 21, ry: 10 },
    stride: 17, swing: 11,
    eyes: { y: -52, gap: 38, r: 5.6 }, mouthY: -24, cheek: { y: -38, dx: 46, rx: 14, ry: 9 },
    brow: { y: -72 },
    zones: { head: [-80, -205, 160, 110], eyes: [-55, -76, 110, 40], mouth: [-55, -44, 110, 50], handL: [-115, 40, 75, 105], handR: [40, 40, 75, 105], feet: [-75, 105, 150, 62], body: [-80, -135, 160, 280] },
    slots: { head: { x: 0, y: -122, scale: 1 }, eyes: { x: 0, y: -52, scale: 1.3 }, handL: { x: -60, y: 70, scale: 0.9 }, handR: { x: 60, y: 70, scale: 0.9 }, feet: { x: 0, y: 132, scale: 1.45 } },
  },
  adult: {
    name: 'Grown-up', foot: 190,
    head: { x: 0, y: -128, rx: 54, ry: 58 },
    body: { x: 0, y: -24, w: 84, h: 126 },
    shoulder: { x: 40, y: -76 }, hip: { x: 20, y: 28 },
    handRest: { x: 54, y: 44 }, footRest: { x: 25, y: 180 },
    arm: { w0: 18, w1: 13, bow: 14, hand: 9 }, leg: { w0: 19, w1: 14, bow: 9 }, feet: { rx: 23, ry: 10 },
    stride: 24, swing: 15,
    eyes: { y: -118, gap: 34, r: 5 }, mouthY: -92, cheek: { y: -104, dx: 38, rx: 12, ry: 8 },
    brow: { y: -136 },
    zones: { head: [-80, -262, 160, 120], eyes: [-60, -142, 120, 44], mouth: [-60, -112, 120, 48], handL: [-110, 0, 70, 110], handR: [40, 0, 70, 110], feet: [-80, 140, 160, 60], body: [-80, -190, 160, 380] },
    slots: { head: { x: 0, y: -176, scale: 1 }, eyes: { x: 0, y: -118, scale: 1.2 }, handL: { x: -56, y: 44, scale: 0.9 }, handR: { x: 56, y: 44, scale: 0.9 }, feet: { x: 0, y: 176, scale: 1.45 } },
  },
};
export const AGES = Object.keys(LAYOUTS);
export const layoutFor = age => LAYOUTS[age] || LAYOUTS.kid;

// A boneless limb from `a` to `b`: a cubic bezier that bows sideways by `bow` px and sags in the middle,
// so it reads as a rubber hose with no elbow or knee. `side` (-1 | 1) picks which way it bows.
export function limbCurve(a, b, bow, side = 1, n = 10) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const bend = bow * side * clamp(len / 70, 0.5, 1.6);
  const p1 = { x: a.x + dx * 0.3 + nx * bend, y: a.y + dy * 0.3 + ny * bend };
  const p2 = { x: a.x + dx * 0.72 + nx * bend * 0.55, y: a.y + dy * 0.72 + ny * bend * 0.55 + len * 0.05 };
  return bezier(a, p1, p2, b, n);
}

// Where the hands and feet want to be, given the pose. pose = { phase, amt (0..1 how much walking),
// lift (0..1 arms raised), sit (0..1 legs folded up and dangling), reach (-1..1 arms stretched toward someone), vx (px/s), t (seconds) }.
// Returns { handL, handR, footL, footR }; the character springs its real limbs toward these so
// they lag and overshoot like rubber.
export function limbTargets(L, pose) {
  const { phase = 0, amt = 0, lift = 0, reach = 0, vx = 0, t = 0, sit = 0 } = pose;
  const s = Math.sin(phase), c = Math.cos(phase);
  const trail = clamp(-vx * 0.035, -22, 22);                                    // arms trail behind when moving
  const hand = side => {
    const rest = { x: side * L.handRest.x + trail * 0.6 + Math.sin(t * 1.4 + side * 1.7) * 2.5, y: L.handRest.y + Math.sin(t * 1.9 + side) * 2 };
    rest.x += -side * s * L.swing * amt * 0.5; rest.y += side * s * L.swing * amt;                          // opposite arm swings forward
    const up = { x: side * (L.shoulder.x + 26) + reach * 40, y: L.shoulder.y - 62 + Math.sin(t * 9 + side * 2) * 5 * lift };
    return { x: rest.x + (up.x - rest.x) * lift, y: rest.y + (up.y - rest.y) * lift };
  };
  const foot = side => {
    const dir = side;                                                          // the feet are in antiphase
    const stand = {
      x: side * L.footRest.x + dir * s * L.stride * amt,
      y: L.footRest.y - Math.max(0, dir * c) * 11 * amt,
    };
    if (!sit) return stand;
    // Sitting: the legs fold up and dangle, kicking a little.
    const down = { x: side * (L.footRest.x + 10) + Math.sin(t * 3.1 + side) * 3 * sit, y: L.hip.y + (L.footRest.y - L.hip.y) * 0.6 + Math.sin(t * 3.1 + side * 2) * 4 * sit };
    return { x: stand.x + (down.x - stand.x) * sit, y: stand.y + (down.y - stand.y) * sit };
  };
  return { handL: hand(-1), handR: hand(1), footL: foot(-1), footR: foot(1) };
}

// A spring step for a limb tip: moves `tip` ({x,y,vx,vy}) toward `target`, overshooting a little.
export function springTip(tip, target, dt, k = 150, damp = 11) {
  tip.vx += ((target.x - tip.x) * k - tip.vx * damp) * dt;
  tip.vy += ((target.y - tip.y) * k - tip.vy * damp) * dt;
  tip.x += tip.vx * dt;
  tip.y += tip.vy * dt;
  return tip;
}
