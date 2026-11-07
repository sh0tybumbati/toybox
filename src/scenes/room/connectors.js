// Room scene mixin — Elevators, stairs and ladders: tap one to pick another floor of the building.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { H, W } from '../../config.js';
import { defaultFurniture } from '../../data/rooms.js';
import { PROP_TYPES } from '../../data/props.js';
import { floatText } from '../../systems/interactions.js';
import { floorLabel, reachableFloors, sectionId, zoneKey } from '../../systems/world.js';
import { COLORS, inkButton, inkPanel, pin, richText } from '../../ui.js';

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
    const add = o => { pin(o).setDepth(9700); ui.push(o); return o; };
    add(this.add.rectangle(0, 0, W, H, 0x000000, 0.35).setOrigin(0).setInteractive().on('pointerdown', () => this.closeLiftPanel()));
    const rows = [...targets.map(id => z.building.floors.findIndex(f => f.id === id)), z.floorIndex].sort((a, b) => b - a);
    const h = 84 + rows.length * 58, top = H / 2 - h / 2;
    add(inkPanel(this, W / 2, H / 2, 310, h, { depth: 9700, seed: 4 })).setInteractive(new Phaser.Geom.Rectangle(W / 2 - 155, H / 2 - h / 2, 310, h), Phaser.Geom.Rectangle.Contains);
    add(richText(this, `${prop.def.name}: where to?`, { fontSize: '26px', fontStyle: 'bold' })).setPosition(W / 2, top + 34);
    rows.forEach((idx, i) => {
      const here = idx === z.floorIndex, y = top + 80 + i * 58;
      const btn = add(inkButton(this, W / 2, y, `${here ? '📍 ' : ''}${floorLabel(idx)}`, { w: 220, fill: here ? COLORS.grey : COLORS.green, size: 23, depth: 9700 }));
      if (!here) btn.on('pointerdown', () => this.rideTo(z.building.floors[idx].id, prop));
    });
  },

  closeLiftPanel() {
    (this.liftUI || []).forEach(o => o.destroy());
    this.liftUI = [];
  },
};
