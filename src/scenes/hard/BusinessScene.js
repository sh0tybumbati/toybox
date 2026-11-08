// Your business: prices, staff, applicants, the till, and (from the desk at the premises) working a shift yourself.
import { W } from '../../config.js';
import { CARD, COLORS, inkButton, inkMeter, inkPanel } from '../../ui.js';
import { BIZ, MAX_STAFF } from '../../data/hard/business.js';
import { capacityOf, collect, fire, hire, historyOf, priceFactor, raise, repFactor, setMarkup } from '../../systems/hard/business.js';
import { shortMoney } from '../../systems/hard/property.js';
import { backdrop, leave, text } from './overlay.js';

const mood = h => (h >= 70 ? '😀' : h >= 40 ? '🙂' : h >= 15 ? '😟' : '😠');

export default class BusinessScene extends Phaser.Scene {
  constructor() { super('Business'); }

  init(data) { this.room = data.room; this.slot = data.slot; this.hub = data.hub || null; this.desk = Boolean(data.desk); this.dyn = []; }

  get b() { return this.room.city[this.slot]; }
  get z() { return this.b.biz; }

  create() {
    backdrop(this, 880, 540, this.b.name, { seed: 59, onClose: () => this.close() });
    this.gfx = this.add.graphics().setDepth(5);
    this.build();
  }

  close() {
    if (this.hub) { this.scene.stop(); this.scene.resume('Hub'); this.hub.drawLots(); this.hub.refreshCoins(); this.room.save(); return; }
    this.room.billsClosed(); leave(this);
  }

  build() {
    this.dyn.forEach(o => o.destroy());
    this.dyn = [];
    this.gfx.clear();
    const keep = o => { this.dyn.push(o); return o; }, r = this.room, z = this.z, def = BIZ[z.type], day = r.clock.day;
    const cap = capacityOf(z.staff, z.shift === day), money = shortMoney;
    keep(text(this, 80, 160, `${def.icon} ${def.label} · open since day ${z.open + 1} · ${def.blurb}`, 16, { color: '#7a6a58' }));
    // the figures
    keep(text(this, 80, 190, `In the till: ${money(z.till)}`, 22, { fontStyle: 'bold' }));
    keep(inkButton(this, 330, 202, 'Collect', { w: 110, h: 32, size: 16, fill: z.till > 0 ? COLORS.green : COLORS.grey, depth: 6, seed: 470, onTap: () => this.collect() }));
    keep(text(this, 430, 190, z.last ? `Yesterday: sold ${money(z.last.revenue)}, ${z.last.profit >= 0 ? 'made' : 'lost'} ${money(Math.abs(z.last.profit))} after wages` : 'No trading yet', 15, { color: '#7a6a58' }));
    keep(text(this, 80, 228, 'Reputation', 18, { fontStyle: 'bold' }));
    inkMeter(this.gfx, 200, 230, 180, 16, z.rep / 100, 0xf5c14a, 12);
    keep(text(this, 400, 228, `Running at ${Math.round(cap * 100)}% of full strength${z.shift === day ? ' (with your shift today)' : ''}`, 16, { color: '#7a6a58' }));
    // prices
    keep(text(this, 80, 266, 'Prices', 18, { fontStyle: 'bold' }));
    keep(inkButton(this, 215, 278, '−', { w: 38, h: 32, size: 20, fill: COLORS.grey, depth: 6, seed: 471, onTap: () => { setMarkup(z, -1); this.touch(); } }));
    keep(text(this, 300, 266, z.markup === 0 ? 'going rate' : `${z.markup > 0 ? '+' : ''}${z.markup}% on the going rate`, 18, { fontStyle: 'bold' }).setOrigin(0.5, 0));
    keep(inkButton(this, 400, 278, '+', { w: 38, h: 32, size: 20, fill: COLORS.grey, depth: 6, seed: 472, onTap: () => { setMarkup(z, 1); this.touch(); } }));
    keep(text(this, 440, 270, `sells ${Math.round(priceFactor(z.markup) * repFactor(z.rep) * 100)}% of the usual; dear prices wear reputation down`, 13, { color: '#7a6a58' }));
    // your own shift
    if (this.desk) keep(inkButton(this, 770, 202, z.shift === day ? 'Worked today' : '💼 Work a shift (8 hours)', { w: 270, h: 40, size: 17, fill: z.shift === day ? COLORS.grey : COLORS.orange, depth: 6, seed: 473, onTap: () => this.shift() }));
    else keep(text(this, 760, 262, 'Work a shift at the desk in the shop', 14, { color: '#7a6a58' }).setOrigin(0.5));
    // staff
    keep(text(this, 80, 312, `Staff (${z.staff.length}/${MAX_STAFF})`, 20, { fontStyle: 'bold' }));
    keep(inkButton(this, 770, 322, z.vacancy ? '📣 Hiring: tap to stop' : '📣 Advertise a job', { w: 270, h: 34, size: 16, fill: z.vacancy ? COLORS.orange : COLORS.green, depth: 6, seed: 474, onTap: () => { if (z.staff.length >= MAX_STAFF) { r.sfx.nope(); return; } z.vacancy = !z.vacancy; this.touch(); } }));
    z.staff.forEach((s, i) => {
      const y = 344 + i * 40;
      keep(inkPanel(this, W / 2, y + 14, 800, 34, { fill: CARD, radius: 10, shadow: false, weight: 2.4, seed: 480 + i, depth: 4, sheen: false }));
      keep(text(this, 100, y + 2, `${mood(s.happy)} ${s.name} · ${s.role} · skill ${s.skill}${s.sick ? ' · off sick today' : ''}`, 16, { fontStyle: 'bold' }).setDepth(5));
      keep(text(this, 560, y + 3, `${money(s.wage)} a week`, 16).setDepth(5));
      keep(inkButton(this, 690, y + 14, 'Raise 10%', { w: 100, h: 26, size: 13, fill: COLORS.blue, depth: 6, seed: 490 + i, onTap: () => { raise(z, i); this.touch(); } }));
      keep(inkButton(this, 790, y + 14, 'Let go', { w: 80, h: 26, size: 13, fill: COLORS.red, depth: 6, seed: 495 + i, onTap: () => { fire(z, i); this.touch(); } }));
    });
    const top = 344 + z.staff.length * 40 + 6;
    if (!z.staff.length && !z.candidates.length) keep(text(this, W / 2, top + 14, z.vacancy ? 'Nobody has applied yet.' : 'No staff. Alone, it only earns on days you work a shift.', 16, { color: '#7a6a58' }).setOrigin(0.5));
    z.candidates.slice(0, 3).forEach((c, i) => {
      const y = top + i * 40;
      keep(inkPanel(this, W / 2, y + 14, 800, 34, { fill: 0xe3f2d0, radius: 10, shadow: false, weight: 2.2, seed: 500 + i, depth: 4, sheen: false }));
      keep(text(this, 100, y + 2, `${c.name} · ${c.role} · ${historyOf(c)}`, 16, { fontStyle: 'bold' }).setDepth(5));
      keep(text(this, 560, y + 3, `asks ${money(c.wage)} a week`, 16).setDepth(5));
      keep(inkButton(this, 790, y + 14, 'Hire', { w: 110, h: 28, size: 15, fill: COLORS.green, depth: 6, seed: 510 + i, onTap: () => this.hire(i) }));
    });
  }

  touch() { this.room.dirty = true; this.build(); }

  collect() {
    const n = collect(this.z);
    if (n <= 0) { this.room.sfx.nope(); return; }
    this.room.wallet += n; this.room.updateNav(); this.room.sfx.coin();
    this.touch();
  }

  hire(i) {
    if (!hire(this.z, i, this.room.clock.day)) { this.room.sfx.nope(); return; }
    this.room.sfx.ding(); this.touch();
  }

  shift() {
    if (!this.room.workShift(this.slot)) { this.room.sfx.nope(); return; }
    this.build();
  }
}
