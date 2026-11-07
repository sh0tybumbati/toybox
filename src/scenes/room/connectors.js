// Room scene mixin — Elevators, stairs and ladders: tap one to pick another floor of the building.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { H, W } from '../../config.js';
import { defaultFurniture } from '../../data/rooms.js';
import { PROP_TYPES } from '../../data/props.js';
import { floatText } from '../../systems/interactions.js';
import { floorLabel, reachableFloors, sectionId, zoneKey } from '../../systems/world.js';
import { touchable } from '../../ui.js';

const WORD = { elevator: 'elevator', stairs: 'stairs', ladder: 'ladder' };

export const connectorMethods = {
  // Which connector kinds a floor of this building has (the floor we're on is read live).
  connectorKinds(floor) {
    const z = this.zone, kinds = new Set();
    const types = floor.id === z.floorId
      ? this.props.map(p => p.type)
      : floor.rooms.flatMap(r => (this.propState[sectionId(z.slot, r.id)] || defaultFurniture(r.type, r.w, r.extra)).map(p => p.type));
    for (const t of types) if (PROP_TYPES[t] && PROP_TYPES[t].connector) kinds.add(PROP_TYPES[t].connector);
    return kinds;
  },

  // Pointer pressed on an elevator / staircase / ladder.
  useConnector(prop) {
    if (this.switching) return;
    const kind = prop.def.connector, z = this.zone;
    const targets = reachableFloors(z.building, z.floorId, kind, f => this.connectorKinds(f));
    if (!targets.length) {
      this.sfx.nope();
      floatText(this, prop.x, prop.y - prop.def.h / 2 - 10,
        z.floorCount > 1 ? `This ${WORD[kind]} doesn't connect yet — build one on another floor!` : `This building only has one floor.`, 22);
      return;
    }
    this.sfx.click();
    if (targets.length === 1) { this.rideTo(targets[0], prop); return; }
    this.showLiftPanel(prop, targets);
  },

  rideTo(floorId, prop) {
    this.closeLiftPanel();
    prop.setState(true);
    this.sfx.creak();
    this.goToZone(zoneKey(this.zone.slot, floorId), { arrive: 'connector', connector: { kind: prop.def.connector, x: prop.x } });
  },

  // A little panel of floor buttons, fixed to the screen. Tap outside it to close.
  showLiftPanel(prop, targets) {
    this.closeLiftPanel();
    const z = this.zone, ui = (this.liftUI = []);
    const add = o => { o.setScrollFactor(0).setDepth(9700); ui.push(o); return o; };
    add(this.add.rectangle(0, 0, W, H, 0x000000, 0.35).setOrigin(0).setInteractive().on('pointerdown', () => this.closeLiftPanel()));
    const rows = [...targets.map(id => z.building.floors.findIndex(f => f.id === id)), z.floorIndex].sort((a, b) => b - a);
    const h = 70 + rows.length * 54, top = H / 2 - h / 2;
    add(this.add.rectangle(W / 2, H / 2, 280, h, 0xfff4e0).setStrokeStyle(5, 0xe3c9a0).setInteractive());
    add(this.add.text(W / 2, top + 28, `${prop.def.name}: where to?`, { fontSize: '22px', color: '#4a3426', fontStyle: 'bold' }).setOrigin(0.5));
    rows.forEach((idx, i) => {
      const here = idx === z.floorIndex, y = top + 66 + i * 54;
      const btn = add(this.add.text(W / 2, y, `${here ? '📍 ' : ''}${floorLabel(idx)}`, {
        fontSize: '22px', color: here ? '#8a7a68' : '#ffffff', backgroundColor: here ? '#ede2cf' : '#3b8f5a', padding: { x: 28, y: 8 },
      }).setOrigin(0.5));
      if (!here) touchable(btn, 6).on('pointerdown', () => this.rideTo(z.building.floors[idx].id, prop));
    });
  },

  closeLiftPanel() {
    (this.liftUI || []).forEach(o => o.destroy());
    this.liftUI = [];
  },
};
