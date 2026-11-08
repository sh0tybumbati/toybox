// A garden bed: plant a seed from the household's packets, water it, harvest it when it is ready.
import { W } from '../../config.js';
import { COLORS, inkButton } from '../../ui.js';
import { CROPS, CROP_IDS, PLOTS } from '../../data/hard/plants.js';
import { newBed, stage, take, water, WATER_FULL } from '../../systems/hard/garden.js';
import { backdrop, leave, text } from './overlay.js';

export default class BedScene extends Phaser.Scene {
  constructor() { super('Bed'); }

  init(data) { this.room = data.room; this.key = data.key; this.type = data.type || 'gardenbed'; this.who = data.who; this.dyn = []; }

  create() {
    backdrop(this, 600, 440, 'Garden bed', { seed: 53, onClose: () => this.close() });
    this.build();
  }

  close() { this.room.billsClosed(); this.room.refreshBeds(); leave(this); }

  build() {
    this.dyn.forEach(o => o.destroy());
    this.dyn = [];
    const keep = o => { this.dyn.push(o); return o; }, h = this.room.hard, bed = h.beds[this.key], st = stage(bed);
    const say = (y, str, size = 22, extra = {}) => keep(text(this, W / 2, y, str, size, extra).setOrigin(0.5));
    if (st === 'empty') {
      const owned = CROP_IDS.filter(id => h.seeds[id] > 0);
      say(178, owned.length ? 'Plant what?' : 'No seeds. The Garden Centre sells them.', 22, { color: '#7a6a58' });
      owned.forEach((id, i) => {
        keep(inkButton(this, W / 2, 226 + i * 50, `${CROPS[id].icon} ${CROPS[id].label}  ×${h.seeds[id]}`, { w: 280, h: 40, size: 20, fill: COLORS.green, depth: 6, seed: 190 + i, onTap: () => this.plant(id) }));
      });
      if (owned.length && h.gear.fert) say(226 + owned.length * 50 + 6, `Fertiliser in hand: ${h.gear.fert} (used when you plant)`, 16, { color: '#7a6a58' });
    } else {
      const c = CROPS[bed.crop];
      say(190, `${c.icon} ${c.label}${bed.fert ? ' · fertilised' : ''}`, 28, { fontStyle: 'bold' });
      if (st === 'ready') {
        say(240, 'Ready to pick!', 24);
        keep(inkButton(this, W / 2, 310, 'Harvest', { w: 220, h: 48, size: 24, fill: COLORS.green, depth: 6, onTap: () => this.harvest() }));
      } else if (st === 'dead') {
        say(240, 'It dried out and withered.', 22, { color: '#b0584e' });
        keep(inkButton(this, W / 2, 310, 'Clear the bed', { w: 220, h: 48, size: 22, fill: COLORS.grey, depth: 6, onTap: () => { delete h.beds[this.key]; this.finish(); } }));
      } else {
        say(240, `Day ${bed.grown} of ${c.days}`, 22);
        if (bed.lit === false) say(306, CROPS[bed.crop].dark && bed.out ? '🚫 It will not grow outdoors: it needs a lamp indoors' : '💡 Dark in here: it needs a grow lamp in the room', 17, { color: '#b0584e' });
        say(274, `Soil ${bed.water >= 60 ? '💧 damp' : bed.water > 0 ? '🏜️ drying' : '🏜️ bone dry'}`, 20, { color: '#7a6a58' });
        keep(inkButton(this, W / 2, 336, 'Water', { w: 220, h: 48, size: 24, fill: bed.water >= WATER_FULL ? COLORS.grey : COLORS.green, depth: 6, onTap: () => { h.beds[this.key] = water(bed); this.finish(); } }));
      }
    }
  }

  plant(id) {
    const h = this.room.hard, left = take(h.seeds, id);
    if (!left) { this.room.sfx.nope(); return; }
    h.seeds = left;
    const bed = newBed(id, PLOTS[this.type].mult), fert = take(h.gear, 'fert');
    if (fert) { h.gear = fert; bed.fert = true; }
    h.beds[this.key] = bed;
    this.finish();
  }

  harvest() {
    const r = this.room, c = this.who || r.selected || r.characters[0];
    r.harvestBed(this.key, c);
    this.finish();
  }

  finish() { this.room.dirty = true; this.room.sfx.pop(); this.room.refreshBeds(); this.build(); }
}
