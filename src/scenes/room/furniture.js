// Room scene mixin — Furniture: placing, moving, adding and removing pieces (furniture mode).
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { W } from '../../config.js';
import { PROP_TYPES } from '../../data/props.js';
import Prop from '../../entities/Prop.js';
import { COLORS, inkButton, inkChip, pin, touchable } from '../../ui.js';
import { spriteImage } from '../../systems/itemTextures.js';
import { flushOven } from '../../systems/cooking.js';
import { floatText, puff } from '../../systems/interactions.js';
import { tapProp } from '../../systems/props.js';
import { editRights } from '../../systems/hard/property.js';
import { MAX_FURNITURE, clampPlacement } from '../../systems/slots.js';
import { releaseAll, slotWorld } from '../../systems/storage.js';

export const furnitureMethods = {
  createProp(entry, section) {
    const prop = new Prop(this, entry.type, entry.x, entry.y);
    prop.section = section;
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

  furnitureLimit() { return MAX_FURNITURE * this.zone.sections.length; },

  // What you may change here: kid mode, anything; adult mode, everything you own or only the furniture of the home you rent.
  editRights() {
    if (!this.hard) return 'full';
    const slot = this.zoneSlot();
    return editRights(this.city[slot], this.hard.home, slot);
  },

  toggleEdit() {
    if (this.editMode) this.exitEdit();
    else this.enterEdit();
  },

  enterEdit() {
    if (this.switching || this.heldItem || this.characters.some(c => c.held)) return;
    if (!this.editRights()) { this.sfx.nope(); this.notice('This place is not yours to change'); return; }
    this.editMode = true;
    this.dismountAll(true);                                 // gear is for moving now, not riding
    this.tipEvent('furniture');
    for (const b of this.bodies) if (b.input) b.input.enabled = false;     // only furniture can be grabbed
    for (const p of this.pets) p.input.enabled = false;
    for (const p of this.props) { p.input.draggable = true; this.attachRemoveButton(p); }
    const add = o => { pin(o).setDepth(9500); this.editUI.push(o); return o; };
    add(inkChip(this, W / 2, 76, '🛋️ Furniture mode — drag to move, ✖ to remove', { size: 21, depth: 9500 }));
    add(inkButton(this, W / 2 - 190, 120, '➕ Add furniture', { w: 188, fill: COLORS.green, size: 21, depth: 9500, onTap: () => this.openCatalog() }));
    if (this.editRights() === 'full') add(inkButton(this, W / 2, 120, '🎨 Decorate', { w: 150, fill: COLORS.purple, size: 21, depth: 9500, onTap: () => this.enterDecorate() }));
    add(inkButton(this, W / 2 + 150, 120, '✔ Done', { w: 110, fill: COLORS.orange, size: 21, depth: 9500, onTap: () => this.exitEdit() }));
    this.sfx.click();
  },

  exitEdit() {
    this.editMode = false;
    this.editUI.forEach(o => o.destroy());
    this.editUI = [];
    for (const b of this.bodies) if (b.input && !b.dead && !b.locked) b.input.enabled = true;
    for (const p of this.pets) p.input.enabled = true;
    for (const p of this.props) {
      p.input.draggable = false;
      if (p.removeBtn) { p.removeBtn.destroy(); p.removeBtn = null; }
    }
    this.zoneHint.clear();
    this.dirty = true;
    this.sfx.click();
  },

  attachRemoveButton(prop) {
    prop.removeBtn = touchable(spriteImage(this, 'icon-close', prop.x, prop.y, 36).setDepth(9500), 44).on('pointerdown', () => this.removeFurniture(prop));
  },

  openCatalog() {
    this.scene.pause();
    this.scene.launch('Catalog', { room: this });
  },

  // A new piece from the catalogue, dropped near the middle for the player to place.
  addFurniture(type) {
    if (this.props.length >= this.furnitureLimit()) { floatText(this, this.cameras.main.scrollX + W / 2, 200, 'This building floor is full!', 28); return; }
    const def = PROP_TYPES[type];
    const mid = this.cameras.main.scrollX + 480;
    const at = clampPlacement(def, mid + ((this.props.length % 5) - 2) * 60, def.mount === 'wall' ? def.h + 90 : 500, this.worldW);
    const prop = this.createProp({ type, ...at, items: [] });
    this.props.push(prop);
    puff(this, prop.x, prop.y, 0xfff3a0, 6);
    this.sfx.ding();
    this.dirty = true;
    return prop;
  },

  removeFurniture(prop) {
    if (prop.sleeper) this.wakeUp(prop.sleeper, true);
    this.dismountProp(prop, true);
    releaseAll(this, prop);                                  // anything stored tumbles out
    if (prop.def.behaviour === 'oven') flushOven(this, prop);
    if (this.hard && prop.def.gear) {                        // grow gear goes back into the household's stock (a plant in it is lost)
      this.hard.gear = { ...this.hard.gear, [prop.def.gear]: (this.hard.gear[prop.def.gear] || 0) + 1 };
      if (prop.def.plot) delete this.hard.beds[this.bedKey(prop)];
    }
    this.props = this.props.filter(p => p !== prop);
    this.roomGfx = this.roomGfx.filter(o => o !== prop);
    puff(this, prop.x, prop.y, 0xdddddd, 6);
    this.sfx.whoosh();
    prop.destroy();
    this.dirty = true;
  },
};
