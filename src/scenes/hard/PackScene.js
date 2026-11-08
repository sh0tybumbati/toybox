// Your bag: a grid of slots (food and the batches you carry), and, at the supermarket's bag rack, a bigger bag to buy.
import { W } from '../../config.js';
import { CARD, COLORS, inkButton, inkPanel } from '../../ui.js';
import { PACKS, PACK_IDS } from '../../data/hard/food.js';
import { buyPack, carriedBy, slotsOf, tierOf, whyNotPack } from '../../systems/hard/pack.js';
import { itemIcon } from '../../systems/itemTextures.js';
import { backdrop, leave, text } from './overlay.js';

export default class PackScene extends Phaser.Scene {
  constructor() { super('Pack'); }

  init(data) { this.room = data.room; this.who = data.who; this.shop = Boolean(data.shop); this.dyn = []; }

  create() {
    backdrop(this, 780, 480, this.shop ? 'Bags' : 'Your bag', { seed: 57, onClose: () => this.close() });
    this.build();
  }

  close() { this.room.billsClosed(); leave(this); }

  build() {
    this.dyn.forEach(o => o.destroy());
    this.dyn = [];
    const keep = o => { this.dyn.push(o); return o; }, r = this.room, h = r.hard, c = this.who, slots = slotsOf(h.packs, c.id);
    keep(text(this, W / 2, 168, `${c.name} · ${PACKS[tierOf(h.packs, c.id)].label} · ${slots} slots`, 22, { fontStyle: 'bold' }).setOrigin(0.5));
    const batches = h.goods.filter(g => g.at === 'carry' && (g.by === c.id || g.by === undefined)), cells = [...c.bag.map(f => ({ food: f.k })), ...batches.map(g => ({ batch: g }))];
    const per = 8, gap = 78, x0 = W / 2 - (Math.min(slots, per) - 1) * gap / 2;
    for (let i = 0; i < slots; i++) {
      const x = x0 + (i % per) * gap, y = 232 + Math.floor(i / per) * gap, cell = cells[i];
      keep(inkPanel(this, x, y, 68, 68, { fill: cell ? CARD : 0xe9dcc0, radius: 14, shadow: false, weight: 2.6, seed: 300 + i, depth: 4, sheen: false }));
      if (cell && cell.food) keep(itemIcon(this, cell.food, x, y - 4, 42).setDepth(5));
      else if (cell) keep(text(this, x, y - 4, '📦', 32).setOrigin(0.5).setDepth(5));
      if (cell) keep(text(this, x, y + 24, cell.food || cell.batch.name.split(' ')[0].slice(0, 9), 11, { color: '#7a6a58' }).setOrigin(0.5).setDepth(5));
    }
    keep(text(this, W / 2, 232 + Math.ceil(slots / per) * gap - 20, `${cells.length} of ${slots} slots used${batches.length ? ` · ${batches.length} batch${batches.length > 1 ? 'es' : ''} of product on you` : ''}`, 17, { color: '#7a6a58' }).setOrigin(0.5));
    if (!this.shop) return;
    keep(text(this, W / 2, 396, `Cash: $${r.cash.toLocaleString('en-US')}`, 20, { color: '#7a6a58' }).setOrigin(0.5));
    PACK_IDS.filter(id => id !== 'pockets').forEach((id, i) => {
      const t = PACKS[id], x = W / 2 - 180 + i * 360, why = whyNotPack(h.packs, c.id, id, r.cash);
      keep(inkButton(this, x, 450, `🎒 ${t.label} · ${t.slots} slots · $${t.price.toLocaleString('en-US')}`, { w: 330, h: 46, size: 17, fill: why ? COLORS.grey : COLORS.green, depth: 6, seed: 320 + i, onTap: () => this.buy(id, why) }));
    });
  }

  buy(id, why) {
    const r = this.room, h = r.hard, c = this.who;
    if (why) { r.sfx.nope(); return; }
    const done = buyPack(h.packs, c.id, id, r.cash);
    if (!done) { r.sfx.nope(); return; }
    h.packs = done.packs; r.cash = done.cash; r.updateNav(); r.dirty = true; r.sfx.ding();
    this.build();
  }
}
