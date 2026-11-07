// The room: scene lifecycle (create / update / physics step). Everything else lives in
// the mixins under ./room/, which are copied onto the prototype below:
//   hud, economy, world, saving, furniture, party, objects, dragdrop, tips.
import { W, H } from '../config.js';
import { clamp } from '../util.js';
import { starterCity, START_ZONE } from '../data/buildings.js';
import { zoneInfo } from '../systems/world.js';
import { defaultParty } from '../data/characters.js';
import { pickExpression } from '../systems/expression.js';
import Character from '../entities/Character.js';
import Item from '../entities/Item.js';
import { Sfx } from '../systems/sfx.js';
import { stepBody, isMoving, inBin } from '../systems/physics.js';
import { land, trash, floatText } from '../systems/interactions.js';
import { tickProps } from '../systems/props.js';
import { easeStretch, flightStretch } from '../systems/squash.js';
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
import { walkingMethods } from './room/walking.js';
import { socialMethods } from './room/social.js';
import { petMethods } from './room/pets.js';
import { cameraMethods } from './room/camera.js';
import { connectorMethods } from './room/connectors.js';

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
    this.pets = [];                  // companions that wander and follow
    this.selected = null;            // the character that walks when the floor is tapped
    this.dirty = false;              // something changed since the last save
    this.switching = false;
    this.noSave = false;
    this.sfx = new Sfx();
    const initial = this.initialSave;
    this.roomGfx = [];               // art belonging to the current zone
    this.city = initial ? initial.city : starterCity();       // a building (or null) per lot
    this.zoneKey = initial ? initial.zone : START_ZONE;       // "lot.floor": the floor of the building we're in
    this.zone = zoneInfo(this.city, this.zoneKey);
    this.worldW = this.zone.width;
    this.looks = initial ? { ...initial.looks } : {};         // repainted rooms: sectionId -> { wall, floor, windows }
    this.floorState = initial ? { ...initial.floors } : {};   // sectionId -> items resting there while we're elsewhere
    this.binObjs = [];
    this.beams = [];                 // window sunbeams (hidden at night)
    this.props = [];                 // interactive furniture of the current zone
    this.skyObjs = [];               // the window's night sky
    this.night = Boolean(this.initialSave && this.initialSave.night);
    this.coins = this.initialSave ? this.initialSave.coins : 0;
    this.unlocked = new Set(this.initialSave ? this.initialSave.unlocked : []);
    this.tipsSeen = new Set(this.initialSave ? this.initialSave.tips : []);    // guided-start tips already done
    this.discovered = new Set(this.initialSave ? this.initialSave.recipes : []);   // recipes cooked at least once
    this.editMode = false;           // furniture mode: drag furniture around, add/remove pieces
    this.editUI = [];
    // Each room's furniture as plain data (positions + what's stored inside); missing = the room's default
    // furniture. The current zone's live objects are captured back into this when we leave.
    this.propState = {};
    if (initial) for (const [id, list] of Object.entries(initial.furniture)) if (list) this.propState[id] = list;
    this.lastEarned = {};            // rule -> time of last payout (cooldowns)
    this.groundCoins = [];           // park coins lying around
    this.nightSince = this.time.now - (this.night ? NIGHT_SLEEP_MS : 0);

    // Night = a dark blue multiply layer over everything (HUD sits above it); fixed to the screen.
    this.nightOverlay = this.add.rectangle(0, 0, W, H, 0x5560a8).setOrigin(0).setDepth(8000).setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(this.night ? 0.85 : 0);

    this.zoneHint = this.add.graphics().setDepth(5); // shows valid drop zones while dragging

    // The party comes from the save (or a fresh default) and is edited in the creator.
    const saved = this.initialSave;
    (saved ? saved.characters : defaultParty()).forEach(entry => this.addCharacter(entry));
    if (saved) this.restore(saved);
    if (saved) saved.pets.forEach(kind => this.addPet(kind));
    this.lastActive = this.time.now;
    this.input.on('pointerdown', (pointer, over) => { this.lastActive = this.time.now; this.onFloorTap(pointer, over); });
    this.input.on('pointermove', () => { this.lastActive = this.time.now; });

    this.buildZone();
    this.setupCamera();
    this.arrive('keep');
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
    this.tickWalking(dt);
    this.tickCamera(dt);
    this.tickPets(dt, time);

    for (const b of this.bodies) {
      if (!b.held && !b.dead && !b.worn && !b.onShelf && !b.storedIn && !b.sleeping) this.stepBody(b, dt);

      if (b instanceof Item && !b.dead && !b.worn && !b.storedIn) {   // item scale = lift * squash * stretch from moving fast
        const s = 1 + 0.15 * b.lift;
        if (!b.onShelf) {
          const d = Math.max(dt, 0.001);
          const vx = b.lastX === undefined ? 0 : (b.x - b.lastX) / d, vy = b.lastY === undefined ? 0 : (b.y - b.lastY) / d;
          b.lastX = b.x; b.lastY = b.y;
          b.st = easeStretch(b.st || { x: 1, y: 1 }, flightStretch(vx, vy), dt);
        }
        const st = b.st || { x: 1, y: 1 };
        b.setScale(s * b.sq.x * st.x, s * b.sq.y * st.y);
      }

      // Shadow shrinks and fades with height above the floor.
      if (b.shadow) {
        const z = b.held ? Math.max(0, b.lane - (b.y + b.foot())) : b.z;
        const k = 1 / (1 + z / 220);
        const grow = b instanceof Character ? b.scaleX : 1;
        b.shadow.setVisible(!b.worn && !b.onShelf && !b.dead && !b.storedIn && !b.sleeping);
        b.shadow.setPosition(b.x, b.lane - 1).setScale(k * grow).setAlpha(0.28 * k);
      }
    }

    // Faces: eyes watch the held item, otherwise the pointer.
    const look = this.heldItem || this.worldPoint(this.input.activePointer);
    for (const c of this.characters) {
      const gaze = (!this.heldItem && this.lookTarget(c)) || look;
      c.animate(time, gaze.x, gaze.y);
      c.vxs += ((c.x - c.px) / Math.max(dt, 0.001) - c.vxs) * 0.2;   // smoothed speed
      const dtc = Math.max(dt, 0.001), vyc = c.py === undefined ? 0 : (c.y - c.py) / dtc;
      c.py = c.y;
      easeStretch(c.st, flightStretch(c.vxs, vyc, { max: 0.12, ref: 1100 }), dt, 12);
      c.px = c.x;
      c.syncWorn();

      // Face: whatever the situation calls for (systems/expression.js).
      const now = this.time.now;
      const sleepy = now - this.lastActive > SLEEP_MS || (this.night && now - this.nightSince > NIGHT_SLEEP_MS);
      c.setExpression(pickExpression({
        now, sleepy,
        grabbed: c.held && c.dragMoved,
        asleep: Boolean(c.sleeping), hugging: c.hugging,
        chewing: now < c.eatingUntil,
        reaction: c.reaction, reactUntil: c.reactUntil,
        pokedUntil: c.pokedUntil,
        hoverFood: Boolean(this.heldItem && this.heldItem.kind === 'food'
          && c.getZone('mouth').contains(this.heldItem.x, this.heldItem.y)),
      }));
      if (sleepy && !c.sleeping && now >= c.nextZ) {
        c.nextZ = now + 2200;
        floatText(this, c.x + 50 * c.scaleX, c.headTopY() - 6, '💤');
      }
    }

    this.tickSleepers(time);
    this.drawZoneHint();
    tickProps(this, this.time.now);
    for (const p of this.props) p.tickSquash(dt);
    for (const p of this.props) {                          // nearer (lower) furniture draws in front
      p.setDepth(1 + Math.min(0.9, (p.y + p.def.h / 2) / 1000 * 0.9));
      if (p.removeBtn) p.removeBtn.setPosition(p.x + p.def.w / 2, p.y - p.def.h / 2);
    }
    tickStorage(this);

    // The bin perks up and wiggles while something droppable hovers over it.
    for (const bin of this.binObjs) {
      const over = Boolean(this.heldItem) && inBin(this.heldItem, [bin.x]);
      bin.k += ((over ? 1.25 : 1) - bin.k) * 0.25;
      bin.text.setScale(bin.k).setAngle(over ? Math.sin(time / 60) * 6 : 0);
    }
  }

  // Advance one body's physics and place it on screen.
  stepBody(b, dt) {
    const impact = stepBody(b, dt, this.worldW);
    if (impact) land(this, b, impact);
    if (b.throwable) {
      // Lean into the motion in flight, settle upright on the ground.
      b.angle = b.z > 0 ? clamp(b.vx * 0.03, -25, 25) : b.angle * Math.pow(0.0005, dt);
      // Landed inside the bin's footprint? Into the trash it goes.
      if (b.z === 0 && !b.dead && inBin(b, this.binXs())) trash(this, b);
    }
    if (isMoving(b)) this.dirty = true;       // still moving: keep saving
    b.y = b.lane - b.foot() - b.z;
  }
}

Object.assign(RoomScene.prototype, hudMethods, economyMethods, worldMethods, savingMethods, furnitureMethods, partyMethods, objectMethods, dragMethods, tipMethods, walkingMethods, socialMethods, petMethods, cameraMethods, connectorMethods);
