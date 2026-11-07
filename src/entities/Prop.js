import { PROP_TYPES } from '../data/props.js';
import { penFor } from '../data/inkpen.js';

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
    this.g = scene.add.graphics();
    this.add(this.g);
    this.setSize(def.w, def.h);
    this.setInteractive({ useHandCursor: true, draggable: true });
    scene.add.existing(this);
    this.input.draggable = false;   // only draggable in furniture mode
    this.redraw();
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
