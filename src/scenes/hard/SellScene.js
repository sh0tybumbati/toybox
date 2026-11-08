// The corner: the people who turned up tonight, what they want and what they would pay for the product you pick.
import { W } from '../../config.js';
import { CARD, COLORS, inkButton, inkPanel } from '../../ui.js';
import { CUSTOMERS } from '../../data/hard/customers.js';
import { SELL_HEAT } from '../../data/hard/customers.js';
import { STAGE_NOTE, atCorner, collect, creditLimit, offer, sell, stageOf, stillWants } from '../../systems/hard/customers.js';
import { addHeat } from '../../systems/hard/alley.js';
import { backdrop, leave, text } from './overlay.js';

export default class SellScene extends Phaser.Scene {
  constructor() { super('Sell'); }

  init(data) { this.room = data.room; this.who = data.who; this.dyn = []; this.batch = 0; }

  create() {
    backdrop(this, 800, 500, 'The corner', { seed: 55, onClose: () => this.close() });
    this.build();
  }

  close() { this.room.billsClosed(); leave(this); }

  build() {
    this.dyn.forEach(o => o.destroy());
    this.dyn = [];
    const keep = o => { this.dyn.push(o); return o; }, r = this.room, h = r.hard, day = r.clock.day;
    const here = atCorner(h.custs, day, h.phone);
    this.batch = Math.min(this.batch, Math.max(0, h.goods.length - 1));
    const p = h.goods[this.batch];
    keep(text(this, W / 2, 166, `Cash: $${r.cash.toLocaleString('en-US')}${h.heat ? `   ·   🚨 Heat ${h.heat}` : ''}`, 19, { color: '#7a6a58' }).setOrigin(0.5));
    if (p) {
      keep(inkButton(this, 250, 200, `◀`, { w: 40, h: 30, size: 16, fill: COLORS.grey, depth: 6, seed: 270, onTap: () => { this.batch = (this.batch + h.goods.length - 1) % h.goods.length; this.build(); } }));
      keep(inkButton(this, 710, 200, `▶`, { w: 40, h: 30, size: 16, fill: COLORS.grey, depth: 6, seed: 271, onTap: () => { this.batch = (this.batch + 1) % h.goods.length; this.build(); } }));
      keep(text(this, W / 2, 200, `${p.name} · ${p.units} units · potency ${p.potency} · purity ${p.purity}%${p.effects.length ? ' · calming' : ''}`, 17, { fontStyle: 'bold' }).setOrigin(0.5));
    } else keep(text(this, W / 2, 200, 'You have nothing to sell.', 18, { color: '#b0584e' }).setOrigin(0.5));
    if (!here.length) keep(text(this, W / 2, 330, 'Nobody is waiting tonight.', 22, { color: '#7a6a58' }).setOrigin(0.5));
    here.forEach((id, i) => {
      const cu = CUSTOMERS[id], st = h.custs[id], y = 252 + i * 62, want = stillWants(id, st, day), o = p ? offer(id, st, p) : null, stage = stageOf(st.hook);
      keep(inkPanel(this, W / 2, y, 720, 54, { fill: CARD, radius: 12, shadow: false, weight: 2.8, seed: 280 + i, depth: 4 }));
      keep(text(this, 120, y - 22, `${cu.name}  ·  wants ${want}`, 19, { fontStyle: 'bold' }).setDepth(5));
      keep(text(this, 120, y + 1, `${cu.blurb.split('.')[0]}.  ${stage === 'fine' ? '' : STAGE_NOTE[stage]}${st.owes ? `  Owes $${st.owes}.` : ''}`, 13, { color: '#7a6a58', wordWrap: { width: 400 } }).setDepth(5));
      if (o) keep(text(this, 560, y - 20, o.ok ? `$${o.price}/unit` : o.why, o.ok ? 18 : 12, { fontStyle: 'bold', color: o.ok ? '#3f7f3f' : '#b0584e', wordWrap: { width: 130 } }).setDepth(5));
      if (st.owes > 0) keep(inkButton(this, 690, y - 12, `Collect $${Math.min(st.owes, cu.wallet)}`, { w: 130, h: 24, size: 13, fill: COLORS.gold, depth: 6, seed: 290 + i, onTap: () => this.collect(id) }));
      const ok = p && o && o.ok && want > 0;
      keep(inkButton(this, 650, y + 12, 'Sell', { w: 60, h: 24, size: 14, fill: ok ? COLORS.green : COLORS.grey, depth: 6, seed: 300 + i, onTap: () => this.sell(id, false) }));
      const credit = ok && st.hook >= 40 && st.owes < creditLimit(id);
      keep(inkButton(this, 720, y + 12, 'On credit', { w: 80, h: 24, size: 13, fill: credit ? COLORS.orange : COLORS.grey, depth: 6, seed: 310 + i, onTap: () => this.sell(id, true) }));
    });
  }

  sell(id, credit) {
    const r = this.room, h = r.hard, p = h.goods[this.batch], st = h.custs[id];
    if (!p) { r.sfx.nope(); return; }
    const out = sell(id, st, p, p.units, r.clock.day, credit);
    if (!out.sold) { r.sfx.nope(); return; }
    h.custs[id] = out.st;
    h.goods = out.sold >= p.units ? h.goods.filter((_, i) => i !== this.batch) : h.goods.map((g, i) => (i === this.batch ? { ...g, units: g.units - out.sold } : g));
    r.cash += out.cash; h.heat = addHeat(h.heat, SELL_HEAT);
    r.passTime(5); r.updateNav(); r.dirty = true; r.sfx.coin();
    this.build();
  }

  collect(id) {
    const r = this.room, h = r.hard, out = collect(id, h.custs[id]);
    if (!out.cash) { r.sfx.nope(); return; }
    h.custs[id] = out.st; r.cash += out.cash; r.updateNav(); r.dirty = true; r.sfx.coin();
    this.build();
  }
}
