import { clamp } from '../util.js';
import { HAIR_STYLES, DEFAULT_LOOK } from '../data/look.js';
import { EXPRESSIONS } from '../data/expressions.js';
import { layoutFor, limbCurve, limbTargets, springTip } from '../data/body.js';
import { INK, blob, inkFill, inkStroke, inkTube } from '../data/ink.js';
import { paintFace } from '../data/face.js';
import { paintPattern, patternMarks } from '../data/patterns.js';
import { walkPose } from '../systems/walk.js';

const lerp = (a, b, t) => a + (b - a) * t;

// A character: a Container so body, face and hair move/scale as one unit. Hand-inked, boneless
// (art/reference/): a bean body, a wobbly head and noodle limbs that are redrawn every frame as
// springy bezier tubes, so they lag, overshoot and curl instead of rotating around joints.
// Origin (0,0) is the centre of the hit box; the feet touch y=+F (data/body.js: kids F=145, grown-ups
// F=190). All art lives in `rig`, which pivots at the FEET so squash/stretch and breathing stay planted.
// Drop zones and wearable slots come from the body layout and are converted to world space in
// getZone()/slotTarget(). `entry` = { id, name, look, x, lane } (see data/look.js for `look`).
export default class Character extends Phaser.GameObjects.Container {
  constructor(scene, entry) {
    super(scene, entry.x ?? 480, 0);
    this.id = entry.id;
    this.name = entry.name || 'Kid';
    this.layout = layoutFor(entry.look && entry.look.age);
    this.F = this.layout.foot;

    this.rig = scene.add.container(0, this.F);
    // Rig children are positioned relative to the character origin, so the graphics shift by -F to
    // compensate for the rig's pivot at the feet.
    const layer = () => scene.add.graphics().setPosition(0, -this.F);
    this.hairBack = layer();
    this.legs = layer();                          // redrawn every frame (noodles + shoes)
    this.arms = layer();                          // redrawn every frame; behind the body, so they hang off its sides
    this.body = layer();
    this.head = layer();
    this.hairFront = layer();
    this.face = layer();                          // redrawn every frame (dot eyes, blush, mouth)
    this.layers = [this.hairBack, this.legs, this.arms, this.body, this.head, this.hairFront, this.face];
    this.rig.add(this.layers);
    this.add(this.rig);

    this.look = null;
    this.headPts = null;
    this.expr = 'neutral';
    this.blink = 1;              // 1 = eyes open, ~0.1 = closed
    this.sq = { x: 1, y: 1 };    // squash & stretch factors (tweened)
    this.st = { x: 1, y: 1 };    // stretch from moving fast (set by the scene)
    this.eatingUntil = 0;        // scene time until which the character is chewing
    this.reaction = null;        // food reaction name (data/expressions.js REACTIONS)
    this.reactUntil = 0;
    this.pokedUntil = 0;
    this.nextZ = 0;              // next time a sleepy "💤" may float up
    this.worn = { head: null, eyes: null, handL: null, handR: null, feet: null }; // slot -> worn item
    this.px = this.x; this.vxs = 0;   // smoothed horizontal speed (limbs trail it, hand-held toys swing with it)
    this.goal = null;            // walking target { x, lane } (systems/walk.js)
    this.facing = 1;             // last horizontal direction walked
    this.walking = false;
    this.walkPhase = 0; this.walkAmt = 0;     // step cycle position / how much of the walk pose is showing
    this.onStep = null;          // called when a foot lands
    this.sleeping = null;        // the bed (Prop) we're tucked into
    this.hugging = false; this.hugSide = 0; this.hugUntil = 0;
    this.lift = 0;               // how far the arms are raised (0..1), eased
    this.lastT = 0;

    // Physics-ish state, same fields the items use.
    this.held = false; this.lane = entry.lane ?? 490; this.z = 0; this.vz = 0;

    this.setSize(170, this.F * 2);
    // The hit box ignores any spot where a pet is standing, so pets (which follow kids around) can always be patted.
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, 170, this.F * 2),
      hitAreaCallback: (rect, x, y, obj) => Phaser.Geom.Rectangle.Contains(rect, x, y) && !obj.petAt(x, y),
      draggable: true, useHandCursor: true,
    });
    scene.add.existing(this);

    this.applyLook(entry.look || DEFAULT_LOOK);
  }

  foot() { return this.F * this.scaleX; }

  // Is a pet under this point of my hit box? (x, y are in hit-box coordinates, top-left origin.)
  petAt(x, y) {
    const pets = this.scene && this.scene.pets;
    if (!pets || !pets.length) return false;
    const wx = this.x + (x - 85) * this.scaleX, wy = this.y + (y - this.F) * this.scaleY;
    return pets.some(p => p.active && !p.held && p.getBounds().contains(wx, wy));
  }

  // World y of the top of the head and of the mouth (floating emoji, eating).
  headTopY() { return this.y + (this.layout.head.y - this.layout.head.ry) * this.scaleX; }
  mouthY() { return this.y + this.layout.mouthY * this.scaleX; }

  // Switch to a (possibly different) body and (re)draw the parts that don't move: head, hair and the bean body.
  applyLook(look) {
    this.look = look;
    const L = layoutFor(look.age);
    if (L !== this.layout || !this.zones) this.useLayout(L);
    const { skin, shirt, pants, hair } = look;
    const style = HAIR_STYLES[hair.style] || HAIR_STYLES.short, h = L.head;

    this.hairBack.clear(); style.back(this.hairBack, hair.color, h);
    this.hairFront.clear(); style.front(this.hairFront, hair.color, h);

    const g = this.body.clear(), b = L.body;
    inkFill(g, blob(0, L.hip.y + 6, L.hip.x + 16, 17, { n: 16, amp: 0.05, seed: 21 }), pants, { w: 4.2, seed: 21 });   // trousers showing under the sweater
    const torso = blob(b.x, b.y, b.w / 2, b.h / 2, { n: 26, amp: 0.055, seed: 3, rot: 0.04 });
    inkFill(g, torso, shirt, { w: 4.6, seed: 3 });
    if (look.pattern) {                                                            // a printed pattern, then the outline again on top
      paintPattern(g, patternMarks(look.pattern.id, torso), look.pattern.color);
      inkStroke(g, torso, { w: 4.6, seed: 3, closed: true });
    }
    inkStroke(g, [{ x: -18, y: b.y - b.h / 2 + 12 }, { x: -6, y: b.y - b.h / 2 + 18 }, { x: 8, y: b.y - b.h / 2 + 17 }, { x: 19, y: b.y - b.h / 2 + 11 }], { w: 3, seed: 4, heavy: 0 });   // collar
    inkStroke(g, [{ x: -b.w * 0.3, y: b.y + b.h * 0.2 }, { x: -b.w * 0.05, y: b.y + b.h * 0.27 }, { x: b.w * 0.25, y: b.y + b.h * 0.22 }], { w: 2.6, seed: 8, heavy: 0 });   // a slouchy fold in the belly

    this.headPts = blob(h.x, h.y, h.rx, h.ry, { n: 30, amp: 0.04, seed: 7 });
    inkFill(this.head.clear(), this.headPts, skin, { w: 5, seed: 7 });
  }

  // Everything that depends on the body: the hit box, the drop zones, the wearable slots, limb tips.
  useLayout(L) {
    this.layout = L;
    this.F = L.foot;
    this.rig.setPosition(0, this.F);
    this.layers.forEach(l => l.setPosition(0, -this.F));
    this.setSize(170, this.F * 2);
    if (this.input && this.input.hitArea) this.input.hitArea.setSize(170, this.F * 2);
    this.zones = L.zones;
    this.slots = { head: { ...L.slots.head }, eyes: { ...L.slots.eyes }, handL: { ...L.slots.handL }, handR: { ...L.slots.handR }, feet: { ...L.slots.feet } };
    const rest = limbTargets(L, {});
    this.tips = {};
    for (const [k, p] of Object.entries(rest)) this.tips[k] = { x: p.x, y: p.y, vx: 0, vy: 0 };
  }

  setExpression(name) { this.expr = name; }

  // World-space rectangle of a zone, accounting for the character's scale.
  getZone(name) {
    const [zx, zy, zw, zh] = this.zones[name];
    const s = this.scaleX;
    return new Phaser.Geom.Rectangle(this.x + zx * s, this.y + zy * s, zw * s, zh * s);
  }

  // Where a slot's item sits in world space (follows the squash so it doesn't float). Hands carry
  // things in their actual (springy) hand positions.
  slotTarget(slot) {
    const off = slot === 'handL' ? this.tips.handL : slot === 'handR' ? this.tips.handR : this.slots[slot], s = this.scaleX;
    const vx = s * off.x * this.rig.scaleX, vy = s * (this.F + (off.y - this.F) * this.rig.scaleY + this.rig.y - this.F);
    const cos = Math.cos(this.rotation), sin = Math.sin(this.rotation);     // a lying-down character carries its hat sideways
    return { x: this.x + vx * cos - vy * sin, y: this.y + vx * sin + vy * cos };
  }

  // Keep every worn item glued to the character (called every frame).
  syncWorn() {
    for (const slot of Object.keys(this.worn)) {
      const item = this.worn[slot];
      if (!item || item.snapping) continue;
      const t = this.slotTarget(slot), k = this.scaleX * this.slots[slot].scale;
      item.setPosition(t.x, t.y);
      item.setScale(k * this.rig.scaleX, k * this.rig.scaleY);
      item.setDepth(this.depth + 1);
      // Hand-held toys swing against the direction of travel.
      item.angle = this.angle + (slot.startsWith('hand') ? clamp(-this.vxs * 0.03, -40, 40) : 0);
    }
  }

  // Breathing + squash on the rig, boneless limbs springing toward where the pose wants them, the face
  // looking at (tx,ty) in world space.
  animate(time, tx, ty) {
    const dt = clamp((time - (this.lastT || time)) / 1000, 0, 0.05);
    this.lastT = time;
    const L = this.layout, t = time / 1000;
    const breath = Math.sin(time / 600) * 0.015;
    this.rig.setScale(this.sq.x * this.st.x * (1 - breath * 0.5), this.sq.y * this.st.y * (1 + breath));

    // Walk cycle: the body bobs and leans into the step; the limbs follow below.
    this.walkAmt += ((this.walking ? 1 : 0) - this.walkAmt) * 0.25;
    if (this.walkAmt < 0.01) this.walkAmt = 0;
    const pose = walkPose(this.walkPhase, this.walkAmt);
    this.rig.y = this.F + pose.bob;
    this.rig.rotation = pose.lean * this.facing;

    // Arms rise when they're picked up, surprised, or hugging.
    const surprised = this.expr === 'surprised' || this.expr === 'hungry';
    const liftTo = this.held && this.dragMoved ? 1 : this.hugging ? 0.8 : surprised ? 0.45 : 0;
    this.lift += (liftTo - this.lift) * Math.min(1, dt * 9);
    const want = limbTargets(L, { phase: this.walkPhase, amt: this.walkAmt, lift: this.lift, reach: this.hugging ? this.hugSide : 0, vx: this.vxs, t });
    for (const k of Object.keys(want)) springTip(this.tips[k], want[k], dt, k.startsWith('hand') ? 130 : 220, k.startsWith('hand') ? 9 : 16);

    this.paintLimbs();

    // The face: dot eyes drift toward whatever we're looking at.
    const e = EXPRESSIONS[this.expr] || EXPRESSIONS.neutral, s = this.scaleX;
    const dx = tx - (this.x + L.head.x * s), dy = ty - (this.y + L.eyes.y * s), dist = Math.hypot(dx, dy) || 1;
    const k = Math.min(3.6, dist / 40);
    paintFace(this.face.clear(), L, this.look, e, {
      blink: this.blink, gx: (dx / dist) * k, gy: (dy / dist) * k * 0.7, chew: this.expr === 'chew' ? 1 : 0, headPts: this.headPts,
    });
  }

  // Redraw the noodles: each limb is a bezier tube from its root to its (springy) tip.
  paintLimbs() {
    const L = this.layout, look = this.look, legs = this.legs.clear(), arms = this.arms.clear();
    const bulge = (w0, w1) => k => lerp(w0, w1, k) * (1 + 0.14 * Math.sin(Math.PI * k));     // a noodle that's fatter in the middle
    for (const side of [-1, 1]) {
      const foot = this.tips[side < 0 ? 'footL' : 'footR'];
      const hip = { x: side * L.hip.x, y: L.hip.y }, ankle = { x: foot.x, y: foot.y - 3 };
      inkTube(legs, limbCurve(hip, ankle, L.leg.bow, -side, 10), bulge(L.leg.w0, L.leg.w1), look.pants, { w: 4, seed: 40 + side });
      inkFill(legs, blob(foot.x + side * 4, foot.y + 2, L.feet.rx, L.feet.ry, { n: 14, amp: 0.06, seed: 50 + side }), look.shoe, { w: 4, seed: 50 + side });
    }
    for (const side of [-1, 1]) {
      const hand = this.tips[side < 0 ? 'handL' : 'handR'];
      const shoulder = { x: side * L.shoulder.x, y: L.shoulder.y };
      const curve = limbCurve(shoulder, hand, L.arm.bow, -side, 10);     // arms bow outward, away from the body, like the legs
      inkTube(arms, curve, bulge(L.arm.w0, L.arm.w1), look.shirt, { w: 4, seed: 60 + side });
      // a nubby little hand with three stubby fingers, pointing the way the arm ends
      const end = curve[curve.length - 1], prev = curve[curve.length - 3], ang = Math.atan2(end.y - prev.y, end.x - prev.x);
      inkFill(arms, blob(hand.x, hand.y + 1, L.arm.hand, L.arm.hand * 0.9, { n: 12, amp: 0.07, seed: 70 + side }), look.skin, { w: 3.6, seed: 70 + side, heavy: 1 });
      for (const f of [-0.55, 0, 0.55]) {
        const a = ang + f, x0 = hand.x + Math.cos(a) * L.arm.hand * 0.8, y0 = hand.y + Math.sin(a) * L.arm.hand * 0.8;
        inkStroke(arms, [{ x: x0, y: y0 }, { x: x0 + Math.cos(a) * 6, y: y0 + Math.sin(a) * 6 }], { w: 3.2, seed: 80 + side, heavy: 0 });
      }
    }
  }

  // Advance the step cycle by `px` of ground covered; fires onStep each time a foot lands.
  advanceWalk(px, stride) {
    const before = Math.floor(this.walkPhase / Math.PI);
    this.walkPhase += (px / stride) * Math.PI;
    if (Math.floor(this.walkPhase / Math.PI) !== before && this.onStep) this.onStep(this);
  }

  destroy(fromScene) {
    if (this.shadow) { this.shadow.destroy(); this.shadow = null; }
    super.destroy(fromScene);
  }
}
