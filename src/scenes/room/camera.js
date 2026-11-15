// Room scene mixin — The camera: a zone is wider than the screen, so the camera follows the
// selected kid, can be panned with the ◀ ▶ buttons and scrolls when something is dragged to an edge.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { view } from '../../view.js';
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
      const t = spriteImage(this, 'arrow', dir < 0 ? 34 : view.w - 34, 320, 54).setFlipX(dir < 0)
        .setDepth(9400).setScrollFactor(0).setAlpha(0.8);
      touchable(t, 14).on('pointerdown', () => { this.panDir = dir; }).on('pointerup', () => { this.panDir = 0; }).on('pointerout', () => { this.panDir = 0; });
      return t;
    });
  },

  // How far the camera can scroll. A zone narrower than the screen sits in the middle of it (min === max, negative), and the
  // walls and floor are painted past its ends.
  camRange() {
    const vw = view.w;
    if (this.worldW <= vw) { const mid = (this.worldW - vw) / 2; return { min: mid, max: mid }; }
    return { min: 0, max: this.worldW - vw };
  },
  setCamBounds() {
    const { min, max } = this.camRange();
    this.cameras.main.setBounds(min, 0, max - min + view.w, 600);
  },
  // The window changed shape: put the HUD, the arrows and the camera range back.
  onResize() {
    if (!this.zoneLive) return;
    this.layoutHud(); this.setCamBounds();
    this.arrows[1].setX(view.w - 34);
    this.nightOverlay.width = 4000; this.nightOverlay.displayWidth = 4000;
    this.snapCamera(this.cameras.main.scrollX + view.w / 2);
    this.hideTip(); this.refreshTip();
  },

  snapCamera(x) {
    const cam = this.cameras.main, { min, max } = this.camRange();
    cam.scrollX = clamp(x - view.w / 2, min, max);
  },

  // World coordinates of a pointer (the camera may be scrolled).
  worldPoint(pointer) { return this.cameras.main.getWorldPoint(pointer.x, pointer.y); },

  // The room the middle of the screen is in.
  currentSection() {
    const x = this.cameras.main.scrollX + view.w / 2;
    return this.zone.sections.find(s => x < s.offset + s.w) || this.zone.sections[this.zone.sections.length - 1];
  },
  currentRoomType() { return this.currentSection().type; },

  tickCamera(dt) {
    const cam = this.cameras.main, { min, max } = this.camRange(), before = cam.scrollX;
    const grabbed = this.heldItem || this.characters.find(c => c.held) || this.pets.find(p => p.held);
    const p = this.input.activePointer;
    let dir = this.panDir;
    if (!dir && grabbed && p.isDown) dir = p.x < EDGE ? -1 : p.x > view.w - EDGE ? 1 : 0;      // drag something to an edge to scroll
    if (dir) {
      cam.scrollX = clamp(cam.scrollX + dir * (this.panDir ? PAN_SPEED : EDGE_SPEED) * dt, min, max);
      if (this.panDir) this.detached = true;
      const dx = cam.scrollX - before;
      if (grabbed && dx) {                                                                   // the held thing stays under the finger
        grabbed.x += dx;
        if (grabbed.isPet) grabbed.setX(grabbed.x);
      }
    } else if (!this.detached && !grabbed) {
      const t = this.selected || this.characters[0];
      if (t) cam.scrollX += (clamp(t.x - view.w / 2, min, max) - cam.scrollX) * Math.min(1, dt * 4);
    }
    if (this.selected && this.selected.goal) this.detached = false;                          // they're off again: follow
    this.arrows[0].setVisible(max > min && cam.scrollX > min + 4);
    this.arrows[1].setVisible(max > min && cam.scrollX < max - 4);

    const sec = this.currentSection();
    if (sec.id !== this.curSectionId) { this.curSectionId = sec.id; this.updateNav(); if (this.decor) this.buildDecorUI(); else this.refreshTip(); }
  },

  // "Home · Floor 1 · Bedroom"
  zoneLabel() {
    const z = this.zone, sec = this.currentSection();
    return `${z.name}${z.floorCount > 1 ? ` · ${z.floorLabel}` : ''} · ${ROOMS[sec.type].label.split(' ').slice(1).join(' ')}`;
  },
};
