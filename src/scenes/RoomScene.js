// The room: scene lifecycle (create / update / physics step). Everything else lives in
// the mixins under ./room/, which are copied onto the prototype below:
//   hud, economy, world, saving, furniture, party, objects, dragdrop, tips.
import { W, H, BIN } from '../config.js';
import { clamp } from '../util.js';
import { ROOM_ORDER, START_ROOM, defaultFurniture } from '../data/rooms.js';
import { defaultParty } from '../data/characters.js';
import { pickExpression } from '../systems/expression.js';
import Character from '../entities/Character.js';
import Item from '../entities/Item.js';
import { Sfx } from '../systems/sfx.js';
import { stepBody, isMoving, inBin } from '../systems/physics.js';
import { land, trash, floatText } from '../systems/interactions.js';
import { tickProps } from '../systems/props.js';
import { tickStorage } from '../systems/storage.js';
import { hudMethods } from './room/hud.js';
import { economyMethods } from './room/economy.js';
import { worldMethods } from './room/world.js';
import { savingMethods } from './room/saving.js';
import { furnitureMethods } from './room/furniture.js';
import { partyMethods } from './room/party.js';
import { objectMethods } from './room/objects.js';
import { dragMethods } from './room/dragdrop.js';
import { tipMethods } from './room/tips.js';

const SLEEP_MS = 25000;   // idle this long and everyone dozes off
const NIGHT_SLEEP_MS = 6000;   // lights out this long and everyone dozes off

export default class RoomScene extends Phaser.Scene {
  constructor() { super('Room'); }

  init(data) { this.initialSave = data.save || null; }

  create() {
    this.topDepth = 10;              // ever-increasing depth: last grabbed = on top
    this.bodies = [];                // everything with a shadow + gravity (items and characters)
    this.characters = [];
    this.heldItem = null;
    this.dirty = false;              // something changed since the last save
    this.switching = false;
    this.noSave = false;
    this.binK = 1;
    this.sfx = new Sfx();
    this.roomGfx = [];               // art belonging to the current room
    this.floorState = {};            // room -> items resting there while we're elsewhere
    ROOM_ORDER.forEach(k => { this.floorState[k] = []; });
    this.roomKey = START_ROOM;
    this.shelfSlot = {};
    this.props = [];                 // interactive furniture of the current room
    this.skyObjs = [];               // the window's night sky
    this.night = Boolean(this.initialSave && this.initialSave.night);
    this.coins = this.initialSave ? this.initialSave.coins : 0;
    this.unlocked = new Set(this.initialSave ? this.initialSave.unlocked : []);
    this.tipsSeen = new Set(this.initialSave ? this.initialSave.tips : []);    // guided-start tips already done
    this.discovered = new Set(this.initialSave ? this.initialSave.recipes : []);   // recipes cooked at least once
    this.editMode = false;           // furniture mode: drag furniture around, add/remove pieces
    this.editUI = [];
    // Each room's furniture as plain data (positions + what's stored inside). The
    // current room's live objects are captured back into this when we leave.
    this.propState = {};
    const initial = this.initialSave;
    ROOM_ORDER.forEach(k => { this.propState[k] = (initial && initial.furniture[k]) || defaultFurniture(k); });
    this.lastEarned = {};            // rule -> time of last payout (cooldowns)
    this.groundCoins = [];           // park coins lying around
    this.nightSince = this.time.now - (this.night ? NIGHT_SLEEP_MS : 0);

    // Night = a dark blue multiply layer over everything (HUD sits above it).
    this.nightOverlay = this.add.rectangle(0, 0, W, H, 0x5560a8).setOrigin(0).setDepth(8000)
      .setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(this.night ? 0.85 : 0);

    this.zoneHint = this.add.graphics().setDepth(5); // shows valid drop zones while dragging

    // Trash bin (lives in every room)
    this.add.ellipse(BIN.x, BIN.lane, 80, 16, 0x000000).setAlpha(0.28).setDepth(2);
    this.bin = this.add.text(BIN.x, BIN.lane - 34, '🗑️', { fontSize: '76px' }).setOrigin(0.5).setDepth(3);

    // The party comes from the save (or a fresh default) and is edited in the creator.
    const saved = this.initialSave;
    (saved ? saved.characters : defaultParty()).forEach(entry => this.addCharacter(entry));
    if (saved) this.restore(saved);
    this.lastActive = this.time.now;
    this.input.on('pointerdown', () => { this.lastActive = this.time.now; });
    this.input.on('pointermove', () => { this.lastActive = this.time.now; });

    this.buildRoom();
    this.createHud(Boolean(saved));

    // Autosave: periodically if anything changed, and when the tab goes away.
    this.time.addEvent({ delay: 1500, loop: true, callback: () => {
      if (this.dirty) { this.dirty = false; this.save(); }
    } });
    this.onPageHide = () => this.save();
    window.addEventListener('pagehide', this.onPageHide);
    this.events.once('shutdown', () => window.removeEventListener('pagehide', this.onPageHide));

    this.setupDragEvents();
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 1 / 30);

    for (const b of this.bodies) {
      if (!b.held && !b.dead && !b.worn && !b.onShelf && !b.storedIn) this.stepBody(b, dt);

      if (b instanceof Item && !b.dead && !b.worn && !b.storedIn) {   // item scale = lift * squash
        const s = 1 + 0.15 * b.lift;
        b.setScale(s * b.sq.x, s * b.sq.y);
      }

      // Shadow shrinks and fades with height above the floor.
      if (b.shadow) {
        const z = b.held ? Math.max(0, b.lane - (b.y + b.foot())) : b.z;
        const k = 1 / (1 + z / 220);
        const grow = b instanceof Character ? b.scaleX : 1;
        b.shadow.setVisible(!b.worn && !b.onShelf && !b.dead && !b.storedIn);
        b.shadow.setPosition(b.x, b.lane - 1).setScale(k * grow).setAlpha(0.28 * k);
      }
    }

    // Faces: eyes watch the held item, otherwise the pointer.
    const look = this.heldItem || this.input.activePointer;
    for (const c of this.characters) {
      c.animate(time, look.x, look.y);
      c.vxs += ((c.x - c.px) / Math.max(dt, 0.001) - c.vxs) * 0.2;   // smoothed speed
      c.px = c.x;
      c.syncWorn();

      // Face: whatever the situation calls for (systems/expression.js).
      const now = this.time.now;
      const sleepy = now - this.lastActive > SLEEP_MS || (this.night && now - this.nightSince > NIGHT_SLEEP_MS);
      c.setExpression(pickExpression({
        now, sleepy,
        grabbed: c.held && c.dragMoved,
        chewing: now < c.eatingUntil,
        reaction: c.reaction, reactUntil: c.reactUntil,
        pokedUntil: c.pokedUntil,
        hoverFood: Boolean(this.heldItem && this.heldItem.kind === 'food'
          && c.getZone('mouth').contains(this.heldItem.x, this.heldItem.y)),
      }));
      if (sleepy && now >= c.nextZ) {
        c.nextZ = now + 2200;
        floatText(this, c.x + 50 * c.scaleX, c.y - 190 * c.scaleX, '💤');
      }
    }

    this.drawZoneHint();
    tickProps(this, this.time.now);
    for (const p of this.props) {                          // nearer (lower) furniture draws in front
      p.setDepth(1 + Math.min(0.9, (p.y + p.def.h / 2) / 1000 * 0.9));
      if (p.removeBtn) p.removeBtn.setPosition(p.x + p.def.w / 2, p.y - p.def.h / 2);
    }
    tickStorage(this);

    // The bin perks up and wiggles while something droppable hovers over it.
    const over = Boolean(this.heldItem) && inBin(this.heldItem);
    this.binK += ((over ? 1.25 : 1) - this.binK) * 0.25;
    this.bin.setScale(this.binK).setAngle(over ? Math.sin(time / 60) * 6 : 0);
  }

  // Advance one body's physics and place it on screen.
  stepBody(b, dt) {
    const impact = stepBody(b, dt);
    if (impact) land(this, b, impact);
    if (b.throwable) {
      // Lean into the motion in flight, settle upright on the ground.
      b.angle = b.z > 0 ? clamp(b.vx * 0.03, -25, 25) : b.angle * Math.pow(0.0005, dt);
      // Landed inside the bin's footprint? Into the trash it goes.
      if (b.z === 0 && !b.dead && inBin(b)) trash(this, b);
    }
    if (isMoving(b)) this.dirty = true;       // still moving: keep saving
    b.y = b.lane - b.foot() - b.z;
  }
}

Object.assign(RoomScene.prototype, hudMethods, economyMethods, worldMethods, savingMethods, furnitureMethods, partyMethods, objectMethods, dragMethods, tipMethods);
