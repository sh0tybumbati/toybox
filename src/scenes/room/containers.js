// Room scene mixin — Containers: boxes and backpacks are items you can carry. Tap to open (and drop things in),
// tap an open one to take something out; two quick taps shut it. What is inside goes where the container goes.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { CATALOG } from '../../data/items.js';
import { floatText, puff, squashTo } from '../../systems/interactions.js';
import { ensureItemTexture, iconImage } from '../../systems/itemTextures.js';

const TAP_MS = 380;                         // two taps this close shut a container

export const containerMethods = {
  isContainer: item => Boolean(item.key) && CATALOG[item.key]?.kind === 'container',

  // Show the container open or shut, with a few of its things peeking out of the top.
  setContainerState(item, open) {
    item.open = open;
    item.art.setTexture(ensureItemTexture(this, open ? `${item.key}_open` : item.key));
    (item.peeks || []).forEach(o => o.destroy());
    item.peeks = [];
    if (!open) return;
    const size = CATALOG[item.key].size || 72, shown = item.contents.slice(-3);
    shown.forEach((key, i) => {
      const peek = iconImage(this, `item:${key}`, (i - (shown.length - 1) / 2) * size * 0.26, -size * 0.2, size * 0.34);
      item.add(peek);
      item.peeks.push(peek);
    });
  },

  // Fill a container from a save (floor items keep what is inside them).
  fillContainer(item, keys, open) {
    item.contents = keys.slice(0, CATALOG[item.key].cap);
    this.setContainerState(item, Boolean(open));
  },

  // A tap on a container.
  tapContainer(item) {
    this.lastActive = this.time.now;
    const now = this.time.now;
    if (!item.open) {
      this.setContainerState(item, true);
      this.tipEvent('open');
      this.sfx.creak ? this.sfx.creak() : this.sfx.pop();
      squashTo(this, item, 1.1, 0.9, 110);
      item.lastTap = now;
    } else if (item.contents.length && !(item.lastTap && now - item.lastTap < TAP_MS)) {
      item.lastTap = now;
      this.popOut(item);
    } else {
      this.setContainerState(item, false);
      this.sfx.click();
      squashTo(this, item, 1.08, 0.92, 110);
    }
    this.dirty = true;
  },

  // Something hops out of the top.
  popOut(item) {
    const key = item.contents.pop();
    const out = this.createItem(key, item.x + Phaser.Math.Between(-30, 30), item.lane);
    out.z = (item.z || 0) + 60; out.y = out.lane - out.foot() - out.z;
    out.vz = 420; out.vx = Phaser.Math.Between(-140, 140);
    out.sq.x = out.sq.y = 0.01;
    this.tweens.add({ targets: out.sq, x: 1, y: 1, duration: 300, ease: 'Back.easeOut' });
    this.setContainerState(item, true);
    this.sfx.pop();
    this.trimFloor();
  },

  // An item was let go over an open container with room left: it drops in. Returns true if consumed.
  dropInContainer(item) {
    if (this.isContainer(item)) return false;
    const box = this.bodies.find(b => b !== item && b.open && !b.dead && !b.held && !b.worn && !b.storedIn && b.contents
      && b.contents.length < CATALOG[b.key].cap && Math.abs(item.x - b.x) < (CATALOG[b.key].size || 72) * 0.5 && item.y > b.y - (CATALOG[b.key].size || 72) * 0.8 && item.y < b.y + (CATALOG[b.key].size || 72) * 0.3);
    if (!box) return false;
    box.contents.push(item.key);
    this.discard(item, { x: box.x, y: box.y - 10, scale: 0.2, duration: 200 });
    this.setContainerState(box, true);
    squashTo(this, box, 1.12, 0.9, 120);
    puff(this, box.x, box.y - 20, 0xfff3a0, 4);
    this.sfx.pop();
    floatText(this, box.x, box.y - 70, `${box.contents.length} / ${CATALOG[box.key].cap}`, 22);
    this.dirty = true;
    return true;
  },
};
