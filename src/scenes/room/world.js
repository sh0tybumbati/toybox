// Room scene mixin — The world: zones (one floor of a building = one wide panorama of rooms),
// travelling between them, building the current zone, night and the sky.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { BIN, FLOOR_TOP, FLOOR_BOTTOM, H } from '../../config.js';
import { ROOMS, defaultFurniture, shelvesFor } from '../../data/rooms.js';
import { defaultLook, paintDivider, paintRoom, paintSunbeams } from '../../data/decor.js';
import { InkPen } from '../../data/inkpen.js';
import Character from '../../entities/Character.js';
import { flushProps } from '../../systems/props.js';
import { sectionAt, zoneInfo, entryZone } from '../../systems/world.js';
import { SHELF_STEP, SHELF_W } from '../../config.js';
import { clamp } from '../../util.js';
import { priceOf } from '../../systems/market.js';
import { TEX_SIZE, ensureSpriteTexture, spriteImage } from '../../systems/itemTextures.js';

const SUNBEAMS = false;            // the hand-inked style (art/reference/) is flat: no light effects

export const worldMethods = {
  // --- per-room state lookups ---------------------------------------------------
  // A room's look: the room type's own, with anything the player repainted on top.
  sectionLook(sec) {
    const base = defaultLook(ROOMS[sec.type], sec.w), own = this.looks[sec.id];
    return own ? { wall: own.wall || base.wall, floor: own.floor || base.floor, windows: own.windows || base.windows } : base;
  },
  sectionProps(sec) { return this.propState[sec.id] || defaultFurniture(sec.type, sec.w, sec.extra); },
  floorList(id) { return this.floorState[id] || (this.floorState[id] = []); },

  // Put an item into the right room's resting list (used when leaving a zone and by ovens).
  stashAt(key, x, lane) {
    const { section, local } = sectionAt(this.zone, x);
    this.floorList(section.id).push({ k: key, x: Math.round(local), l: Math.round(lane) });
  },

  // --- travelling -----------------------------------------------------------------
  // Fade out, swap the whole zone (rooms, shelves, furniture, floor items), fade back in. The
  // characters and everything they wear come along. arrive: 'entrance' | 'keep' | 'connector'.
  goToZone(key, { arrive = 'entrance', force = false, connector = null } = {}) {
    if (this.switching || (!force && key === this.zoneKey) || this.heldItem || this.characters.some(c => c.held)) return false;
    if (!zoneInfo(this.city, key)) return false;
    this.switching = true;
    this.input.enabled = false;
    this.sfx.whoosh();
    const cam = this.cameras.main;
    cam.fadeOut(180, 43, 34, 51);
    cam.once('camerafadeoutcomplete', () => {
      if (this.editMode) this.exitEdit();
      if (this.decor) this.exitDecorate();
      this.closeLiftPanel();
      this.characters.forEach(c => { if (c.sleeping) this.wakeUp(c, true); c.goal = null; c.onArrive = null; });
      this.pets.forEach(p => { p.goal = null; });
      flushProps(this);                         // ovens hand back dishes / ingredients
      this.leaveZone();
      this.zoneKey = key;
      this.buildZone();
      this.arrive(arrive, connector);
      this.updateNav();
      this.deliverParcels();
      if (this.zone.sections.some(s => s.type === 'shop')) this.tipEvent('shop'); else this.refreshTip();
      this.save();
      cam.fadeIn(180, 43, 34, 51);
      cam.once('camerafadeincomplete', () => { this.input.enabled = true; this.switching = false; });
    });
    return true;
  },

  // The city map takes over the whole screen, so put the zone away (its furniture and floor items
  // are kept as data) and let the map edit the city freely; exitCityMap() rebuilds.
  openCityMap() {
    if (this.switching) return;
    this.tipEvent('map');
    if (this.editMode) this.exitEdit();
    this.closeLiftPanel();
    this.characters.forEach(c => { if (c.sleeping) this.wakeUp(c, true); c.goal = null; c.onArrive = null; });
    flushProps(this);
    this.leaveZone();
    this.scene.pause();
    this.scene.launch('Hub', { room: this });
  },

  // Close the map and go to `preferred` (or the nearest valid place). `visit`: they walked in the door.
  exitCityMap(preferred, visit = false) {
    this.scene.resume('Room');
    this.goToZone(this.resolveZone(preferred), { force: true, arrive: visit ? 'entrance' : 'keep' });
  },

  // Back from the city map: go where the player chose, or (if the zone they were in no longer
  // exists, e.g. a floor was removed) to the closest valid place.
  resolveZone(preferred) {
    if (zoneInfo(this.city, preferred)) return preferred;
    const slot = Number(String(preferred).split('.')[0]);
    if (this.city[slot]) return entryZone(this.city, slot);
    const first = this.city.findIndex(Boolean);
    return first >= 0 ? entryZone(this.city, first) : this.zoneKey;
  },

  // A building was knocked down: forget everything stored about its rooms, and any post addressed to it.
  forgetBuilding(slot) {
    const mine = id => id.startsWith(`${slot}.`);
    for (const table of [this.propState, this.floorState, this.looks]) for (const id of Object.keys(table)) if (mine(id)) delete table[id];
    this.parcels = this.parcels.filter(p => p.to !== slot);
    this.dirty = true;
  },

  // Remember the current zone's furniture and floor items, then tear its art down.
  leaveZone() {
    if (!this.zoneLive) return;                 // already torn down (the city map does that while it's open)
    this.dismountAll(true);                     // riders get off, so they are saved standing on the ground
    Object.assign(this.propState, this.captureProps());     // (needs zoneLive: capture before clearing it)
    this.zoneLive = false;
    this.stashZone();
    this.roomGfx.forEach(o => { if (o.active) o.destroy(); });
    this.roomGfx = [];
    this.props = [];
    this.groundCoins = [];
    this.binObjs = [];
    this.beams = [];
    if (this.parkEvent) { this.parkEvent.remove(); this.parkEvent = null; }
  },

  // Loose items rest in the room they're in until we come back.
  stashZone() {
    const keep = [];
    for (const b of this.bodies) {
      if (b instanceof Character || b.worn) { keep.push(b); continue; }
      if (!b.dead && !b.onShelf && !b.storedIn) this.stashAt(b.key, b.x, b.lane);
      b.destroy();
    }
    this.bodies = keep;
    this.heldItem = null;
  },

  // The current zone's furniture as saveable data, grouped by room (each in its own local x).
  captureProps() {
    const out = {};
    if (!this.zoneLive) return out;
    this.zone.sections.forEach(s => { out[s.id] = []; });
    for (const p of this.props) {
      const { section, local } = sectionAt(this.zone, p.x);
      out[section.id].push({
        type: p.type, x: Math.round(local), y: Math.round(p.y + p.def.h / 2),
        items: p.stored.map((it, s) => (it ? { s, k: it.key } : null)).filter(Boolean),
      });
    }
    return out;
  },

  // Loose floor items of the current zone as saveable data, grouped by room.
  captureFloors() {
    const out = {};
    if (!this.zoneLive) return out;
    this.zone.sections.forEach(s => { out[s.id] = [...this.floorList(s.id)]; });
    for (const b of this.bodies) {
      if (b instanceof Character || b.worn || b.onShelf || b.dead || b.storedIn || !b.key) continue;
      const { section, local } = sectionAt(this.zone, b.x);
      out[section.id].push({ k: b.key, x: Math.round(local), l: Math.round(b.lane), ...(b.base ? { z: Math.round(b.z) } : {}), ...(b.contents && b.contents.length ? { c: [...b.contents], ...(b.open ? { o: 1 } : {}) } : b.open ? { o: 1 } : {}) });
    }
    return out;
  },

  // --- building a zone -------------------------------------------------------------
  // Paint every room of the zone side by side, stock the shelves, stand the furniture up.
  buildZone() {
    const zone = this.zone = zoneInfo(this.city, this.zoneKey);
    this.zoneLive = true;
    this.worldW = zone.width;
    this.zoneGen = (this.zoneGen || 0) + 1;
    this.binObjs = [];
    this.beams = [];
    this.sectionGfx = {};
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.worldW, H);
    this.props = [];
    let n = 0;
    for (const sec of zone.sections) {
      const type = ROOMS[sec.type], look = this.sectionLook(sec);
      const g = this.add.graphics().setDepth(0).setPosition(sec.offset, 0);
      this.roomGfx.push(g);
      this.sectionGfx[sec.id] = { room: g };
      paintRoom(g, type, look, sec.w);
      const shelfG = this.add.graphics().setDepth(0.05).setPosition(sec.offset, 0);       // shelves sit on top, so repainting the room keeps them
      this.roomGfx.push(shelfG);
      if (SUNBEAMS && !type.outdoor && look.windows.length) {          // light through the windows, off at night (the ink style has no lighting effects)
        const beam = this.add.graphics().setDepth(0.4).setPosition(sec.offset, 0).setVisible(!this.night);
        paintSunbeams(beam, look.windows, sec.w);
        this.roomGfx.push(beam);
        this.beams.push(beam);
      }
      if (sec.index > 0) {                                              // the doorway between neighbouring rooms
        const door = this.add.graphics().setDepth(0.6);
        paintDivider(door, sec.offset);
        this.roomGfx.push(door);
      }

      for (const entry of this.sectionProps(sec)) this.props.push(this.createProp({ ...entry, x: entry.x + sec.offset }, sec));

      const pen = new InkPen(shelfG, 77 + sec.index);
      for (const sh of shelvesFor(sec.type, sec.w)) {
        if (type.shelfStyle === 'stand') {                                       // posts down to the ground
          pen.fillStyle(0xb98657, 1).fillRect(sh.x + 14, sh.y + 12, 11, 432 - sh.y - 12).fillRect(sh.x + SHELF_W - 25, sh.y + 12, 11, 432 - sh.y - 12);
        } else {                                                                 // wall brackets
          pen.fillStyle(0xb98657, 1).fillTriangle(sh.x + 20, sh.y + 17, sh.x + 50, sh.y + 17, sh.x + 20, sh.y + 42)
            .fillTriangle(sh.x + SHELF_W - 20, sh.y + 17, sh.x + SHELF_W - 50, sh.y + 17, sh.x + 20 + SHELF_W - 40, sh.y + 42);
        }
        pen.fillStyle(0xe3c291, 1).fillRect(sh.x, sh.y, SHELF_W, 14);           // shelf board
        sh.items.forEach((key, i) => {
          this.spawnShelfItem(key, { x: sec.offset + sh.x + SHELF_STEP / 2 + i * SHELF_STEP, y: sh.y }, { pop: true, delay: 150 + n++ * 40, price: sec.type === 'market' ? priceOf(key) : 0 });
        });
      }

      for (const f of this.floorList(sec.id)) { const it = this.createItem(f.k, sec.offset + f.x, f.l); if (f.z) { it.z = f.z; it.y = it.lane - it.foot() - it.z; } if (f.c || f.o) this.fillContainer(it, f.c || [], f.o); }
      this.floorState[sec.id] = [];

      if (type.bin !== false) this.addBin(sec.offset + BIN.x);
    }
    this.syncSwitches();
    this.drawSky();
    if (zone.sections.some(s => s.type === 'park')) {                          // coins appear now and then
      this.spawnCoin();
      this.parkEvent = this.time.addEvent({ delay: 4000, loop: true, callback: () => this.spawnCoin() });
    }
  },

  // A trash bin standing on the floor at world x.
  addBin(x) {
    const shadow = this.add.ellipse(x, BIN.lane, 80, 16, 0x000000).setAlpha(0.28).setDepth(2);
    const text = this.add.image(x, BIN.lane + 2, ensureSpriteTexture(this, 'bin')).setOrigin(0.5, 0.92).setDepth(3);
    const base = 104 / TEX_SIZE;
    text.setScale(base);
    this.roomGfx.push(shadow, text);
    this.binObjs.push({ x, text, k: 1, base });
  },
  binXs() { return this.binObjs.map(b => b.x); },

  // Where the party stands after arriving. 'entrance': the first room (or beside the matching
  // elevator/stairs when they came through one). 'keep': stay where they were (clamped).
  arrive(mode, connector) {
    const chars = this.characters;
    if (mode === 'keep') {
      chars.forEach(c => { c.x = clamp(c.x, 100, Math.max(100, this.worldW - 100)); });
    } else {
      let x = 260, lane = 500;
      const exit = mode === 'connector' && connector && this.props.filter(p => p.def.connector === connector.kind)
        .sort((a, b) => Math.abs(a.x - connector.x) - Math.abs(b.x - connector.x))[0];
      if (exit) {
        x = exit.x; lane = clamp(exit.y + exit.def.h / 2 - 12, FLOOR_TOP + 20, FLOOR_BOTTOM);
        exit.setState(true);
        this.time.delayedCall(900, () => { if (exit.active) exit.setState(false); });
      }
      const spread = [0, 110, -110, 220];
      chars.forEach((c, i) => {
        c.x = clamp(x + spread[i % 4] + (exit ? 0 : 0), 100, this.worldW - 100);
        c.lane = clamp(lane + (i % 2) * 22, FLOOR_TOP + 20, FLOOR_BOTTOM);
        c.y = c.lane - c.foot();
        c.z = 0;
      });
      this.pets.forEach(p => { p.x = clamp(x + 60, 60, this.worldW - 60); p.lane = clamp(lane + 20, FLOOR_TOP + 10, FLOOR_BOTTOM - 5); });
    }
    this.selected = this.selected && chars.includes(this.selected) ? this.selected : chars[0] || null;
    this.detached = false;
    this.snapCamera((this.selected || chars[0] || { x: 480 }).x);
  },

  // --- time of day ------------------------------------------------------------------
  setNight(on) {
    this.night = on;
    this.nightSince = this.time.now;
    this.tweens.add({ targets: this.nightOverlay, alpha: on ? 0.85 : 0, duration: 500 });
    this.beams.forEach(b => b.setVisible(!on));
    this.syncSwitches();
    this.drawSky();
    this.dirty = true;
  },

  syncSwitches() {
    this.props.filter(p => p.def.behaviour === 'switch').forEach(p => p.setState(!this.night));
  },

  // At night every window shows a starry sky and outdoor rooms get a moon and stars (drawn above
  // the dark layer so they glow).
  drawSky() {
    this.skyObjs.forEach(o => { this.tweens.killTweensOf(o); o.destroy(); });
    this.skyObjs = [];
    if (!this.night) return;
    const add = o => { o.setDepth(8001); this.skyObjs.push(o); return o; };
    for (const sec of this.zone.sections) {
      const room = ROOMS[sec.type], off = sec.offset;
      if (room.openSky) {                                                        // outdoors: a moon and scattered stars
        add(spriteImage(this, 'moon', off + sec.w - 120, 90, 70));
        for (let i = 0; i < 18; i++) {
          const star = add(this.add.circle(off + 30 + ((i * 131) % (sec.w - 60)), 20 + ((i * 67) % 230), 2 + (i % 2), 0xffffff));
          this.tweens.add({ targets: star, alpha: 0.25, duration: 700 + i * 90, yoyo: true, repeat: -1, delay: i * 130 });
        }
        continue;
      }
      for (const w of this.sectionLook(sec).windows) {
        const wx = off + w.x;
        add(this.add.rectangle(wx + 4, w.y + 4, w.w - 8, w.h - 8, 0x172055).setOrigin(0));
        for (let i = 0; i < 8; i++) {
          const star = add(this.add.circle(wx + 14 + ((i * 53) % (w.w - 28)), w.y + 12 + ((i * 37) % (w.h - 36)), 2 + (i % 2), 0xffffff));
          this.tweens.add({ targets: star, alpha: 0.25, duration: 700 + i * 120, yoyo: true, repeat: -1, delay: i * 150 });
        }
        add(spriteImage(this, 'moon', wx + w.w * 0.72, w.y + w.h * 0.32, 40));
        const bars = add(this.add.graphics());
        bars.lineStyle(8, 0xffffff, 1).lineBetween(wx + w.w / 2, w.y, wx + w.w / 2, w.y + w.h).lineBetween(wx, w.y + w.h / 2, wx + w.w, w.y + w.h / 2);
      }
    }
  },

  // Depths only ever grow; keep them well below the night layer by renumbering.
  renormalizeDepths() {
    const sorted = [...this.bodies].sort((a, b) => a.depth - b.depth);
    this.topDepth = 10;
    sorted.forEach(b => b.setDepth(this.topDepth++));
  },
};
