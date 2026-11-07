import { PROP_TYPES } from '../data/props.js';
import { penFor } from '../data/inkpen.js';
import { easeStretch, flightStretch, jellyScale, newJelly, poke, stepJelly } from '../systems/squash.js';

// A piece of interactive furniture. The container's origin is the CENTRE of its
// hit box; (x, groundY) places its bottom edge on the floor/wall point given.
export default class Prop extends Phaser.GameObjects.Container {
  constructor(scene, type, x, groundY) {
    const def = PROP_TYPES[type];
    super(scene, x, groundY - def.h / 2);
    this.def = def;
    this.type = type;
    this.state = false;          // open / cooking / lights-on, depending on behaviour
    // Oven state: ingredients inside, idle | waiting | cooking, and its speech bubble
    this.contents = [];
    this.stage = 'idle';
    this.startAt = 0;
    this.outcome = null;
    this.uiObjs = [];
    this.stored = def.slots ? def.slots.map(() => null) : [];   // storage: item (or null) per slot
    this.removeBtn = null;       // the ✖ shown in furniture mode
    this.jig = newJelly();       // the wobble after a boing
    this.vst = { x: 1, y: 1 };   // stretch from being dragged around (furniture mode)
    this.lastX = null; this.lastY = null;
    this.g = scene.add.graphics();
    this.add(this.g);
    this.riders = [];            // friends on this playground piece (systems/play.js)
    this.rock = 0;               // how much its moving parts are rocking (0..1)
    // Moving parts of playground gear (a swing seat, the seesaw plank): their own Graphics, rotated about the pivot every frame.
    this.parts = ((def.ride && def.ride.parts) || []).map((part, i) => {
      if (!part.draw) return null;
      const pg = scene.add.graphics().setPosition(part.pivot.x, part.pivot.y);
      part.draw(penFor(pg, `${type}${i}`));
      this.add(pg);
      return pg;
    });
    this.setSize(def.w, def.h);
    this.setInteractive({ useHandCursor: true, draggable: true });
    scene.add.existing(this);
    this.input.draggable = false;   // only draggable in furniture mode
    this.redraw();
  }

  // Poke the furniture: it squashes (strength > 0) then springs up and wobbles back. Negative = a stretch first.
  boing(strength = 0.5) { poke(this.jig, -strength * 3.6); }

  // Every frame: apply the wobble and any drag-stretch to the drawing, keeping the bottom edge on the floor.
  tickSquash(dt) {
    const d = Math.max(dt, 0.001);
    const vx = this.lastX === null ? 0 : (this.x - this.lastX) / d, vy = this.lastY === null ? 0 : (this.y - this.lastY) / d;
    this.lastX = this.x; this.lastY = this.y;
    easeStretch(this.vst, flightStretch(vx, vy, { max: 0.12, ref: 900 }), dt, 14);
    stepJelly(this.jig, dt);
    const j = jellyScale(this.jig), sx = j.x * this.vst.x, sy = j.y * this.vst.y;
    this.g.setScale(sx, sy);
    this.g.y = (this.def.h / 2) * (1 - sy);
    const parts = (this.def.ride && this.def.ride.parts) || [];
    this.parts.forEach((pg, i) => { if (pg) pg.setScale(sx, sy).setPosition(parts[i].pivot.x * sx, parts[i].pivot.y * sy + this.g.y); });
  }

  redraw() { this.g.clear(); this.def.draw(penFor(this.g, this.type), this.state); }

  setState(v) {
    if (v === this.state) return;
    this.state = v;
    this.redraw();
  }

  destroy(fromScene) {
    this.uiObjs.forEach(o => o.destroy());
    this.uiObjs = [];
    if (this.removeBtn) { this.removeBtn.destroy(); this.removeBtn = null; }
    super.destroy(fromScene);
  }

  // World rectangle used for drop tests (food on the oven).
  zone() {
    return new Phaser.Geom.Rectangle(this.x - this.def.w / 2, this.y - this.def.h / 2, this.def.w, this.def.h);
  }
}
