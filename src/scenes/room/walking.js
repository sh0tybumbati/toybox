// Room scene mixin — Walking: tap the floor and the selected character strolls over.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { STRIDE, clampGoal, isFloorTap, stepWalk } from '../../systems/walk.js';
import { spriteImage } from '../../systems/itemTextures.js';

export const walkingMethods = {
  // Called from the scene's pointerdown with the list of things under the pointer.
  // Nothing under it + a spot on the floor = walk there.
  onFloorTap(pointer, over) {
    if (this.editMode || this.decor || this.switching || over.length || !isFloorTap(this.worldPoint(pointer).x, this.worldPoint(pointer).y)) return;
    const at = this.worldPoint(pointer);
    const c = this.walkerFor(at);
    if (!c) return;
    const g = clampGoal(at.x, at.y, 100, this.worldW);
    this.walkTo(c, g.x, g.lane);
    this.tipEvent('walk');
  },

  // The selected character, or the one standing nearest the tap.
  walkerFor(pointer) {
    const free = this.characters.filter(c => !c.held && !c.hugging);
    if (this.selected && free.includes(this.selected)) return this.selected;
    return free.sort((a, b) => Math.abs(a.x - pointer.x) - Math.abs(b.x - pointer.x))[0];
  },

  walkTo(c, x, lane) {
    if (c.sleeping) this.wakeUp(c);
    c.goal = { x, lane };
    c.z = 0;                                                // hovering where they were dropped? they hop down first
    c.onArrive = null;
    this.showWalkMarker(x, lane);
  },

  // A little ring where they're headed.
  showWalkMarker(x, lane) {
    const ring = this.add.ellipse(x, lane, 50, 14).setStrokeStyle(4, 0xffffff, 0.9).setDepth(2.5);
    this.tweens.add({ targets: ring, scale: 1.6, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
  },

  // Tapping / dragging a character makes it the one that walks (and shows a ▼ when there is a choice).
  select(c) {
    this.selected = c;
    this.refreshSelectMarker();
  },

  refreshSelectMarker() {
    if (!this.selectMarker) this.selectMarker = spriteImage(this, 'marker', 0, 0, 34).setDepth(8500);
  },

  // Every frame: advance walks, animate steps, keep the selection marker on its head.
  tickWalking(dt) {
    for (const c of this.characters) {
      if (c.held || c.sleeping || c.z > 0) { c.walking = false; if (c.held) c.goal = null; continue; }
      c.y = c.lane - c.foot();                // feet follow the floor lane (walking, hugging and waking tweens move it)
      if (c.hugging) { c.walking = false; continue; }
      const r = stepWalk(c, dt);
      c.walking = r.moved > 0;
      if (r.moved) c.advanceWalk(r.moved, STRIDE);
      if (r.arrived) {
        this.dirty = true;
        if (c.onArrive) { const f = c.onArrive; c.onArrive = null; f(); }
      }
    }
    if (this.selected && !this.characters.includes(this.selected)) this.selected = null;
    if (this.selectMarker) this.selectMarker.setVisible(this.characters.length > 1 && Boolean(this.selected));
    if (this.selectMarker && this.selected) {
      const bob = Math.sin(this.time.now / 250) * 4;
      this.selectMarker.setPosition(this.selected.x, this.selected.headTopY() - 22 + bob);
    }
  },

  // Where to look while walking: the way they're heading.
  lookTarget(c) {
    return c.goal ? { x: c.goal.x, y: c.y } : null;
  },
};
