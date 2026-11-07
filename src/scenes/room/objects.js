// Room scene mixin — Items in the room: creating, shelving, discarding, floor clutter.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { MAX_FLOOR_ITEMS } from '../../config.js';
import { isPremium } from '../../data/economy.js';
import Item from '../../entities/Item.js';

export const objectMethods = {
  addShadow(obj, w, h) {
    obj.shadow = this.add.ellipse(obj.x, obj.y, w, h, 0x000000).setAlpha(0.28).setDepth(2);
  },

  // Create a catalog item standing on `contactY` (its bottom edge).
  createItem(key, x, contactY, { onShelf = false } = {}) {
    const item = new Item(this, key, x, contactY, { onShelf });
    item.setDepth(this.topDepth++);
    this.addShadow(item, 46, 12);
    item.shadow.setVisible(false);
    item.input.enabled = !this.editMode;
    this.bodies.push(item);
    return item;
  },

  // Put a catalog item on its shelf slot ({ x, y } in world coordinates).
  spawnShelfItem(key, slot, { pop = false, delay = 0 } = {}) {
    const item = this.createItem(key, slot.x, slot.y, { onShelf: true });
    item.shelfPos = slot;
    if (isPremium(key) && !this.unlocked.has(key)) this.lockItem(item);
    if (pop) {  // pop into existence
      item.sq.x = item.sq.y = 0.01;
      this.tweens.add({ targets: item.sq, x: 1, y: 1, duration: 350, delay, ease: 'Back.easeOut' });
    }
    return item;
  },

  // Retire an item with a final tween (eaten, binned, faded), then remove it.
  discard(item, tween) {
    item.dead = true;
    item.disableInteractive();
    if (item.shadow) item.shadow.setVisible(false);
    this.dirty = true;
    this.tweens.add({
      targets: item, duration: 300, ...tween,
      onComplete: () => { item.destroy(); this.bodies = this.bodies.filter(b => b !== item); },
    });
  },

  // Too much clutter on the floor? Oldest items fade away.
  trimFloor() {
    const loose = this.bodies.filter(b => b instanceof Item && !b.onShelf && !b.worn && !b.held && !b.dead && !b.storedIn);
    for (const item of loose.slice(0, Math.max(0, loose.length - MAX_FLOOR_ITEMS))) {
      this.discard(item, { alpha: 0, scale: 0 });
    }
  },
};
