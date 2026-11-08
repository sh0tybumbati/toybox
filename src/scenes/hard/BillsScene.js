// The household's bills: what came in the mailbox, what is due, what is late. You can pay at the post office counter
// (and later on the computer or phone); at the mailbox you can only read them.
import { W, H } from '../../config.js';
import { CARD, COLORS, TEXT, inkButton, inkPanel } from '../../ui.js';
import { billLabel } from '../../data/hard/housing.js';
import { overdue, pay, totalDue } from '../../systems/hard/bills.js';
import { settle } from '../../systems/hard/credit.js';
import { dayName } from '../../systems/hard/clock.js';
import { backdrop, leave, text } from './overlay.js';

const CREDIT_KINDS = ['card', 'mortgage', 'debt'];
// Pay all (or the given) bills: rent and the like with whatever you pay with (cash or card), the bank's own bills with cash only. Returns whether anything was paid.
export function payBillsFrom(room, ids) {
  const h = room.hard, day = room.clock.day, isBank = b => CREDIT_KINDS.includes(b.kind);
  const a = pay(h.bills.filter(isBank), room.wallet, ids), rest = pay(h.bills.filter(b => !isBank(b)), room.cash, ids);
  if (!a.paid && !rest.paid) return false;
  room.wallet = a.cash; room.cash = rest.cash;
  h.bills = [...a.bills, ...rest.bills];
  settle(h, [...a.gone, ...rest.gone], day);
  room.updateNav(); room.dirty = true;
  return true;
}

// The bill rows, drawn into any scene (the mail, the post office counter, the computer, the phone). `ctx` = { room, canPay, keep, rebuild }.
export function renderBills(scene, { room, canPay, keep, rebuild, top = 214, totalY = 484 }) {
  const h = room.hard, day = room.clock.day, tier = h.home && h.home.tier;
  const bills = [...h.bills].sort((a, b) => a.due - b.due);
  keep(text(scene, W / 2, top - 46, h.home ? `Cash on you: $${room.cash.toLocaleString('en-US')}` : 'You have nowhere to live, so nothing comes in the post.', 20, { color: '#7a6a58' }).setOrigin(0.5));
  const payBills = ids => {
    if (!payBillsFrom(room, ids)) { room.sfx.nope(); return; }
    room.sfx.coin();
    rebuild();
  };
  bills.slice(0, 6).forEach((b, i) => {
    const y = top + i * 50, late = day > b.due;
    keep(inkPanel(scene, W / 2, y, 620, 42, { fill: late ? 0xfde0d8 : CARD, radius: 12, shadow: false, weight: 2.8, seed: 90 + i, depth: 4 }));
    keep(text(scene, 192, y - 12, `${billLabel(b.kind, tier)}`, 22, { fontStyle: 'bold' }).setDepth(5));
    keep(text(scene, 440, y - 11, `due ${dayName({ day: b.due })}${late ? ' · LATE' : ''}`, 19, { color: late ? '#b0584e' : '#7a6a58' }).setDepth(5));
    keep(text(scene, 560, y - 12, `$${b.amount.toLocaleString('en-US')}`, 22, { fontStyle: 'bold' }).setDepth(5));
    if (canPay) keep(inkButton(scene, 770, y, 'Pay', { w: 80, h: 34, size: 19, fill: (CREDIT_KINDS.includes(b.kind) ? room.wallet : room.cash) >= b.amount ? COLORS.green : COLORS.grey, depth: 6, seed: 100 + i, onTap: () => payBills([b.id]) }));
  });
  if (!bills.length) keep(text(scene, W / 2, top + 76, h.home ? 'No bills. Nothing owed.' : '', 24).setOrigin(0.5));
  const total = totalDue(bills), late = overdue(bills, day).length;
  keep(text(scene, 192, totalY, bills.length ? `Total $${total.toLocaleString('en-US')}${late ? ` · ${late} late` : ''}` : (h.debt ? `Debts: $${h.debt.toLocaleString('en-US')}` : ''), 22, { fontStyle: 'bold' }));
  if (canPay && bills.length) keep(inkButton(scene, 690, totalY + 8, 'Pay all', { w: 170, h: 44, size: 22, fill: COLORS.green, depth: 6, onTap: () => payBills() }));
  if (!canPay && bills.length) keep(text(scene, W / 2, totalY - 32, 'Pay at the post office counter, on a computer or on your phone.', 18, { color: '#7a6a58' }).setOrigin(0.5));
}

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

  // Pay all (or the given) bills.
  payBills(ids) {
    if (!payBillsFrom(this.room, ids)) { this.room.sfx.nope(); return; }
    this.room.sfx.coin();
    this.build();
  }

  build() {
    this.dyn.forEach(o => o.destroy());
    this.dyn = [];
    renderBills(this, { room: this.room, canPay: this.canPay, keep: o => { this.dyn.push(o); return o; }, rebuild: () => this.build() });
  }
}
