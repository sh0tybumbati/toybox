// Room scene mixin — Friends: hugging each other and sleeping in beds.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { FLOOR_BOTTOM } from '../../config.js';
import { HUG_MS, bedAt, hugPartner, hugSpots } from '../../systems/social.js';
import { floatText, puff, squashTo } from '../../systems/interactions.js';
import { clamp } from '../../util.js';

const SLEEP_SCALE = 0.78;               // lying down, they fit on the bed

export const socialMethods = {
  // --- Hugging -----------------------------------------------------------------

  // Called when a character is dropped: close enough to a friend? Then they hug.
  tryHug(c) {
    const other = hugPartner(this.characters, c);
    if (!other) return false;
    const spots = hugSpots(other, c);                       // `other` stays on its side, `c` joins it
    const pairs = [[other, spots.a], [c, spots.b]];
    for (const [who, at] of pairs) {
      who.hugging = true;
      who.hugSide = who === c ? Math.sign(other.x - c.x) || 1 : Math.sign(c.x - other.x) || 1;     // arms reach toward the other
      who.goal = null;
      who.hugUntil = this.time.now + HUG_MS;
      who.reaction = 'yum'; who.reactUntil = who.hugUntil;
      this.tweens.add({ targets: who, x: at.x, lane: clamp(at.lane, 0, FLOOR_BOTTOM), duration: 220, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: who, angle: at.tilt, duration: 220, ease: 'Back.easeOut' });
      squashTo(this, who, 1.08, 0.94, 140);
      this.time.delayedCall(HUG_MS, () => {
        if (!who.active) return;
        who.hugging = false;
        this.tweens.add({ targets: who, angle: 0, duration: 200 });
      });
    }
    this.sfx.cuddle();
    const mid = (other.x + c.x) / 2;
    for (const [i, e] of ['💖', '💕', '💞'].entries()) {
      this.time.delayedCall(i * 260, () => floatText(this, mid + (i - 1) * 34, Math.min(other.headTopY(), c.headTopY()) - 10, e));
    }
    this.earn('hug', mid, Math.min(other.headTopY(), c.headTopY()) - 50);
    this.dirty = true;
    return true;
  },

  // --- Sleeping ----------------------------------------------------------------

  // Tuck `c` into a bed: lie down head-on-the-pillow, blanket over, eyes shut.
  startSleep(c, bed, instant = false) {
    if (bed.sleeper || c.sleeping) return;
    c.sleeping = bed; bed.sleeper = c;
    c.goal = null; c.onArrive = null; c.walking = false; c.tucked = false;
    c.z = 0; c.vz = 0;
    c.preScale = c.scaleX;
    c.lane = bed.y;                                         // for the shadow and for waking up beside the bed
    const at = { x: bed.x + 6, y: bed.y - 22, angle: -90, scale: c.preScale * SLEEP_SCALE };
    this.sfx.cuddle();
    puff(this, bed.x, bed.y - 40, 0xffffff, 5);
    const blanket = this.add.graphics();                    // draws over the sleeper: a quilt across the lower body
    blanket.fillStyle(0x7fb2e5, 1).fillRoundedRect(-14, -48, 142, 82, 14);
    blanket.fillStyle(0xa9cdf2, 1).fillRoundedRect(-14, -48, 22, 82, 8);
    blanket.lineStyle(3, 0x5f93c8, 1).strokeRoundedRect(-14, -48, 142, 82, 14);
    blanket.setPosition(bed.x + 6, bed.y - 22);
    bed.blanket = blanket;
    this.roomGfx.push(blanket);
    if (instant) { c.setPosition(at.x, at.y); c.setAngle(at.angle); c.setScale(at.scale); }
    if (instant) c.tucked = true;
    else this.tweens.add({ targets: c, ...at, duration: 380, ease: 'Back.easeOut', onComplete: () => { c.tucked = true; } });
    this.dirty = true;
  },

  // Get up and stand beside the bed (or right where they lay, if the bed is gone).
  wakeUp(c, instant = false) {
    const bed = c.sleeping;
    if (!bed) return;
    c.sleeping = null; bed.sleeper = null; c.tucked = false;
    if (bed.blanket) { this.roomGfx = this.roomGfx.filter(o => o !== bed.blanket); bed.blanket.destroy(); bed.blanket = null; }
    const stand = { x: clamp(bed.x + (bed.x > 480 ? -1 : 1) * (bed.def.w / 2 + 70), 100, 860), lane: clamp(bed.y + 10, 0, FLOOR_BOTTOM) };
    c.lane = clamp(c.lane, 0, FLOOR_BOTTOM);
    if (instant) { c.setAngle(0); c.setScale(c.preScale); c.x = stand.x; c.lane = stand.lane; }
    else {
      this.tweens.add({ targets: c, angle: 0, scale: c.preScale, x: stand.x, lane: stand.lane, duration: 260, ease: 'Back.easeOut' });
      squashTo(this, c, 0.94, 1.06, 120);
      this.sfx.pop();
    }
    this.dirty = true;
  },

  // A free bed under a dropped character puts them to sleep.
  tryBed(c) {
    const bed = bedAt(this.props, c.x, c.lane);
    if (!bed) return false;
    this.startSleep(c, bed);
    return true;
  },

  // Tapping a bed sends the selected friend over to climb in.
  sendToBed(bed) {
    if (bed.sleeper) { this.wakeUp(bed.sleeper); return; }
    const c = this.walkerFor({ x: bed.x });
    if (!c) return;
    c.goal = { x: clamp(bed.x - 70, 100, 860), lane: clamp(bed.y - 8, 0, FLOOR_BOTTOM) };
    this.showWalkMarker(c.goal.x, c.goal.lane);
    c.onArrive = () => { if (bed.active && !bed.sleeper) this.startSleep(c, bed); };
  },

  // Every frame: keep sleepers tucked in, drifting zzz's up.
  tickSleepers(now) {
    for (const c of this.characters) {
      const bed = c.sleeping;
      if (!bed) continue;
      c.setDepth(bed.depth + 0.01);
      if (bed.blanket) bed.blanket.setDepth(bed.depth + 0.02);
      if (c.tucked) c.setPosition(bed.x + 6, bed.y - 22 + Math.sin(now / 700) * 1.5);
      if (now >= c.nextZ) { c.nextZ = now + 1800; floatText(this, bed.x - 90, bed.y - 100, '💤'); }
    }
  },
};
