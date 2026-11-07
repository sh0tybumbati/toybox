// Room scene mixin — The camera: a zone is wider than the screen, so the camera follows the
// selected kid, can be panned with the ◀ ▶ buttons and scrolls when something is dragged to an edge.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { W } from '../../config.js';
import { ROOMS } from '../../data/rooms.js';
import { touchable } from '../../ui.js';
import { spriteImage } from '../../systems/itemTextures.js';
import { clamp } from '../../util.js';

const PAN_SPEED = 720;                 // px/s with the arrows
const EDGE = 64;                       // dragging within this many px of the screen edge scrolls
const EDGE_SPEED = 520;

export const cameraMethods = {
  setupCamera() {
    this.panDir = 0;
    this.detached = false;                 // true once the player pans by hand: stop following until the kid walks again
    this.arrows = [-1, 1].map(dir => {
      const t = spriteImage(this, 'arrow', dir < 0 ? 34 : W - 34, 320, 54).setFlipX(dir < 0)
        .setDepth(9400).setScrollFactor(0).setAlpha(0.8);
      touchable(t, 14).on('pointerdown', () => { this.panDir = dir; }).on('pointerup', () => { this.panDir = 0; }).on('pointerout', () => { this.panDir = 0; });
      return t;
    });
  },

  snapCamera(x) {
    const cam = this.cameras.main;
    cam.scrollX = clamp(x - W / 2, 0, Math.max(0, this.worldW - W));
  },

  // World coordinates of a pointer (the camera may be scrolled).
  worldPoint(pointer) { return this.cameras.main.getWorldPoint(pointer.x, pointer.y); },

  // The room the middle of the screen is in.
  currentSection() {
    const x = this.cameras.main.scrollX + W / 2;
    return this.zone.sections.find(s => x < s.offset + s.w) || this.zone.sections[this.zone.sections.length - 1];
  },
  currentRoomType() { return this.currentSection().type; },

  tickCamera(dt) {
    const cam = this.cameras.main, max = Math.max(0, this.worldW - W), before = cam.scrollX;
    const grabbed = this.heldItem || this.characters.find(c => c.held) || this.pets.find(p => p.held);
    const p = this.input.activePointer;
    let dir = this.panDir;
    if (!dir && grabbed && p.isDown) dir = p.x < EDGE ? -1 : p.x > W - EDGE ? 1 : 0;      // drag something to an edge to scroll
    if (dir) {
      cam.scrollX = clamp(cam.scrollX + dir * (this.panDir ? PAN_SPEED : EDGE_SPEED) * dt, 0, max);
      if (this.panDir) this.detached = true;
      const dx = cam.scrollX - before;
      if (grabbed && dx) {                                                                   // the held thing stays under the finger
        grabbed.x += dx;
        if (grabbed.isPet) grabbed.setX(grabbed.x);
      }
    } else if (!this.detached && !grabbed) {
      const t = this.selected || this.characters[0];
      if (t) cam.scrollX += (clamp(t.x - W / 2, 0, max) - cam.scrollX) * Math.min(1, dt * 4);
    }
    if (this.selected && this.selected.goal) this.detached = false;                          // they're off again: follow
    this.arrows[0].setVisible(max > 0 && cam.scrollX > 4);
    this.arrows[1].setVisible(max > 0 && cam.scrollX < max - 4);

    const sec = this.currentSection();
    if (sec.id !== this.curSectionId) { this.curSectionId = sec.id; this.updateNav(); this.refreshTip(); }
  },

  // "Home · Floor 1 · Bedroom"
  zoneLabel() {
    const z = this.zone, sec = this.currentSection();
    return `${z.name}${z.floorCount > 1 ? ` · ${z.floorLabel}` : ''} · ${ROOMS[sec.type].label.split(' ').slice(1).join(' ')}`;
  },
};
