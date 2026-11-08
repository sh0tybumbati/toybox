// The Garden Centre: seed packets and garden gear. Everything here is legal; the dark seeds are sold elsewhere.
import { W } from '../../config.js';
import { CARD, COLORS, inkButton, inkPanel } from '../../ui.js';
import { CROPS, CROP_IDS, GEAR, GEAR_IDS } from '../../data/hard/plants.js';
import { give } from '../../systems/hard/garden.js';
import { backdrop, leave, text } from './overlay.js';

export default class NurseryScene extends Phaser.Scene {
  constructor() { super('Nursery'); }

  init(data) { this.room = data.room; this.dyn = []; }

  create() {
    backdrop(this, 700, 500, 'Garden Centre', { seed: 52, onClose: () => this.close() });
    this.build();
  }

  close() { this.room.billsClosed(); leave(this); }

  build() {
    this.dyn.forEach(o => o.destroy());
    this.dyn = [];
    const keep = o => { this.dyn.push(o); return o; }, r = this.room, h = r.hard;
    keep(text(this, W / 2, 168, `Cash: $${r.cash.toLocaleString('en-US')}   ·   Grows in your garden beds`, 19, { color: '#7a6a58' }).setOrigin(0.5));
    const rows = [...CROP_IDS.map(id => ({ id, pack: true, label: `${CROPS[id].icon} ${CROPS[id].label} seeds`, price: CROPS[id].seed, note: `${CROPS[id].days} days · ${CROPS[id].yield} crops`, have: h.seeds[id] || 0 })),
      ...GEAR_IDS.map(id => ({ id, label: `${GEAR[id].icon} ${GEAR[id].label}`, price: GEAR[id].price, note: GEAR[id].note, have: h.gear[id] || 0 }))];
    rows.forEach((o, i) => {
      const y = 214 + i * 50, ok = r.cash >= o.price;
      keep(inkPanel(this, W / 2, y, 600, 42, { fill: CARD, radius: 12, shadow: false, weight: 2.8, seed: 170 + i, depth: 4 }));
      keep(text(this, 200, y - 17, o.label, 20, { fontStyle: 'bold' }).setDepth(5));
      keep(text(this, 200, y + 3, `${o.note}${o.have ? `  ·  you have ${o.have}` : ''}`, 14, { color: '#7a6a58' }).setDepth(5));
      keep(text(this, 560, y - 12, `$${o.price}`, 21, { fontStyle: 'bold' }).setDepth(5));
      keep(inkButton(this, 720, y, 'Buy', { w: 90, h: 32, size: 18, fill: ok ? COLORS.green : COLORS.grey, depth: 6, seed: 180 + i, onTap: () => this.buy(o) }));
    });
  }

  buy(o) {
    const r = this.room, h = r.hard;
    if (r.cash < o.price) { r.sfx.nope(); return; }
    r.cash -= o.price;
    if (o.pack) h.seeds = give(h.seeds, o.id); else h.gear = give(h.gear, o.id);
    r.updateNav(); r.dirty = true; r.sfx.coin();
    this.build();
  }
}
