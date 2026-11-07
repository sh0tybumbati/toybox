import { FOOT } from '../config.js';
import { clamp } from '../util.js';
import { HAIR_STYLES, DEFAULT_LOOK, cheekFor } from '../data/look.js';
import { EXPRESSIONS, EYE_OPEN } from '../data/expressions.js';
import { walkPose } from '../systems/walk.js';

const BROW = 0x4a3426, INK = 0x222222, MOUTH = 0x7a1f2b;

// A character: a Container so body, face and hair move/scale as one unit.
// Origin (0,0) is the centre of its 160x290 hit box. All art lives in `rig`,
// which pivots at the FEET so squash/stretch and breathing stay planted.
// Drop zones are stored in local coordinates and converted to world space in
// getZone(). `entry` = { id, name, look, x, lane } (see data/look.js for `look`).
export default class Character extends Phaser.GameObjects.Container {
  constructor(scene, entry) {
    super(scene, entry.x ?? 480, 0);
    this.id = entry.id;
    this.name = entry.name || 'Kid';

    this.rig = scene.add.container(0, FOOT);
    // Rig children are positioned relative to the character origin, so the
    // graphics shift by -FOOT to compensate for the rig's pivot.
    const layer = () => scene.add.graphics().setPosition(0, -FOOT);
    this.hairBack = layer();
    // Feet and arms are their own layers (pivoting where they attach) so they can swing when walking.
    const limb = (x, y) => scene.add.graphics().setPosition(x, y - FOOT);
    this.footL = limb(-28, 140); this.footR = limb(28, 140);
    this.armL = limb(-70, 12); this.armR = limb(70, 12);
    this.body = layer();
    this.hairFront = layer();
    this.face = layer();                          // brows, mouth, tint, happy eyes

    this.eyeBase = [{ x: -24, y: -92 }, { x: 24, y: -92 }];
    this.whites = this.eyeBase.map(e => scene.add.ellipse(e.x, e.y - FOOT, 22, 26, 0xffffff).setStrokeStyle(2, INK));
    this.pupils = this.eyeBase.map(e => scene.add.circle(e.x, e.y - FOOT, 6, INK));

    this.rig.add([this.hairBack, this.footL, this.footR, this.armL, this.armR, this.body, this.hairFront, ...this.whites, ...this.pupils, this.face]);
    this.add(this.rig);

    this.look = null;
    this.applyLook(entry.look || DEFAULT_LOOK);

    this.expr = null;
    this.setExpression('neutral');
    this.blink = 1;              // 1 = eyes open, ~0.1 = closed
    this.sq = { x: 1, y: 1 };    // squash & stretch factors (tweened)
    this.eatingUntil = 0;        // scene time until which the character is chewing
    this.reaction = null;        // food reaction name (data/expressions.js REACTIONS)
    this.reactUntil = 0;
    this.pokedUntil = 0;
    this.goal = null;            // walking target { x, lane } (systems/walk.js)
    this.facing = 1;             // last horizontal direction walked
    this.walking = false;
    this.walkPhase = 0; this.walkAmt = 0;     // step cycle position / how much of the walk pose is showing
    this.onStep = null;          // called when a foot lands
    this.sleeping = null;        // the bed (Prop) we're tucked into
    this.hugUntil = 0;
    this.nextZ = 0;              // next time a sleepy "💤" may float up
    this.worn = { head: null, eyes: null, handL: null, handR: null, feet: null }; // slot -> worn item
    this.px = this.x; this.vxs = 0;   // smoothed horizontal speed (hand-held toys swing with it)

    // Physics-ish state, same fields the items use.
    this.held = false; this.lane = entry.lane ?? 490; this.z = 0; this.vz = 0;

    // Hit box for dragging the whole character.
    this.setSize(160, 290);
    this.setInteractive({ draggable: true, useHandCursor: true });
    scene.add.existing(this);

    // Drop zones in LOCAL space: [x, y, width, height]
    this.zones = {
      head:  [-80, -215, 160, 110], // area just above/over the head
      eyes:  [-55, -118, 110,  40], // area over the eyes
      mouth: [-55,  -75, 110,  60], // area over the mouth
      handL: [-135,  40,  75, 110],
      handR: [  60,  40,  75, 110],
      feet:  [-75,  108, 150,  62],
      body:  [-80, -145, 160, 290], // whole character
    };
    // Wearable slots: where the item sits (local coords) and how big it is worn.
    this.slots = {
      head:  { off: { x: 0,   y: -150 }, scale: 1 },
      eyes:  { off: { x: 0,   y: -92 },  scale: 1.3 },
      handL: { off: { x: -80, y: 92 },   scale: 0.9 },
      handR: { off: { x: 80,  y: 92 },   scale: 0.9 },
      feet:  { off: { x: 0,   y: 134 },  scale: 1.45 },
    };
  }

  foot() { return FOOT * this.scaleX; }

  // (Re)draw body, hair and the static parts of the face from a look.
  applyLook(look) {
    this.look = look;
    const { skin, shirt, shoe, hair } = look;
    const style = HAIR_STYLES[hair.style] || HAIR_STYLES.short;

    this.hairBack.clear(); style.back(this.hairBack, hair.color);
    this.hairFront.clear(); style.front(this.hairFront, hair.color);

    for (const f of [this.footL, this.footR]) f.clear().fillStyle(shoe, 1).fillEllipse(0, 0, 46, 18);   // feet
    for (const a of [this.armL, this.armR]) {                                                  // arm + hand, pivoting at the shoulder
      a.clear().fillStyle(shirt, 1).fillRoundedRect(-12, -4, 24, 80, 12);
      a.fillStyle(skin, 1).fillCircle(0, 78, 13);
    }
    const g = this.body.clear();
    g.fillStyle(shirt, 1).fillRoundedRect(-60, -10, 120, 155, 30);                             // body
    g.fillStyle(skin, 1).fillCircle(0, -75, 70);                                               // head
    g.fillStyle(cheekFor(skin), 0.7).fillCircle(-42, -62, 11).fillCircle(42, -62, 11);        // cheeks
    this.drawFace();
  }

  setExpression(name) {
    if (name === this.expr) return;
    this.expr = name;
    this.drawFace();
  }

  // Brows, mouth, colour wash and ^ ^ eyes for the current expression.
  drawFace() {
    const e = EXPRESSIONS[this.expr] || EXPRESSIONS.neutral, f = this.face.clear();

    if (e.tint) f.fillStyle(e.tint[0], e.tint[1]).fillCircle(0, -75, 70);

    f.lineStyle(5, BROW, 1);
    if (e.brows === 'up') f.lineBetween(-36, -114, -14, -120).lineBetween(14, -120, 36, -114);
    if (e.brows === 'worried') f.lineBetween(-36, -110, -14, -120).lineBetween(14, -120, 36, -110);
    if (e.brows === 'angry') f.lineBetween(-36, -121, -14, -111).lineBetween(14, -111, 36, -121);

    if (e.eyes === 'happy') {                                  // ^ ^
      f.lineStyle(5, INK, 1);
      for (const ex of [-24, 24]) f.beginPath().arc(ex, -88, 11, 1.15 * Math.PI, 1.85 * Math.PI).strokePath();
    }

    if (e.eyes === 'closed') {                                 // u u
      f.lineStyle(5, INK, 1);
      for (const ex of [-24, 24]) f.beginPath().arc(ex, -94, 11, 0.15 * Math.PI, 0.85 * Math.PI).strokePath();
    }

    switch (e.mouth) {
      case 'smile':
        f.lineStyle(4, INK, 1).beginPath().arc(0, -50, 16, 0.15 * Math.PI, 0.85 * Math.PI).strokePath();
        break;
      case 'grin':
        f.fillStyle(MOUTH, 1).beginPath().arc(0, -54, 22, 0, Math.PI).closePath().fillPath();
        break;
      case 'open':
        f.fillStyle(MOUTH, 1).fillEllipse(0, -45, 36, 30);
        break;
      case 'tongue':
        f.fillStyle(MOUTH, 1).fillEllipse(0, -44, 38, 36);
        f.fillStyle(0xff7f9a, 1).fillEllipse(0, -34, 22, 14);
        break;
      case 'o':
        f.fillStyle(MOUTH, 1).fillEllipse(0, -46, 18, 22);
        break;
      case 'flat':
        f.lineStyle(4, INK, 1).lineBetween(-12, -48, 12, -48);
        break;
      case 'frown':
        f.lineStyle(4, INK, 1).beginPath().arc(0, -34, 16, 1.15 * Math.PI, 1.85 * Math.PI).strokePath();
        break;
      case 'wavy':
        f.lineStyle(4, INK, 1).beginPath().moveTo(-18, -46).lineTo(-9, -53).lineTo(0, -46).lineTo(9, -53).lineTo(18, -46).strokePath();
        break;
    }
  }

  // World-space rectangle of a zone, accounting for the character's scale.
  getZone(name) {
    const [zx, zy, zw, zh] = this.zones[name];
    const s = this.scaleX;
    return new Phaser.Geom.Rectangle(this.x + zx * s, this.y + zy * s, zw * s, zh * s);
  }

  // Where a slot's item sits in world space (follows the squash so it doesn't float).
  slotTarget(slot) {
    const { off } = this.slots[slot], s = this.scaleX;
    const vx = s * off.x * this.rig.scaleX, vy = s * (FOOT + (off.y - FOOT) * this.rig.scaleY + this.rig.y - FOOT);
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

  // Breathing + squash on the rig, eyes follow (tx,ty), blink and expression applied.
  animate(time, tx, ty) {
    const breath = Math.sin(time / 600) * 0.015;
    this.rig.setScale(this.sq.x * (1 - breath * 0.5), this.sq.y * (1 + breath));

    // Walk cycle: bob, lean into the step, swing arms and alternate the feet.
    this.walkAmt += ((this.walking ? 1 : 0) - this.walkAmt) * 0.25;
    if (this.walkAmt < 0.01) this.walkAmt = 0;
    const pose = walkPose(this.walkPhase, this.walkAmt);
    this.rig.y = FOOT + pose.bob;
    this.rig.rotation = pose.lean * this.facing;
    this.footL.setPosition(-28 + pose.footL.dx, 140 - FOOT - pose.footL.lift);
    this.footR.setPosition(28 + pose.footR.dx, 140 - FOOT - pose.footR.lift);
    this.armL.rotation = pose.armL; this.armR.rotation = pose.armR;

    const eyes = (EXPRESSIONS[this.expr] || EXPRESSIONS.neutral).eyes;
    const open = EYE_OPEN[eyes], s = this.scaleX;
    this.eyeBase.forEach((e, i) => {
      const dx = tx - (this.x + e.x * s), dy = ty - (this.y + e.y * s);
      const dist = Math.hypot(dx, dy) || 1;
      const k = Math.min(4.5, dist / 30);
      this.pupils[i].setPosition(e.x + (dx / dist) * k, e.y - FOOT + (dy / dist) * k);
      const visible = open > 0;
      this.whites[i].setVisible(visible).setScale(eyes === 'wide' ? 1.15 : 1, this.blink * open);
      this.pupils[i].setVisible(visible).setScale(1, this.blink * open);
    });
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
