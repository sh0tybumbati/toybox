// Room scene mixin — Drag & drop: the pointer events and the drop-zone hints.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { FLOOR_BOTTOM } from '../../config.js';
import { SLOTS_FOR } from '../../data/items.js';
import Character from '../../entities/Character.js';
import Prop from '../../entities/Prop.js';
import { canAccept } from '../../systems/cooking.js';
import { comboPartner, handleDrop, land, squashTo, trash } from '../../systems/interactions.js';
import { inBin, laneForFeet, throwVelocity } from '../../systems/physics.js';
import { adopt } from '../../systems/support.js';
import { inStock } from '../../systems/hard/stock.js';
import { clampPlacement } from '../../systems/slots.js';
import { slotWorld, storageFor, takeOut } from '../../systems/storage.js';
import { clamp } from '../../util.js';

export const dragMethods = {
  setupDragEvents() {
    const input = this.input;

    // dragstart: fires once when the pointer picks an object up.
    input.on('dragstart', (pointer, obj) => {
      if (obj.isPet) return this.petDragStart(obj);
      if (obj instanceof Prop) {                // furniture mode: pick a piece up
        this.sfx.pop();
        obj.boing(-0.7);                          // picked up: a little stretch
        return;
      }
      if (this.topDepth > 7000) this.renormalizeDepths();
      obj.setDepth(this.topDepth++);            // raise above everything else
      obj.held = true;
      obj.vx = obj.vz = obj.ly = 0;

      if (obj instanceof Character) {
        this.select(obj);
        obj.goal = null; obj.onArrive = null;
        if (obj.sleeping) this.wakeUp(obj);
        if (obj.riding) this.dismount(obj, true);
        obj.dragStart = { x: obj.x, y: obj.y, t: performance.now() };
        obj.dragMoved = false;                    // a press with no movement is a tap (see dragend)
        squashTo(this, obj, 0.94, 1.05, 100);
        return;
      }
      this.sfx.pop();
      this.tipEvent('grab');
      // Grabbing a worn item takes it off whoever wears it.
      if (obj.worn) {
        obj.owner.worn[obj.slot] = null;
        obj.lane = obj.owner.lane;
        obj.worn = false;
        obj.owner = null;
        obj.slot = null;
        obj.snapping = false;
      }
      if (obj.storedIn) takeOut(obj);           // taking something out of a cabinet
      obj.tapAt = { t: performance.now(), x: obj.x, y: obj.y };
      this.pickUpStack(obj);                    // anything piled on top of it comes along
      // Grabbing from a shelf leaves a fresh copy behind.
      if (obj.onShelf) {
        obj.onShelf = false;
        const price = obj.price, shop = obj.shop;
        if (price) this.payFor(obj);
        const gen = this.zoneGen;
        this.time.delayedCall(300, () => {
          if (this.zoneGen !== gen) return;       // left the zone meanwhile: shelves restock on return
          if (shop != null && !inStock(this.shopFor(shop), obj.key)) return;          // hard mode: that was the last one
          this.spawnShelfItem(obj.key, obj.shelfPos, { pop: true, price, shop });
          this.sfx.pop();
        });
      }
      obj.samples = [];
      this.heldItem = obj;
      this.tweens.add({ targets: obj, lift: 1, duration: 120, ease: 'Back.easeOut' });
      squashTo(this, obj, 0.88, 1.14, 100);      // stretch up as it's lifted
    });

    // drag: fires every pointer move while held; dragX/dragY already include
    // the grab offset, so we assign them (clamped to the room).
    input.on('drag', (pointer, obj, dragX, dragY) => {
      if (obj.isPet) return this.petDrag(obj, dragX, dragY);
      if (obj instanceof Prop) {                // keep furniture where it belongs (floor / wall)
        const at = clampPlacement(obj.def, dragX, dragY + obj.def.h / 2, this.worldW);
        obj.setPosition(at.x, at.y - obj.def.h / 2);
        return;
      }
      const isChar = obj instanceof Character;
      const mx = isChar ? 60 : 30;
      obj.x = clamp(dragX, mx, this.worldW - mx);
      obj.y = clamp(dragY, isChar ? 190 : 30, FLOOR_BOTTOM - obj.foot());
      obj.lane = laneForFeet(obj.lane, obj.y + obj.foot());
      this.carryStack(obj);

      if (isChar && !obj.dragMoved && Math.hypot(obj.x - obj.dragStart.x, obj.y - obj.dragStart.y) > 6) {
        obj.dragMoved = true;
        this.sfx.pop();
      }
      if (!isChar) {                              // remember motion for throwing
        obj.samples.push({ t: performance.now(), x: obj.x, y: obj.y });
        if (obj.samples.length > 12) obj.samples.shift();
      }
    });

    // dragend: fires on release — test for drops, otherwise let gravity take over.
    input.on('dragend', (pointer, obj) => {
      this.zoneHint.clear();
      this.dirty = true;
      if (obj.isPet) return this.petDragEnd(obj);
      if (obj instanceof Prop) {
        obj.boing(0.9);                           // put down: squash and wobble
        this.sfx.click();
        return;
      }
      obj.held = false;
      const feet = obj.y + obj.foot(), top = adopt(obj, feet, this.surfaces());
      if (top) obj.lane = top.lane;                // let go above a table (or a pile): it lands on it
      obj.z = Math.max(top ? top.h : 0, obj.lane - feet);

      if (obj instanceof Character) {
        obj.vz = 0;
        if (!obj.dragMoved && performance.now() - obj.dragStart.t < 500) this.poke(obj);
        else {
          if (obj.z <= 0) land(this, obj, 220);
          if (!this.tryBed(obj) && !this.tryPlay(obj)) this.tryHug(obj);   // dropped on a bed: sleep; on playground gear: ride; next to a friend: hug
        }
        return;
      }

      this.heldItem = null;
      this.tweens.add({ targets: obj, lift: 0, duration: 120 });
      Object.assign(obj, throwVelocity(obj.samples, performance.now()));
      this.dropStack(obj);
      if (obj.z <= 0) obj.vz = Math.max(0, obj.vz);

      if (this.isContainer(obj) && obj.tapAt && performance.now() - obj.tapAt.t < 450 && Math.hypot(obj.x - obj.tapAt.x, obj.y - obj.tapAt.y) < 10) this.tapContainer(obj);       // a tap, not a drag
      else handleDrop(this, obj);                      // may override velocity / consume item
      if (!obj.dead && !obj.worn && obj.z <= 0 && inBin(obj, this.binXs())) trash(this, obj);

      // Dropped on the floor with no interaction: tiny landing thud.
      if (!obj.dead && !obj.worn && obj.z <= 0 && obj.vz <= 0) land(this, obj, 220);
      this.trimFloor();
    });
  },

  // Lifting something that has things piled on it: they come along, keeping their places in the pile.
  pickUpStack(obj) {
    obj.pile = [];
    if (!obj.stackH) return;
    const on = b => { for (let o = b.base, n = 0; o && n < 12; o = o.base, n++) if (o === obj) return true; return false; };
    for (const b of this.bodies) {
      if (b === obj || !b.stackH || b.dead || b.worn || b.held || !on(b)) continue;
      b.held = true; b.vx = 0; b.vz = 0; b.base = null;
      b.setDepth(obj.depth + 0.01 * (obj.pile.length + 1));
      obj.pile.push({ b, dx: b.x - obj.x, dy: b.y - obj.y });
    }
  },

  carryStack(obj) {
    for (const { b, dx, dy } of obj.pile || []) { b.x = obj.x + dx; b.y = obj.y + dy; b.lane = obj.lane; }
  },

  // Let go: the pile is released with the same throw as the item under it, and settles on it again.
  dropStack(obj) {
    for (const { b, dy } of obj.pile || []) {
      b.held = false;
      b.lane = obj.lane;
      b.z = Math.max(0, obj.z + obj.foot() - dy - b.foot());           // the same height above the one it was piled on
      b.vx = obj.vx; b.vz = obj.vz; b.ly = obj.ly;
    }
    obj.pile = [];
  },

  // Redraw the valid drop zones for the held item; brighter when hovering one.
  drawZoneHint() {
    this.zoneHint.clear();
    if (this.editMode) {                                   // outline every piece of furniture
      this.zoneHint.lineStyle(3, 0xffffff, 0.85);
      for (const p of this.props) this.zoneHint.strokeRect(p.x - p.def.w / 2, p.y - p.def.h / 2, p.def.w, p.def.h);
      return;
    }
    const item = this.heldItem;
    if (!item) return;
    const zones = item.kind === 'food' ? ['mouth'] : SLOTS_FOR[item.kind] || [];
    this.zoneHint.lineStyle(4, 0xffffff, 0.5);
    if (item.kind === 'food') {                            // the oven wants food too
      for (const p of this.props) {
        if (p.def.behaviour !== 'oven' || !canAccept(p)) continue;
        const r = p.zone();
        this.zoneHint.lineStyle(p.zone().contains(item.x, item.y) ? 6 : 4, 0xffffff, p.zone().contains(item.x, item.y) ? 0.95 : 0.5)
          .strokeRoundedRect(r.x, r.y, r.width, r.height, 10);
      }
    }
    for (const p of storageFor(this, item)) {              // storage: outline + the free slots
      const r = p.zone(), hover = r.contains(item.x, item.y);
      this.zoneHint.lineStyle(hover ? 6 : 4, 0xffffff, hover ? 0.95 : 0.5).strokeRoundedRect(r.x, r.y, r.width, r.height, 10);
      p.stored.forEach((it, i) => { if (!it) { const t = slotWorld(p, i); this.zoneHint.fillStyle(0xffffff, 0.35).fillCircle(t.x, t.y, 10); } });
    }
    for (const o of this.bodies) {                         // things this item can be combined with
      if (comboPartner(this, item, o)) this.zoneHint.lineStyle(4, 0xfff3a0, 0.9).strokeCircle(o.x, o.y, 44);
    }
    for (const c of this.characters) {
      for (const name of zones) {
        const r = c.getZone(name);
        const hover = r.contains(item.x, item.y);
        this.zoneHint.lineStyle(hover ? 6 : 4, 0xffffff, hover ? 0.95 : 0.5)
          .strokeRoundedRect(r.x, r.y, r.width, r.height, 14);
      }
    }
  },
};
