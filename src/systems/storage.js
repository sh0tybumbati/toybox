// Storage furniture: items dropped on it snap into visible slots, stay in view,
// follow the furniture if it's moved, and can be dragged out again.
import { FLOOR_TOP, FLOOR_BOTTOM } from '../config.js';
import { clamp } from '../util.js';
import { SLOT_SCALE, nearestFreeSlot, accepts } from './slots.js';
import { puff } from './interactions.js';

const isStorage = p => p.def.behaviour === 'storage';
export const slotWorld = (prop, i) => ({ x: prop.x + prop.def.slots[i].x, y: prop.y + prop.def.slots[i].y });
export const hasRoom = prop => prop.stored.includes(null);

// Storage pieces that would take `item` right now (kind allowed, a slot free).
export const storageFor = (scene, item) => scene.props.filter(p => isStorage(p) && accepts(p.def, item.kind) && hasRoom(p));

// An item was released: if it's over a storage piece with a free slot, put it away.
export function storeInFurniture(scene, item) {
  const targets = storageFor(scene, item).filter(p => p.zone().contains(item.x, item.y)).sort((a, b) => b.depth - a.depth);
  for (const prop of targets) {
    const slot = nearestFreeSlot(prop.def.slots, prop.stored, item.x - prop.x, item.y - prop.y);
    if (slot < 0) continue;
    prop.stored[slot] = item;
    prop.boing(0.45);
    item.storedIn = prop;
    item.storedSlot = slot;
    item.vx = item.vz = item.ly = 0;
    item.z = 0;
    item.snapping = true;                       // the tween drives it, then tickStorage takes over
    const t = slotWorld(prop, slot);
    scene.tweens.add({
      targets: item, x: t.x, y: t.y, scale: SLOT_SCALE, angle: 0, duration: 160, ease: 'Back.easeOut',
      onComplete: () => { item.snapping = false; },
    });
    scene.sfx.pop();
    puff(scene, t.x, t.y, 0xfff3a0, 3);
    scene.dirty = true;
    return true;
  }
  return false;
}

// Floor point an item falls to when it leaves (or its furniture disappears).
const dropLane = prop => clamp(prop.y + prop.def.h / 2, FLOOR_TOP + 20, FLOOR_BOTTOM);

// The player grabbed a stored item: free its slot.
export function takeOut(item) {
  const prop = item.storedIn;
  prop.stored[item.storedSlot] = null;
  item.storedIn = null;
  item.storedSlot = -1;
  item.snapping = false;
  item.lane = dropLane(prop);
}

// Furniture is going away: everything inside tumbles out.
export function releaseAll(scene, prop) {
  prop.stored.forEach((item, i) => {
    if (!item) return;
    prop.stored[i] = null;
    item.storedIn = null;
    item.storedSlot = -1;
    item.snapping = false;
    item.lane = dropLane(prop);
    item.z = Math.max(0, item.lane - (item.y + item.foot()));
    item.vx = Phaser.Math.Between(-180, 180);
    item.vz = 400;
  });
}

// Every frame: keep stored items in their slots, just in front of their furniture.
export function tickStorage(scene) {
  for (const prop of scene.props) {
    if (!isStorage(prop)) continue;
    prop.stored.forEach((item, i) => {
      if (!item || item.dead || item.snapping || item.held) return;
      const t = slotWorld(prop, i);
      item.setPosition(t.x, t.y).setScale(SLOT_SCALE);
      item.angle = 0;
      item.setDepth(prop.depth + 0.0001 * (i + 1));
    });
  }
}
