// A house you let out: the rent, the deposit and who you will take; the applicants; your tenant, their repairs, and notice.
import { W } from '../../config.js';
import { CARD, COLORS, inkButton, inkPanel } from '../../ui.js';
import { NOTICE_DAYS } from '../../data/hard/landlord.js';
import { accept, cycleDeposit, cycleMinTier, payRepair, serveNotice, setRent, tierFor } from '../../systems/hard/landlord.js';
import { shortMoney } from '../../systems/hard/property.js';
import { backdrop, text } from './overlay.js';

const MIN_LABEL = { any: 'anyone', fair: 'fair credit or better', good: 'good credit or better' };
const mood = h => (h >= 70 ? '😀 happy' : h >= 40 ? '🙂 fine' : h >= 15 ? '😟 unhappy' : '😠 about to leave');

export default class LandlordScene extends Phaser.Scene {
  constructor() { super('Landlord'); }

  init(data) { this.room = data.room; this.slot = data.slot; this.hub = data.hub; this.dyn = []; }

  get b() { return this.room.city[this.slot]; }
  get l() { return this.b.let; }

  create() {
    backdrop(this, 860, 520, this.b.name, { seed: 58, onClose: () => this.close() });
    this.build();
  }

  close() {
    this.scene.stop();
    this.scene.resume('Hub');
    this.hub.drawLots();
    this.hub.refreshCoins();
    this.room.save();
  }

  build() {
    this.dyn.forEach(o => o.destroy());
    this.dyn = [];
    const keep = o => { this.dyn.push(o); return o; }, r = this.room, l = this.l, day = r.clock.day;
    keep(text(this, W / 2, 168, `Cash on you: ${shortMoney(r.wallet)}   ·   market rent here about ${shortMoney(l.market)} a month`, 17, { color: '#7a6a58' }).setOrigin(0.5));
    // the terms
    const y0 = 212;
    keep(text(this, 100, y0 - 12, 'Rent', 20, { fontStyle: 'bold' }));
    keep(inkButton(this, 215, y0, '−', { w: 40, h: 34, size: 22, fill: COLORS.grey, depth: 6, seed: 410, onTap: () => { setRent(l, -2); this.touch(); } }));
    keep(text(this, 320, y0 - 13, `${shortMoney(l.rent)} a month`, 20, { fontStyle: 'bold' }).setOrigin(0.5, 0));
    keep(inkButton(this, 430, y0, '+', { w: 40, h: 34, size: 22, fill: COLORS.grey, depth: 6, seed: 411, onTap: () => { setRent(l, 2); this.touch(); } }));
    keep(inkButton(this, 590, y0, l.deposit ? 'Deposit: 1 month' : 'No deposit', { w: 180, h: 34, size: 16, fill: l.deposit ? COLORS.green : COLORS.grey, depth: 6, seed: 412, onTap: () => { cycleDeposit(l); this.touch(); } }));
    keep(inkButton(this, 790, y0, `Tenants: ${MIN_LABEL[l.minTier]}`, { w: 230, h: 34, size: 16, fill: l.minTier === 'any' ? COLORS.grey : COLORS.blue, depth: 6, seed: 413, onTap: () => { cycleMinTier(l); this.touch(); } }));
    if (!l.tenant) this.vacant(keep, day); else this.let(keep, day);
  }

  touch() { this.room.dirty = true; this.build(); }

  vacant(keep, day) {
    const l = this.l, r = this.room, y = 262;
    keep(inkButton(this, W / 2, y, l.listed ? '📣 Listed: tap to take it off the market' : '📣 List it to let', { w: 440, h: 40, size: 19, fill: l.listed ? COLORS.orange : COLORS.green, depth: 6, seed: 414, onTap: () => { l.listed = !l.listed; this.touch(); } }));
    this.repairs(keep, y + 52);
    const top = y + 52 + Math.min(l.repairs.length, 2) * 38 + 14;
    if (!l.applicants.length) { keep(text(this, W / 2, top + 30, l.listed ? 'Nobody has applied yet. A lower rent brings people sooner.' : 'Not on the market.', 18, { color: '#7a6a58' }).setOrigin(0.5)); return; }
    l.applicants.slice(0, 4).forEach((a, i) => {
      const yy = top + i * 48, t = tierFor(a.score);
      keep(inkPanel(this, W / 2, yy + 16, 780, 42, { fill: CARD, radius: 12, shadow: false, weight: 2.6, seed: 420 + i, depth: 4, sheen: false }));
      keep(text(this, 120, yy, `${a.name} · ${a.job}`, 19, { fontStyle: 'bold' }).setDepth(5));
      keep(text(this, 120, yy + 20, `earns ${shortMoney(a.income)} a month · credit ${t.label} (${a.score}) · answer by day ${a.day + 8}`, 13, { color: '#7a6a58' }).setDepth(5));
      keep(inkButton(this, 770, yy + 16, 'Accept', { w: 110, h: 32, size: 17, fill: COLORS.green, depth: 6, seed: 430 + i, onTap: () => this.accept(i) }));
    });
  }

  accept(i) {
    const r = this.room, done = accept(this.l, i, r.clock.day);
    if (!done) { r.sfx.nope(); return; }
    r.wallet += done.deposit; r.updateNav(); r.sfx.fanfare();
    this.touch();
  }

  let(keep, day) {
    const l = this.l, t = l.tenant, y = 256;
    keep(inkPanel(this, W / 2, y + 36, 780, 84, { fill: CARD, radius: 14, shadow: false, weight: 2.8, seed: 440, depth: 4, sheen: false }));
    keep(text(this, 120, y + 4, `${t.name} · ${t.job}, earns ${shortMoney(t.income)} a month`, 20, { fontStyle: 'bold' }).setDepth(5));
    keep(text(this, 120, y + 30, `${mood(t.happy)} · moved in day ${t.since + 1} · next rent day ${t.next + 1}`, 15, { color: '#7a6a58' }).setDepth(5));
    keep(text(this, 120, y + 52, t.owed ? `Owes ${shortMoney(t.owed)} (${t.late} month${t.late > 1 ? 's' : ''} behind)` : t.notice !== null ? `Leaving on day ${t.notice + 1}` : 'Paid up', 16, { color: t.owed ? '#b0584e' : '#4a8a3a', fontStyle: 'bold' }).setDepth(5));
    keep(inkButton(this, 770, y + 38, t.notice !== null ? 'Notice given' : `Give notice (${NOTICE_DAYS} days)`, { w: 200, h: 36, size: 15, fill: t.notice !== null ? COLORS.grey : COLORS.red, depth: 6, seed: 441, onTap: () => { if (serveNotice(l, day)) { this.room.sfx.click(); this.touch(); } } }));
    this.repairs(keep, y + 100);
    if (!l.repairs.length) keep(text(this, W / 2, y + 138, 'No repairs asked for. Tenants stay longer when you fix things quickly.', 16, { color: '#7a6a58' }).setOrigin(0.5));
  }

  repairs(keep, y) {
    const l = this.l, r = this.room, day = r.clock.day;
    l.repairs.slice(0, 4).forEach((q, i) => {
      const yy = y + i * 38, ok = r.wallet >= q.cost, waited = q.day >= 0 ? day - q.day : 0;
      keep(inkPanel(this, W / 2, yy + 14, 780, 34, { fill: waited > 7 ? 0xfde0d8 : 0xfff3d6, radius: 10, shadow: false, weight: 2.2, seed: 450 + i, depth: 4, sheen: false }));
      keep(text(this, 120, yy + 3, `🔧 ${q.what}${waited > 0 ? ` · asked ${waited} day${waited > 1 ? 's' : ''} ago` : ''}`, 16, { fontStyle: 'bold' }).setDepth(5));
      keep(inkButton(this, 770, yy + 14, `Fix it · ${shortMoney(q.cost)}`, { w: 170, h: 28, size: 15, fill: ok ? COLORS.green : COLORS.grey, depth: 6, seed: 460 + i, onTap: () => this.fix(q.id) }));
    });
  }

  fix(id) {
    const r = this.room, x = payRepair(this.l, id, r.wallet);
    if (!x) { r.sfx.nope(); return; }
    r.wallet = x.cash; r.updateNav(); r.sfx.coin();
    this.touch();
  }
}
