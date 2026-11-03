// Room scene mixin — Rooms and time of day: travelling, building a room, night and the sky.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { SHELF_STEP, SHELF_W } from '../../config.js';
import { ROOMS } from '../../data/rooms.js';
import Character from '../../entities/Character.js';
import { flushProps } from '../../systems/props.js';

export const worldMethods = {
  // Fade out, swap the room's art/shelves/floor items, fade back in.
  // The characters and everything they wear come along.
  goToRoom(key) {
    if (this.switching || key === this.roomKey || this.heldItem || this.characters.some(c => c.held)) return;
    this.switching = true;
    this.input.enabled = false;
    this.sfx.whoosh();
    const cam = this.cameras.main;
    cam.fadeOut(180, 43, 34, 51);
    cam.once('camerafadeoutcomplete', () => {
      if (this.editMode) this.exitEdit();
      flushProps(this);                         // ovens hand back dishes / ingredients
      this.propState[this.roomKey] = this.captureProps();
      this.stashRoom();
      this.roomGfx.forEach(o => o.destroy());
      this.roomGfx = [];
      this.props = [];
      this.groundCoins = [];
      if (this.parkEvent) { this.parkEvent.remove(); this.parkEvent = null; }
      this.roomKey = key;
      this.buildRoom();
      this.updateNav();
      if (key === 'shop') this.tipEvent('shop'); else this.refreshTip();
      this.save();
      cam.fadeIn(180, 43, 34, 51);
      cam.once('camerafadeincomplete', () => { this.input.enabled = true; this.switching = false; });
    });
  },

  // Remember the floor items of the current room, then remove them from the scene.
  stashRoom() {
    const keep = [];
    for (const b of this.bodies) {
      if (b instanceof Character || b.worn) { keep.push(b); continue; }
      if (!b.dead && !b.onShelf && !b.storedIn) {
        this.floorState[this.roomKey].push({ k: b.key, x: Math.round(b.x), l: Math.round(b.lane) });
      }
      b.destroy();
    }
    this.bodies = keep;
    this.heldItem = null;
  },

  // Draw the current room, stock its shelves and put back any floor items.
  buildRoom() {
    const room = ROOMS[this.roomKey];
    const g = this.add.graphics().setDepth(0);
    this.roomGfx.push(g);
    room.draw(g);

    this.props = this.propState[this.roomKey].map(entry => this.createProp(entry));
    this.syncSwitches();
    this.drawSky();

    this.shelfSlot = {};
    let n = 0;
    for (const sh of room.shelves) {
      g.fillStyle(0xd9b98a, 1).fillRect(sh.x, sh.y, SHELF_W, 12);              // shelf board
      g.fillStyle(0x9c6b3f, 1).fillRect(sh.x, sh.y + 12, SHELF_W, 5);
      if (room.shelfStyle === 'stand') {                                       // posts down to the ground
        g.fillStyle(0x9c6b3f, 1).fillRect(sh.x + 14, sh.y + 12, 10, 432 - sh.y - 12).fillRect(sh.x + SHELF_W - 24, sh.y + 12, 10, 432 - sh.y - 12);
      } else {                                                                 // wall brackets
        g.fillStyle(0x9c6b3f, 1).fillTriangle(sh.x + 20, sh.y + 17, sh.x + 50, sh.y + 17, sh.x + 20, sh.y + 40)
          .fillTriangle(sh.x + SHELF_W - 20, sh.y + 17, sh.x + SHELF_W - 50, sh.y + 17, sh.x + SHELF_W - 20, sh.y + 40);
      }
      sh.items.forEach((key, i) => {
        this.shelfSlot[key] = { x: sh.x + SHELF_STEP / 2 + i * SHELF_STEP, y: sh.y };
        this.spawnShelfItem(key, { pop: true, delay: 150 + n++ * 60 });
      });
    }

    for (const f of this.floorState[this.roomKey]) this.createItem(f.k, f.x, f.l);
    this.floorState[this.roomKey] = [];

    if (this.roomKey === 'park') {                 // coins appear now and then
      this.spawnCoin();
      this.parkEvent = this.time.addEvent({ delay: 4000, loop: true, callback: () => this.spawnCoin() });
    }
  },

  setNight(on) {
    this.night = on;
    this.nightSince = this.time.now;
    this.tweens.add({ targets: this.nightOverlay, alpha: on ? 0.85 : 0, duration: 500 });
    this.syncSwitches();
    this.drawSky();
    this.dirty = true;
  },

  syncSwitches() {
    this.props.filter(p => p.def.behaviour === 'switch').forEach(p => p.setState(!this.night));
  },

  // At night the window shows a starry sky (drawn above the dark layer so it glows).
  drawSky() {
    this.skyObjs.forEach(o => { this.tweens.killTweensOf(o); o.destroy(); });
    this.skyObjs = [];
    const room = ROOMS[this.roomKey], w = room.window;
    if (this.night && room.openSky) {              // outdoors: a moon and scattered stars, no window
      const add = o => { o.setDepth(8001); this.skyObjs.push(o); return o; };
      add(this.add.text(840, 90, '🌙', { fontSize: '56px' }).setOrigin(0.5));
      for (let i = 0; i < 18; i++) {
        const star = add(this.add.circle(30 + ((i * 131) % 900), 20 + ((i * 67) % 230), 2 + (i % 2), 0xffffff));
        this.tweens.add({ targets: star, alpha: 0.25, duration: 700 + i * 90, yoyo: true, repeat: -1, delay: i * 130 });
      }
      return;
    }
    if (!this.night || !w) return;
    const add = o => { o.setDepth(8001); this.skyObjs.push(o); return o; };
    add(this.add.rectangle(w.x + 4, w.y + 4, w.w - 8, w.h - 8, 0x172055).setOrigin(0));
    for (let i = 0; i < 8; i++) {
      const star = add(this.add.circle(w.x + 14 + ((i * 53) % (w.w - 28)), w.y + 12 + ((i * 37) % (w.h - 36)), 2 + (i % 2), 0xffffff));
      this.tweens.add({ targets: star, alpha: 0.25, duration: 700 + i * 120, yoyo: true, repeat: -1, delay: i * 150 });
    }
    add(this.add.text(w.x + w.w * 0.72, w.y + w.h * 0.32, '🌙', { fontSize: '34px' }).setOrigin(0.5));
    const bars = add(this.add.graphics());
    bars.lineStyle(8, 0xffffff, 1)
      .lineBetween(w.x + w.w / 2, w.y, w.x + w.w / 2, w.y + w.h)
      .lineBetween(w.x, w.y + w.h / 2, w.x + w.w, w.y + w.h / 2);
  },

  // Depths only ever grow; keep them well below the night layer by renumbering.
  renormalizeDepths() {
    const sorted = [...this.bodies].sort((a, b) => a.depth - b.depth);
    this.topDepth = 10;
    sorted.forEach(b => b.setDepth(this.topDepth++));
  },
};
