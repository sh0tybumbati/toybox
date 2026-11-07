// Room scene mixin — Turning the live room into a save, and a save back into a room.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { SAVE_VERSION } from '../../config.js';
import { saveStore } from '../../systems/save.js';

export const savingMethods = {
  // `d` is already sanitized (systems/save.js). Characters themselves were
  // created from d.characters; here we put their worn items back on.
  restore(d) {
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
  },

  save() {
    if (this.noSave) return;
    const floors = { ...this.floorState, ...this.captureFloors() };
    const furniture = { ...this.propState, ...this.captureProps() };
    saveStore.save({
      v: SAVE_VERSION, shirts: this.shirtDesigns, toys: this.toyDesigns, parcels: this.parcels, scores: this.scores, zone: this.zoneKey, city: this.city, looks: this.looks, pets: this.pets.map(p => p.kind), night: this.night, coins: this.coins,
      unlocked: [...this.unlocked], recipes: [...this.discovered], tips: [...this.tipsSeen], furniture, floors,
      characters: this.characters.map(c => ({
        id: c.id, name: c.name, look: c.look, x: Math.round(c.x), lane: Math.round(c.lane), scale: c.scaleX,
        worn: Object.fromEntries(Object.entries(c.worn).filter(([, it]) => it).map(([s, it]) => [s, it.key])),
      })),
    });
  },
};
