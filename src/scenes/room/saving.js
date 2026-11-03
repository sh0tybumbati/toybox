// Room scene mixin — Turning the live room into a save, and a save back into a room.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { SAVE_VERSION } from '../../config.js';
import { ROOM_ORDER } from '../../data/rooms.js';
import Item from '../../entities/Item.js';
import { saveStore } from '../../systems/save.js';

export const savingMethods = {
  // `d` is already sanitized (systems/save.js). Characters themselves were
  // created from d.characters; here we put their worn items back on.
  restore(d) {
    this.roomKey = d.room;
    for (const sc of d.characters) {
      const c = this.characters.find(x => x.id === sc.id);
      if (!c) continue;
      for (const [slot, key] of Object.entries(sc.worn)) {
        const item = this.createItem(key, c.x, c.lane);
        item.worn = true;
        item.owner = c;
        item.slot = slot;
        c.worn[slot] = item;
      }
    }
    for (const room of ROOM_ORDER) this.floorState[room] = d.floors[room];
  },

  save() {
    if (this.noSave) return;
    const floors = {};
    ROOM_ORDER.forEach(k => { floors[k] = this.floorState[k]; });
    const furniture = {};
    ROOM_ORDER.forEach(k => { furniture[k] = this.propState[k]; });
    furniture[this.roomKey] = this.captureProps();
    floors[this.roomKey] = this.bodies.filter(b => b instanceof Item && !b.worn && !b.onShelf && !b.dead && !b.storedIn)
      .map(b => ({ k: b.key, x: Math.round(b.x), l: Math.round(b.lane) }));
    saveStore.save({
      v: SAVE_VERSION, room: this.roomKey, night: this.night, coins: this.coins, unlocked: [...this.unlocked], recipes: [...this.discovered], tips: [...this.tipsSeen], furniture, floors,
      characters: this.characters.map(c => ({
        id: c.id, name: c.name, look: c.look, x: Math.round(c.x), lane: Math.round(c.lane), scale: c.scaleX,
        worn: Object.fromEntries(Object.entries(c.worn).filter(([, it]) => it).map(([s, it]) => [s, it.key])),
      })),
    });
  },
};
