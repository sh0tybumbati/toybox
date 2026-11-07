// Room scene mixin — The party: adding and removing characters, creator, poking, blinking.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { CHAR_SCALE } from '../../config.js';
import { MAX_PARTY, SLOT_X } from '../../data/characters.js';
import Character from '../../entities/Character.js';
import { floatText, squashTo } from '../../systems/interactions.js';

export const partyMethods = {
  // `entry` = { id, name, look, x?, lane?, scale? } — the same shape the save stores.
  addCharacter(entry) {
    const c = new Character(this, { ...entry, x: entry.x ?? this.freeX(), lane: entry.lane ?? Phaser.Math.Between(480, 515) });
    c.setScale(entry.scale ?? CHAR_SCALE);
    c.setDepth(this.topDepth++);
    this.addShadow(c, 100, 18);
    c.y = c.lane - c.foot();
    c.px = c.x;
    this.characters.push(c);
    this.bodies.push(c);
    c.onStep = () => this.sfx.step();
    this.scheduleBlink(c);
    return c;
  },

  // First standing spot that isn't crowded.
  freeX() { return SLOT_X.find(x => this.characters.every(c => Math.abs(c.x - x) > 80)) ?? 480; },

  // Everything they wore tumbles to the floor, then they leave.
  removeCharacter(c) {
    if (this.characters.length <= 1) return;
    for (const slot of Object.keys(c.worn)) {
      const item = c.worn[slot];
      if (!item) continue;
      c.worn[slot] = null;
      item.worn = false; item.owner = null; item.slot = null; item.snapping = false;
      item.lane = c.lane;
      item.z = Math.max(0, item.lane - (item.y + item.foot()));
      item.vx = Phaser.Math.Between(-200, 200); item.vz = 500;
    }
    this.characters = this.characters.filter(x => x !== c);
    this.bodies = this.bodies.filter(b => b !== c);
    c.destroy();
    this.dirty = true;
  },

  canAddCharacter() { return this.characters.length < MAX_PARTY; },

  openCreator() {
    if (this.switching) return;
    this.scene.pause();
    this.scene.launch('Creator', { room: this });
  },

  afterCreator() {
    this.dirty = false;
    this.lastActive = this.time.now;
    this.save();
  },

  // A tap on a character (a press with no real movement): giggle and jiggle.
  poke(c) {
    c.pokedUntil = this.time.now + 900;
    squashTo(this, c, 1.1, 0.92, 90);
    this.sfx.giggle();
    floatText(this, c.x, c.headTopY() - 10, '😄');
  },

  // Blink every 2–5 seconds.
  scheduleBlink(c) {
    this.time.delayedCall(Phaser.Math.Between(2000, 5000), () => {
      if (!c.active) return;               // removed from the party
      this.tweens.add({ targets: c, blink: 0.1, duration: 80, yoyo: true, onComplete: () => this.scheduleBlink(c) });
    });
  },
};
