// The phone, the computer and the newspaper: bills, bank balance, the classified ads and the clock.
// phone = all tabs, computer = bills + jobs, paper = jobs only.
import { W, H } from '../../config.js';
import { CARD, COLORS, TEXT, inkButton, inkPanel } from '../../ui.js';
import { listings } from '../../systems/hard/jobs.js';
import { label, timeLabel } from '../../systems/hard/clock.js';
import { dayInSeason, weatherLabel } from '../../systems/hard/weather.js';
import { backdrop, leave, text } from './overlay.js';
import { renderBills } from './BillsScene.js';

const TABS = { phone: [['bills', '💵 Bills'], ['jobs', '📰 Jobs'], ['bank', '🏦 Bank'], ['clock', '⏰ Time']], computer: [['bills', '💵 Bills'], ['jobs', '📰 Jobs']], paper: [['jobs', '📰 Jobs']] };
const TITLES = { phone: 'Phone', computer: 'Computer', paper: "Today's paper" };

export default class DeviceScene extends Phaser.Scene {
  constructor() { super('Device'); }

  init(data) { this.room = data.room; this.kind = data.kind; this.tab = TABS[data.kind][0][0]; this.dyn = []; }

  create() {
    backdrop(this, 740, 500, TITLES[this.kind], { seed: 48, onClose: () => this.close() });
    this.build();
  }

  close() { this.room.billsClosed(); leave(this); }

  build() {
    this.dyn.forEach(o => o.destroy());
    this.dyn = [];
    const keep = o => { this.dyn.push(o); return o; };
    const tabs = TABS[this.kind];
    if (tabs.length > 1) tabs.forEach(([id, name], i) => keep(inkButton(this, 200 + i * 150, 150, name, { w: 140, h: 38, size: 18, fill: this.tab === id ? COLORS.gold : CARD, depth: 6, seed: 120 + i, onTap: () => { this.tab = id; this.build(); } })));
    const r = this.room, c = r.clock;
    if (this.tab === 'bills') {
      r.hard.bills.forEach(b => { b.seen = true; });
      r.queueDirty = true;
      renderBills(this, { room: r, canPay: true, keep, rebuild: () => this.build(), top: 250, totalY: 500 });
    } else if (this.tab === 'jobs') {
      keep(text(this, W / 2, 188, 'Work wanted today — go and ask, or turn up at the time', 18, { color: '#7a6a58' }).setOrigin(0.5));
      listings(c.day).forEach((j, i) => {
        const y = 240 + i * 66;
        keep(inkPanel(this, W / 2, y, 660, 58, { fill: CARD, radius: 12, shadow: false, weight: 2.8, seed: 140 + i, depth: 4 }));
        keep(text(this, 170, y - 22, j.title, 22, { fontStyle: 'bold' }).setDepth(5));
        keep(text(this, 170, y + 2, `${j.where} · ${j.hours} · ${j.shift}`, 16).setDepth(5));
        keep(text(this, 630, y - 22, `$${j.pay.toLocaleString('en-US')}`, 24, { fontStyle: 'bold', color: '#3f7f3f' }).setDepth(5));
        keep(text(this, 520, y + 2, j.needs, 14, { color: '#7a6a58', wordWrap: { width: 230 } }).setDepth(5));
      });
    } else if (this.tab === 'bank') {
      const h = r.hard;
      keep(text(this, W / 2, 230, `Cash: $${r.cash.toLocaleString('en-US')}`, 36, { fontStyle: 'bold' }).setOrigin(0.5));
      keep(text(this, W / 2, 284, h.debt ? `Debts: $${h.debt.toLocaleString('en-US')}` : 'No debts', 24, { color: h.debt ? '#b0584e' : '#3f7f3f' }).setOrigin(0.5));
      keep(text(this, W / 2, 330, h.home ? `Home: ${h.home.tier} (next bills on day ${h.home.next + 1})` : 'No home', 20, { color: '#7a6a58' }).setOrigin(0.5));
      keep(text(this, W / 2, 380, 'Swap coins and cash at the bank button.', 18, { color: '#7a6a58' }).setOrigin(0.5));
    } else {
      const w = r.weatherNow();
      keep(text(this, W / 2, 240, timeLabel(c), 72, { fontStyle: 'bold' }).setOrigin(0.5));
      keep(text(this, W / 2, 320, `${label(c).split(' ')[0]} · ${w.season} · day ${dayInSeason(c.day)} of 28`, 26).setOrigin(0.5));
      keep(text(this, W / 2, 366, weatherLabel(w), 32).setOrigin(0.5));
    }
  }
}
