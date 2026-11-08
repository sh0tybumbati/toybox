// The bank: swap kid-mode coins and cash (1 coin = 100 cash, either way), your credit rating and cards, and your loans and old debts.
import { W } from '../../config.js';
import { CARD, COLORS, inkButton, inkPanel } from '../../ui.js';
import { exchange } from '../../systems/mode.js';
import { saveStore } from '../../systems/save.js';
import { CARDS, CARD_IDS, CREDIT_TIERS, FORECLOSE_AFTER } from '../../data/hard/credit.js';
import { availableOn, limitOf, openCard, payCard, payDebt, payOff, tierOf, whyNotCard } from '../../systems/hard/credit.js';
import { backdrop, leave, text } from './overlay.js';

const money = n => `$${Math.round(n).toLocaleString('en-US')}`;
const PAGES = [['swap', '🪙 Coins'], ['credit', '💳 Credit'], ['loans', '🏠 Loans']];

export default class BankScene extends Phaser.Scene {
  constructor() { super('Bank'); }

  init(data) { this.room = data.room; this.kid = null; this.page = data.page || 'swap'; this.dyn = []; }

  async create() {
    backdrop(this, 800, 500, 'Bank', { seed: 46, onClose: () => this.close() });
    PAGES.forEach(([id, label], i) => { this.tabs = this.tabs || {}; this.tabs[id] = inkButton(this, W / 2 - 200 + i * 200, 176, label, { w: 180, h: 38, size: 19, fill: COLORS.grey, depth: 6, seed: 330 + i, onTap: () => { this.page = id; this.build(); } }); });
    this.kid = await saveStore.load();                         // the kid world's coins live in its own save
    this.build();
  }

  close() { this.room.billsClosed(); leave(this); }

  build() {
    this.dyn.forEach(o => o.destroy());
    this.dyn = [];
    Object.entries(this.tabs).forEach(([id, t]) => t.setFill(id === this.page ? COLORS.gold : COLORS.grey));
    const keep = o => { this.dyn.push(o); return o; }, r = this.room;
    keep(text(this, W / 2, 218, `Cash on you: ${money(r.wallet)}`, 22, { fontStyle: 'bold' }).setOrigin(0.5));
    this.note = keep(text(this, W / 2, 528, '', 19, { color: '#b0584e' }).setOrigin(0.5));
    this[this.page](keep);
  }

  // --- coins <-> cash --------------------------------------------------------------------------
  swap(keep) {
    const r = this.room;
    keep(text(this, W / 2, 258, '1 coin = 100 cash, both ways', 19, { color: '#7a6a58' }).setOrigin(0.5));
    keep(text(this, W / 2, 296, this.kid ? `Kid-mode coins: ${this.kid.coins}` : 'No kid world saved yet', 26).setOrigin(0.5));
    [1, 5, 20].forEach((n, i) => {
      keep(inkButton(this, W / 2 - 170 + i * 170, 366, `+${n} 🪙 → cash`, { w: 150, h: 46, size: 18, fill: COLORS.green, depth: 5, seed: 60 + i, onTap: () => this.exchange('toCash', n) }));
      keep(inkButton(this, W / 2 - 170 + i * 170, 424, `cash → ${n} 🪙`, { w: 150, h: 46, size: 18, fill: COLORS.gold, depth: 5, seed: 70 + i, onTap: () => this.exchange('toCoins', n) }));
    });
  }

  async exchange(direction, n) {
    if (!this.kid) { this.note.setText('There is no kid world to swap with yet.'); return; }
    const r = exchange({ coins: this.kid.coins, cash: this.room.wallet }, direction, n);
    if (!r) { this.room.sfx.nope(); this.note.setText(direction === 'toCash' ? 'Not enough coins.' : 'Not enough cash.'); return; }
    this.kid.coins = r.coins;
    this.room.wallet = r.cash;
    await saveStore.save(this.kid);
    this.room.updateNav(); this.room.dirty = true; this.room.sfx.coin();
    this.build();
  }

  // --- the credit rating and cards -------------------------------------------------------------
  credit(keep) {
    const r = this.room, h = r.hard, cr = h.credit, t = tierOf(cr.score);
    keep(text(this, W / 2, 256, `Credit score ${cr.score} · ${t.label}`, 28, { fontStyle: 'bold' }).setOrigin(0.5));
    keep(text(this, W / 2, 284, `Loans cost ${(t.rate * 100).toFixed(2)}% a month for you. Pay on time and keep card use low to climb.`, 15, { color: '#7a6a58' }).setOrigin(0.5));
    CARD_IDS.forEach((id, i) => {
      const c = CARDS[id], y = 318 + i * 42, have = cr.cards.findIndex(x => x.tier === id), card = have >= 0 ? cr.cards[have] : null, why = whyNotCard(cr, id);
      keep(inkPanel(this, W / 2, y, 700, 38, { fill: have >= 0 ? 0xe3f2d0 : CARD, radius: 12, shadow: false, weight: 2.6, seed: 340 + i, depth: 4, sheen: false }));
      keep(text(this, 150, y - 15, c.label, 18, { fontStyle: 'bold' }).setDepth(5));
      keep(text(this, 150, y + 3, `limit ${money(c.limit)} · ${(c.rate * 100).toFixed(1)}% a month`, 13, { color: '#7a6a58' }).setDepth(5));
      if (card) {
        keep(text(this, 400, y - 10, `owe ${money(card.balance)}`, 17, { fontStyle: 'bold' }).setDepth(5));
        keep(inkButton(this, 560, y, 'Pay', { w: 70, h: 30, size: 16, fill: card.balance > 0 && r.wallet > 0 ? COLORS.green : COLORS.grey, depth: 6, seed: 350 + i, onTap: () => this.payCardOff(have) }));
        keep(inkButton(this, 650, y, cr.active === have && cr.pay === 'card' ? 'In use' : 'Use', { w: 80, h: 30, size: 16, fill: cr.active === have && cr.pay === 'card' ? COLORS.orange : COLORS.blue, depth: 6, seed: 360 + i, onTap: () => { cr.active = have; cr.pay = 'card'; r.updateNav(); r.dirty = true; this.build(); } }));
      } else keep(inkButton(this, 640, y, why ? why.replace('needs a score of', 'score') : 'Apply', { w: 150, h: 30, size: 15, fill: why ? COLORS.grey : COLORS.green, depth: 6, seed: 350 + i, onTap: () => this.apply(id, why) }));
    });
    if (cr.cards.length) keep(inkButton(this, W / 2, 494, cr.pay === 'card' ? '💵 Pay with cash again' : '💳 Pay with the card', { w: 300, h: 34, size: 17, fill: COLORS.gold, depth: 6, seed: 370, onTap: () => { r.togglePay(); this.build(); } }));
  }

  apply(id, why) {
    if (why) { this.room.sfx.nope(); this.note.setText(`Not approved: ${why}.`); return; }
    openCard(this.room.hard.credit, id);
    this.room.sfx.ding(); this.room.dirty = true; this.room.updateNav();
    this.build();
  }

  payCardOff(i) {
    const r = this.room, cr = r.hard.credit, x = payCard(cr, i, cr.cards[i].balance, r.wallet);
    if (!x) { r.sfx.nope(); return; }
    r.wallet = x.cash; r.updateNav(); r.dirty = true; r.sfx.coin();
    this.build();
  }

  // --- loans and old debt ----------------------------------------------------------------------
  loans(keep) {
    const r = this.room, h = r.hard, t = tierOf(h.credit.score);
    let y = 262;
    keep(text(this, 140, y, h.debt ? `Old debts: ${money(h.debt)} (${(t.rate * 100).toFixed(2)}% a month)` : 'No old debts', 20, { fontStyle: 'bold' }));
    if (h.debt) [1000, 10000, 'all'].forEach((n, i) => keep(inkButton(this, 520 + i * 100, y + 10, n === 'all' ? 'All' : `Pay ${money(n)}`, { w: 92, h: 30, size: 14, fill: r.wallet > 0 ? COLORS.green : COLORS.grey, depth: 6, seed: 380 + i, onTap: () => this.payDown(n) })));
    y += 56;
    if (!h.loans.length) keep(text(this, W / 2, y + 50, 'No mortgages. Buy a house on the map and ask for one.', 18, { color: '#7a6a58' }).setOrigin(0.5));
    h.loans.forEach((l, i) => {
      const b = r.city[l.slot], yy = y + i * 70;
      keep(inkPanel(this, W / 2, yy + 22, 700, 60, { fill: CARD, radius: 12, shadow: false, weight: 2.6, seed: 390 + i, depth: 4, sheen: false }));
      keep(text(this, 150, yy + 2, `${b ? b.name : 'House'} · owe ${money(l.balance)}`, 19, { fontStyle: 'bold' }).setDepth(5));
      keep(text(this, 150, yy + 26, `${money(l.payment)} a month · ${l.left} left · ${l.missed ? `${l.missed} missed of ${FORECLOSE_AFTER}` : 'on track'}`, 14, { color: l.missed ? '#b0584e' : '#7a6a58' }).setDepth(5));
      keep(inkButton(this, 600, yy + 22, `Pay off ${money(l.balance)}`, { w: 190, h: 34, size: 16, fill: r.wallet >= l.balance ? COLORS.green : COLORS.grey, depth: 6, seed: 400 + i, onTap: () => this.payOffLoan(l) }));
    });
  }

  payDown(n) {
    const r = this.room, h = r.hard, x = payDebt(h.debt, r.wallet, n === 'all' ? h.debt : n);
    if (!x) { r.sfx.nope(); return; }
    h.debt = x.debt; r.wallet = x.cash; r.updateNav(); r.dirty = true; r.sfx.coin();
    this.build();
  }

  payOffLoan(l) {
    const r = this.room, x = payOff(r.hard, l, r.wallet);
    if (!x) { r.sfx.nope(); this.note.setText('Not enough cash to pay it off.'); return; }
    r.wallet = x.cash; r.updateNav(); r.dirty = true; r.sfx.fanfare();
    this.build();
  }
}
