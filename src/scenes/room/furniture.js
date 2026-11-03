// Room scene mixin — Furniture: placing, moving, adding and removing pieces (furniture mode).
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { W } from '../../config.js';
import { PROP_TYPES } from '../../data/props.js';
import Prop from '../../entities/Prop.js';
import { touchable } from '../../ui.js';
import { flushOven } from '../../systems/cooking.js';
import { floatText, puff } from '../../systems/interactions.js';
import { tapProp } from '../../systems/props.js';
import { MAX_FURNITURE, clampPlacement } from '../../systems/slots.js';
import { releaseAll, slotWorld } from '../../systems/storage.js';

export const furnitureMethods = {
  createProp(entry) {
    const prop = new Prop(this, entry.type, entry.x, entry.y);
    prop.roomKey = this.roomKey;
    prop.on('pointerdown', () => tapProp(this, prop));
    prop.input.draggable = this.editMode;
    this.roomGfx.push(prop);
    if (this.editMode) this.attachRemoveButton(prop);
    for (const { s, k } of entry.items || []) {            // put stored items back in their slots
      const at = slotWorld(prop, s);
      const item = this.createItem(k, at.x, at.y);
      item.storedIn = prop;
      item.storedSlot = s;
      prop.stored[s] = item;
    }
    return prop;
  },

  // The room's furniture as saveable data.
  captureProps() {
    return this.props.map(p => ({
      type: p.type, x: Math.round(p.x), y: Math.round(p.y + p.def.h / 2),
      items: p.stored.map((it, s) => (it ? { s, k: it.key } : null)).filter(Boolean),
    }));
  },

  toggleEdit() {
    if (this.editMode) this.exitEdit();
    else this.enterEdit();
  },

  enterEdit() {
    if (this.switching || this.heldItem || this.characters.some(c => c.held)) return;
    this.editMode = true;
    this.tipEvent('furniture');
    for (const b of this.bodies) if (b.input) b.input.enabled = false;     // only furniture can be grabbed
    for (const p of this.props) { p.input.draggable = true; this.attachRemoveButton(p); }
    const pill = { fontSize: '20px', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.55)', padding: { x: 14, y: 8 } };
    const add = o => { o.setDepth(9500); this.editUI.push(o); return o; };
    add(this.add.text(W / 2, 74, '🛋️ Furniture mode — drag to move, ✖ to remove', pill).setOrigin(0.5));
    add(this.add.text(W / 2 - 110, 118, '➕ Add furniture', { ...pill, backgroundColor: '#3b8f5a' }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.openCatalog()));
    add(this.add.text(W / 2 + 110, 118, '✔ Done', { ...pill, backgroundColor: '#e0a030' }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.exitEdit()));
    this.sfx.click();
  },

  exitEdit() {
    this.editMode = false;
    this.editUI.forEach(o => o.destroy());
    this.editUI = [];
    for (const b of this.bodies) if (b.input && !b.dead && !b.locked) b.input.enabled = true;
    for (const p of this.props) {
      p.input.draggable = false;
      if (p.removeBtn) { p.removeBtn.destroy(); p.removeBtn = null; }
    }
    this.zoneHint.clear();
    this.dirty = true;
    this.sfx.click();
  },

  attachRemoveButton(prop) {
    prop.removeBtn = touchable(this.add.text(prop.x, prop.y, '✖', {
      fontSize: '22px', color: '#c0392b', backgroundColor: '#ffffff', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(9500), 8).on('pointerdown', () => this.removeFurniture(prop));
  },

  openCatalog() {
    this.scene.pause();
    this.scene.launch('Catalog', { room: this });
  },

  // A new piece from the catalogue, dropped near the middle for the player to place.
  addFurniture(type) {
    if (this.props.length >= MAX_FURNITURE) { floatText(this, W / 2, 200, 'This room is full!', 28); return; }
    const def = PROP_TYPES[type];
    const at = clampPlacement(def, 480 + ((this.props.length % 5) - 2) * 60, def.mount === 'wall' ? def.h + 90 : 500);
    const prop = this.createProp({ type, ...at, items: [] });
    this.props.push(prop);
    puff(this, prop.x, prop.y, 0xfff3a0, 6);
    this.sfx.ding();
    this.dirty = true;
    return prop;
  },

  removeFurniture(prop) {
    releaseAll(this, prop);                                  // anything stored tumbles out
    if (prop.def.behaviour === 'oven') flushOven(this, prop);
    this.props = this.props.filter(p => p !== prop);
    this.roomGfx = this.roomGfx.filter(o => o !== prop);
    puff(this, prop.x, prop.y, 0xdddddd, 6);
    this.sfx.whoosh();
    prop.destroy();
    this.dirty = true;
  },
};
