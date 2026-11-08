// The household's bills: what came in the mailbox, what is due, what is late. You can pay at the post office counter
// (and later on the computer or phone); at the mailbox you can only read them.
import { W, H } from '../../config.js';
import { CARD, COLORS, TEXT, inkButton, inkPanel } from '../../ui.js';
import { billLabel } from '../../data/hard/housing.js';
import { overdue, pay, totalDue } from '../../systems/hard/bills.js';
import { dayName } from '../../systems/hard/clock.js';
import { backdrop, leave, text } from './overlay.js';

export default class BillsScene extends Phaser.Scene {
  constructor() { super('Bills'); }

  init(data) { this.room = data.room; this.canPay = Boolean(data.canPay); this.dyn = []; }

  create() {
    backdrop(this, 700, 470, this.canPay ? 'Pay bills' : 'Your mail', { seed: 47, onClose: () => this.close() });
    this.room.hard.bills.forEach(b => { b.seen = true; });
    this.room.queueDirty = true;
    this.build();
  }

  close() { this.room.billsClosed(); leave(this); }

  build() {
    this.dyn.forEach(o => o.destroy());
    this.dyn = [];
    const keep = o => { this.dyn.push(o); return o; };
    const h = this.room.hard, day = this.room.clock.day, tier = h.home && h.home.tier;
    const bills = [...h.bills].sort((a, b) => a.due - b.due);
    keep(text(this, W / 2, 168, h.home ? `Cash on you: $${this.room.cash.toLocaleString('en-US')}` : 'You have nowhere to live, so nothing comes in the post.', 20, { color: '#7a6a58' }).setOrigin(0.5));
    bills.slice(0, 6).forEach((b, i) => {
      const y = 214 + i * 50, late = day > b.due;
      keep(inkPanel(this, W / 2, y, 620, 42, { fill: late ? 0xfde0d8 : CARD, radius: 12, shadow: false, weight: 2.8, seed: 90 + i, depth: 4 }));
      keep(text(this, 192, y - 12, `${billLabel(b.kind, tier)}`, 22, { fontStyle: 'bold' }).setDepth(5));
      keep(text(this, 440, y - 11, `due ${dayName({ day: b.due })}${late ? ' · LATE' : ''}`, 19, { color: late ? '#b0584e' : '#7a6a58' }).setDepth(5));
      keep(text(this, 560, y - 12, `$${b.amount.toLocaleString('en-US')}`, 22, { fontStyle: 'bold' }).setDepth(5));
      if (this.canPay) keep(inkButton(this, 770, y, 'Pay', { w: 80, h: 34, size: 19, fill: this.room.cash >= b.amount ? COLORS.green : COLORS.grey, depth: 6, seed: 100 + i, onTap: () => this.payBills([b.id]) }));
    });
    if (!bills.length) keep(text(this, W / 2, 290, h.home ? 'No bills. Nothing owed.' : '', 24).setOrigin(0.5));
    const total = totalDue(bills), late = overdue(bills, day).length;
    keep(text(this, 192, 484, bills.length ? `Total $${total.toLocaleString('en-US')}${late ? ` · ${late} late` : ''}` : (h.debt ? `Debts: $${h.debt.toLocaleString('en-US')}` : ''), 22, { fontStyle: 'bold' }));
    if (this.canPay && bills.length) keep(inkButton(this, 690, 492, 'Pay all', { w: 170, h: 44, size: 22, fill: COLORS.green, depth: 6, onTap: () => this.payBills() }));
    if (!this.canPay && bills.length) keep(text(this, W / 2, 452, 'Pay at the post office counter (09:00-17:00).', 18, { color: '#7a6a58' }).setOrigin(0.5));
  }

  payBills(ids) {
    const r = pay(this.room.hard.bills, this.room.cash, ids);
    if (!r.paid) { this.room.sfx.nope(); return; }
    this.room.hard.bills = r.bills; this.room.cash = r.cash;
    this.room.updateNav(); this.room.dirty = true; this.room.sfx.coin();
    this.build();
  }
}
