// The back alley contact: cheap things, no questions. What you buy here draws attention (heat).
import { W } from '../../config.js';
import { CARD, COLORS, TEXT, inkButton, inkPanel } from '../../ui.js';
import { addHeat, offers, supplies } from '../../systems/hard/alley.js';
import { BAG_CAP } from '../../data/hard/food.js';
import { give } from '../../systems/hard/garden.js';
import { addFood } from '../../systems/hard/pantry.js';
import { backdrop, leave, text } from './overlay.js';

export default class DealScene extends Phaser.Scene {
  constructor() { super('Deal'); }

  init(data) { this.room = data.room; this.who = data.who; this.dyn = []; this.page = 'goods'; }

  create() {
    backdrop(this, 640, 440, 'The contact', { seed: 49, onClose: () => this.close() });
    const h = this.room.hard, day = this.room.clock.day;
    if (!h.deals || h.deals.day !== day) h.deals = { day, counts: {} };                    // stock is for the day
    this.build();
  }

  close() { this.room.billsClosed(); leave(this); }

  build() {
    this.dyn.forEach(o => o.destroy());
    this.dyn = [];
    const keep = o => { this.dyn.push(o); return o; };
    const r = this.room, h = r.hard;
    keep(text(this, W / 2, 168, '"Keep your voice down. Cash only."', 20, { color: '#7a6a58', fontStyle: 'italic' }).setOrigin(0.5));
    keep(text(this, W / 2, 196, `Cash: $${r.cash.toLocaleString('en-US')}${h.heat ? `   ·   🚨 Heat ${h.heat}` : ''}`, 20).setOrigin(0.5));
    ['goods', 'supplies'].forEach((p, i) => keep(inkButton(this, W / 2 - 110 + i * 220, 232, p === 'goods' ? 'Goods' : 'Dark supplies', { w: 200, h: 34, size: 18, fill: this.page === p ? COLORS.gold : COLORS.grey, depth: 6, seed: 140 + i, onTap: () => { this.page = p; this.build(); } })));
    (this.page === 'goods' ? offers(r.clock.day) : supplies()).forEach((o, i) => {
      const y = 290 + i * (this.page === 'goods' ? 58 : 46), left = o.stock != null ? o.stock - (h.deals.counts[o.id] || 0) : null, soldOut = left === 0, own = o.id === 'burner' && h.phone;       // (y is set above)
      keep(inkPanel(this, W / 2, y, 560, 50, { fill: CARD, radius: 12, shadow: false, weight: 2.8, seed: 150 + i, depth: 4 }));
      keep(text(this, 214, y - 20, o.label, 22, { fontStyle: 'bold' }).setDepth(5));
      keep(text(this, 214, y + 4, `${o.note}${left != null ? `  (${left} left)` : ''}`, 15, { color: '#7a6a58' }).setDepth(5));
      keep(text(this, 560, y - 12, `$${o.price.toLocaleString('en-US')}`, 22, { fontStyle: 'bold' }).setDepth(5));
      const ok = r.cash >= o.price && !soldOut && !own;
      keep(inkButton(this, 700, y, soldOut ? 'Gone' : own ? 'Have one' : 'Buy', { w: 96, h: 36, size: 18, fill: ok ? COLORS.green : COLORS.grey, depth: 6, seed: 160 + i, onTap: () => this.buy(o) }));
    });
  }

  buy(o) {
    const r = this.room, h = r.hard, c = this.who || r.selected || r.characters[0];
    const left = o.stock != null ? o.stock - (h.deals.counts[o.id] || 0) : null;
    if (r.cash < o.price || left === 0 || (o.id === 'burner' && h.phone)) { r.sfx.nope(); return; }
    if (o.seed) h.seeds = give(h.seeds, o.seed);
    else if (o.additive) h.adds = give(h.adds, o.additive);
    else if (o.gear) h.gear = give(h.gear, o.gear);
    else if (o.food) {
      const bag = addFood(c.bag, o.food, r.totalMinutes(), BAG_CAP);
      if (!bag) { r.sfx.nope(); this.note('Your bag is full.'); return; }
      c.bag = bag;
    } else h.phone = true;
    r.cash -= o.price; h.heat = addHeat(h.heat, o.heat);
    h.deals.counts[o.id] = (h.deals.counts[o.id] || 0) + 1;
    r.updateNav(); r.dirty = true; r.queueDirty = true; r.sfx.coin();
    this.build();
  }

  note(msg) { const t = text(this, W / 2, 470, msg, 20, { color: '#b0584e' }).setOrigin(0.5).setDepth(8); this.tweens.add({ targets: t, alpha: 0, delay: 1200, duration: 400, onComplete: () => t.destroy() }); }
}
