// The mixing bench: pick how many harvested plants and up to two additives, see the product, mix it (takes time, draws a little heat).
import { W } from '../../config.js';
import { CARD, COLORS, inkButton, inkPanel } from '../../ui.js';
import { CROPS } from '../../data/hard/plants.js';
import { ADDITIVES, ADDITIVE_IDS, GOODS_CAP, MAX_ADDITIVES, MAX_BATCH, MIX_MINUTES } from '../../data/hard/lab.js';
import { batchValue, mix, spend, unitValue } from '../../systems/hard/lab.js';
import { addHeat } from '../../systems/hard/alley.js';
import { backdrop, leave, text } from './overlay.js';

export const MIX_HEAT = 3;

export default class LabScene extends Phaser.Scene {
  constructor() { super('Lab'); }

  init(data) { this.room = data.room; this.dyn = []; this.picked = []; this.count = 1; this.crop = null; }

  create() {
    backdrop(this, 700, 500, 'Mixing bench', { seed: 54, onClose: () => this.close() });
    this.build();
  }

  close() { this.room.billsClosed(); leave(this); }

  build() {
    this.dyn.forEach(o => o.destroy());
    this.dyn = [];
    const keep = o => { this.dyn.push(o); return o; }, r = this.room, h = r.hard;
    const crops = Object.keys(h.raw).filter(id => h.raw[id] > 0);
    if (!this.crop || !crops.includes(this.crop)) this.crop = crops[0] || null;
    if (!this.crop) { keep(text(this, W / 2, 300, 'Nothing to mix. Grow something first.', 22).setOrigin(0.5)); return; }
    this.count = Math.max(1, Math.min(this.count, MAX_BATCH, h.raw[this.crop]));
    keep(text(this, W / 2, 168, `${CROPS[this.crop].icon} ${CROPS[this.crop].label}: ${h.raw[this.crop]} in the stash`, 20, { color: '#7a6a58' }).setOrigin(0.5));
    keep(text(this, 220, 206, 'Plants in the batch', 20, { fontStyle: 'bold' }));
    keep(inkButton(this, 520, 214, '−', { w: 44, h: 36, size: 24, fill: COLORS.grey, depth: 6, seed: 200, onTap: () => { this.count--; this.build(); } }));
    keep(text(this, 570, 214, String(this.count), 26, { fontStyle: 'bold' }).setOrigin(0.5));
    keep(inkButton(this, 620, 214, '+', { w: 44, h: 36, size: 24, fill: COLORS.grey, depth: 6, seed: 201, onTap: () => { this.count++; this.build(); } }));
    keep(text(this, 220, 248, `Additives (up to ${MAX_ADDITIVES})`, 20, { fontStyle: 'bold' }));
    ADDITIVE_IDS.forEach((a, i) => {
      const y = 288 + i * 44, have = h.adds[a] || 0, on = this.picked.includes(a);
      keep(inkPanel(this, W / 2, y, 580, 38, { fill: on ? 0xe8f4d8 : CARD, radius: 10, shadow: false, weight: 2.6, seed: 210 + i, depth: 4 }));
      keep(text(this, 205, y - 15, `${ADDITIVES[a].icon} ${ADDITIVES[a].label}  ×${have}`, 18, { fontStyle: 'bold' }).setDepth(5));
      keep(text(this, 205, y + 2, ADDITIVES[a].note, 13, { color: '#7a6a58' }).setDepth(5));
      keep(inkButton(this, 720, y, on ? 'Remove' : 'Add', { w: 90, h: 28, size: 16, fill: have > 0 || on ? COLORS.green : COLORS.grey, depth: 6, seed: 220 + i, onTap: () => this.toggle(a) }));
    });
    const p = mix(this.crop, this.count, this.picked);
    keep(inkPanel(this, W / 2, 454, 580, 70, { fill: 0xfff4d6, radius: 12, shadow: false, weight: 2.8, seed: 230, depth: 4 }));
    keep(text(this, 205, 426, p ? `${p.name} · ${p.units} units` : '', 22, { fontStyle: 'bold' }).setDepth(5));
    keep(text(this, 205, 452, p ? `Potency ${p.potency} · Purity ${p.purity}%${p.effects.length ? ' · calming' : ''}   ≈ $${unitValue(p).toLocaleString('en-US')} each, $${batchValue(p).toLocaleString('en-US')} the batch` : '', 15, { color: '#7a6a58' }).setDepth(5));
    const full = h.goods.length >= GOODS_CAP;
    keep(inkButton(this, 700, 454, full ? 'Stash full' : `Mix (${MIX_MINUTES} min)`, { w: 150, h: 44, size: 19, fill: full ? COLORS.grey : COLORS.green, depth: 6, seed: 240, onTap: () => this.doMix() }));
  }

  toggle(a) {
    const i = this.picked.indexOf(a);
    if (i >= 0) this.picked.splice(i, 1);
    else if ((this.room.hard.adds[a] || 0) > 0 && this.picked.length < MAX_ADDITIVES) this.picked.push(a);
    else { this.room.sfx.nope(); return; }
    this.build();
  }

  doMix() {
    const r = this.room, h = r.hard, p = mix(this.crop, this.count, this.picked);
    const left = p && spend(h.raw, h.adds, this.crop, this.count, this.picked);
    if (!left || h.goods.length >= GOODS_CAP) { r.sfx.nope(); return; }
    h.raw = left.raw; h.adds = left.adds;
    h.goods = [...h.goods, p];
    h.heat = addHeat(h.heat, MIX_HEAT);
    this.picked = [];
    r.passTime(MIX_MINUTES); r.dirty = true; r.sfx.ding(); r.updateNav();
    this.build();
  }
}
