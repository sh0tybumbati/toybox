// Room scene mixin — Pets: they wander, trot after the selected kid, and love being petted and fed.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { FLOOR_BOTTOM, FLOOR_TOP } from '../../config.js';
import { PETS, PET_KINDS, MAX_PETS } from '../../data/pets.js';
import { PET_SPEED, PET_STRIDE, petGoal, thinkDelay } from '../../systems/pets.js';
import { floatText, puff } from '../../systems/interactions.js';
import { stepWalk } from '../../systems/walk.js';
import { flightStretch } from '../../systems/squash.js';
import { clamp } from '../../util.js';

const SIZE = 80;

export const petMethods = {
  // A new pet of `kind` hopping into the room at (x, lane).
  addPet(kind, x = this.cameras.main.scrollX + Phaser.Math.Between(150, 800), lane = Phaser.Math.Between(FLOOR_TOP + 20, FLOOR_BOTTOM - 20)) {
    if (!PETS[kind]) return null;
    const pet = this.add.text(x, lane, PETS[kind].emoji, { fontSize: `${SIZE}px` }).setOrigin(0.5, 0.85)
      .setInteractive({ draggable: true, useHandCursor: true });
    pet.isPet = true; pet.kind = kind;
    pet.lane = lane; pet.z = 0; pet.vz = 0; pet.goal = null; pet.held = false;
    pet.phase = 0; pet.nextThink = this.time.now + 800; pet.moved = false;
    pet.shadow = this.add.ellipse(x, lane, 50, 12, 0x000000).setAlpha(0.28).setDepth(2);
    this.pets.push(pet);
    this.dirty = true;
    return pet;
  },

  removePet(pet) {
    this.pets = this.pets.filter(p => p !== pet);
    pet.shadow.destroy();
    pet.destroy();
    this.dirty = true;
  },

  // The pet basket: tap for a new friend (a kind you don't have yet comes first).
  adoptPet(basket) {
    if (this.pets.length >= MAX_PETS) {
      this.sfx.nope();
      floatText(this, basket.x, basket.y - 60, 'Home is full!', 24);
      return;
    }
    const spare = PET_KINDS.filter(k => !this.pets.some(p => p.kind === k));
    const kind = Phaser.Utils.Array.GetRandom(spare.length ? spare : PET_KINDS);
    const pet = this.addPet(kind, basket.x, clamp(basket.y + 10, FLOOR_TOP + 20, FLOOR_BOTTOM));
    pet.z = 70; pet.vz = 350;                                // hop out of the basket
    basket.boing(0.7);
    this.sfx.pop();
    this.petCry(pet);
    puff(this, basket.x, basket.y - 20, 0xfff3a0, 5);
  },

  petCry(pet) { this.sfx[PETS[pet.kind].cry](); },

  // A tap: hearts, a cry and a happy hop.
  petPet(pet) {
    pet.pats = (pet.pats || 0) + 1;
    pet.vz = 420; pet.z = Math.max(pet.z, 0.01);
    this.petCry(pet);
    floatText(this, pet.x, pet.y - 50, '💖');
    this.lastActive = this.time.now;
  },

  // The closest pet to a point, within `r` px and the same stretch of floor.
  petNear(x, lane, r = 60) {
    return this.pets.find(p => !p.held && Math.abs(p.x - x) < r && Math.abs(p.lane - lane) < 70);
  },

  // Food dropped on a pet: gobble, hop, hearts.
  feedPet(pet, item) {
    this.discard(item, { x: pet.x, y: pet.y - 20, scale: 0, duration: 200 });
    this.sfx.crunch();
    pet.vz = 380; pet.z = Math.max(pet.z, 0.01);
    this.time.delayedCall(250, () => { if (pet.active) { this.petCry(pet); floatText(this, pet.x, pet.y - 50, '😋'); } });
    this.earn('eat', pet.x, pet.y - 90);
  },

  // Dragging: pets follow the finger (a plain drag, no throwing).
  petDragStart(pet) { pet.held = true; pet.moved = false; pet.grab = { x: pet.x, y: pet.y }; pet.goal = null; pet.setDepth(this.topDepth++); this.sfx.pop(); },
  petDrag(pet, x, y) {
    if (Math.hypot(x - pet.grab.x, y - pet.grab.y) > 6) pet.moved = true;           // a press with no real movement is a pat
    pet.x = clamp(x, 40, this.worldW - 40);
    pet.lane = clamp(y + 20, FLOOR_TOP, FLOOR_BOTTOM);
    pet.z = Math.max(0, 40 + (pet.lane - 20 - y));
    pet.setPosition(pet.x, y);
  },
  petDragEnd(pet) {
    pet.held = false;
    if (!pet.moved) { pet.z = 0; this.petPet(pet); return; }
    const basket = this.props.find(p => p.def.behaviour === 'pets' && p.zone().contains(pet.x, pet.y));
    if (basket) { this.sfx.whoosh(); this.removePet(pet); return; }          // back to the basket: they go home
    this.dirty = true;
  },

  // Every frame: think, walk, hop, shadow. Pets follow the selected kid (or the first).
  tickPets(dt, now) {
    const leader = this.selected || this.characters[0] || null;
    for (const pet of this.pets) {
      if (pet.held) { pet.shadow.setPosition(pet.x, pet.lane).setScale(0.8).setAlpha(0.2); continue; }
      if (!pet.goal && now >= pet.nextThink) {
        pet.goal = petGoal(pet, leader && !leader.sleeping ? leader : null, Math.random, this.worldW);
        pet.nextThink = now + thinkDelay();
      }
      const r = stepWalk(pet, dt, PET_SPEED);
      if (r.moved) pet.phase += r.moved / PET_STRIDE * Math.PI;
      // little hops along the way, plus the vertical physics of being tossed or petted
      if (pet.z > 0 || pet.vz) {
        pet.vz -= 1900 * dt; pet.z += pet.vz * dt;
        if (pet.z <= 0) { if (pet.vz < -150) pet.land = 1; pet.z = 0; pet.vz = 0; }
      }
      const hop = r.moved ? Math.abs(Math.sin(pet.phase)) * 12 : 0;
      pet.setPosition(pet.x, pet.lane - hop - pet.z);
      pet.setAngle(r.moved ? Math.sin(pet.phase) * 6 : 0);
      pet.land = (pet.land || 0) * Math.pow(0.02, dt);                            // a squash when it lands, fading fast
      const air = flightStretch(0, pet.vz * 1.4, { max: 0.2, ref: 900 }), br = 1 + Math.sin(now / 500 + pet.lane) * 0.015;
      pet.setScale(br * air.x * (1 + 0.22 * pet.land), br * air.y * (1 - 0.2 * pet.land));
      pet.setDepth(4 + pet.lane / 1000);                          // low: behind the kids and the items (a kid's click area ignores spots where a pet stands: see Character.petAt)
      const k = 1 / (1 + pet.z / 200);
      pet.shadow.setPosition(pet.x, pet.lane + 2).setScale(k).setAlpha(0.28 * k);
    }
  },
};
