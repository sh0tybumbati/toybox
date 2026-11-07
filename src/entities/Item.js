import { CATALOG } from '../data/items.js';
import { FLOOR_TOP } from '../config.js';
import { ART_BOX } from '../data/itemart.js';
import { TEX_SIZE, ensureItemTexture } from '../systems/itemTextures.js';

// A draggable, hand-inked item (data/itemart.js). A Container (centred on the item) holding one image, so scale,
// alpha and tweens work on the whole item. Physics state follows the fake-3D model in
// systems/physics.js: `lane` is the floor y the item's bottom touches, `z` its height.
export default class Item extends Phaser.GameObjects.Container {
  constructor(scene, key, x, contactY, { onShelf = false } = {}) {
    const def = CATALOG[key];
    const size = def.size || 72;                        // on-screen size of the art's 128px box
    const footBase = size * (56 / ART_BOX);             // origin -> where the art stands (y=120 of 128)
    super(scene, x, contactY - footBase);
    this.art = scene.add.image(0, 0, ensureItemTexture(scene, key)).setScale(size / TEX_SIZE);
    this.add(this.art);
    this.setSize(size * 0.84, size * 0.84);
    scene.add.existing(this);
    this.setInteractive({ draggable: true, useHandCursor: true });

    this.key = key;
    this.kind = def.kind;
    this.footBase = footBase;
    this.bounce = def.bounce || 0.38;
    this.gscale = def.gscale || 1;
    this.throwable = true;

    this.onShelf = onShelf;            // shelf items skip physics until grabbed
    this.held = false;
    this.dead = false;
    this.worn = false;
    this.owner = null;                 // Character wearing it
    this.slot = null;
    this.snapping = false;             // true while the equip tween drives position

    this.lane = onShelf ? FLOOR_TOP + 25 : contactY;
    this.z = 0; this.vx = 0; this.vz = 0; this.ly = 0;
    this.lift = 0;                     // 0..1, "picked up" scale bump
    this.sq = { x: 1, y: 1 };          // squash & stretch factors (tweened)
    this.samples = [];                 // recent pointer positions, for throwing
    this.storedIn = null;              // storage furniture holding it, if any
    this.storedSlot = -1;
    this.locked = false;               // premium item not yet bought (shop shelves)
    this.tag = null;                   // its price tag
  }

  foot() { return this.footBase * this.scaleY; }

  destroy(fromScene) {
    if (this.shadow) { this.shadow.destroy(); this.shadow = null; }
    if (this.tag) { this.tag.destroy(); this.tag = null; }
    super.destroy(fromScene);
  }
}
