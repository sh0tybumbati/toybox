// The phone, the computer and the newspaper: bills, bank balance, the classified ads and the clock.
// phone = all tabs, computer = bills + jobs, paper = jobs only.
import { W, H } from '../../config.js';
import { CARD, COLORS, TEXT, inkButton, inkPanel } from '../../ui.js';
import { listings } from '../../systems/hard/careers.js';
import { COURSES, EMPLOYER_NAMES } from '../../data/hard/careers.js';
import { missingForNext, nextShift, promotionOffered, rungOf, skillOf, activeStrikes } from '../../systems/hard/careers.js';
import { inkMeter } from '../../ui.js';
import { label, timeLabel } from '../../systems/hard/clock.js';
import { dayInSeason, weatherLabel } from '../../systems/hard/weather.js';
import { texters, stillWants } from '../../systems/hard/customers.js';
import { CUSTOMERS } from '../../data/hard/customers.js';
import { backdrop, leave, text } from './overlay.js';
import { renderBills } from './BillsScene.js';

const TABS = { phone: [['bills', '💵 Bills'], ['jobs', '📰 Jobs'], ['job', '💼 My job'], ['bank', '🏦 Bank'], ['orders', '📩 Texts'], ['clock', '⏰ Time']], computer: [['bills', '💵 Bills'], ['jobs', '📰 Jobs']], paper: [['jobs', '📰 Jobs']] };
const TITLES = { phone: 'Phone', computer: 'Computer', paper: "Today's paper" };

const CAREER_NEXT = j => Boolean(rungOf(j.career, j.rung + 1));

export default class DeviceScene extends Phaser.Scene {
  constructor() { super('Device'); }

  init(data) { this.room = data.room; this.kind = data.kind; this.tab = TABS[data.kind][0][0]; this.dyn = []; this.slipRows = null; }

  create() {
    backdrop(this, 740, 500, TITLES[this.kind], { seed: 48, onClose: () => this.close() });
    this.build();
  }

  close() { this.room.billsClosed(); leave(this); }

  build() {
    this.dyn.forEach(o => o.destroy());
    this.dyn = [];
    const keep = o => { this.dyn.push(o); return o; };
    const tabs = TABS[this.kind].filter(([id]) => id !== 'orders' || this.room.subs()), pitch = Math.min(150, 700 / tabs.length);
    if (tabs.length > 1) tabs.forEach(([id, name], i) => keep(inkButton(this, 480 + (i - (tabs.length - 1) / 2) * pitch, 150, name, { w: pitch - 8, h: 38, size: tabs.length > 5 ? 16 : 18, fill: this.tab === id ? COLORS.gold : CARD, depth: 6, seed: 120 + i, onTap: () => { this.tab = id; this.build(); } })));
    const r = this.room, c = r.clock;
    if (this.tab === 'bills') {
      r.hard.bills.forEach(b => { b.seen = true; });
      r.queueDirty = true;
      renderBills(this, { room: r, canPay: true, keep, rebuild: () => this.build(), top: 250, totalY: 500 });
    } else if (this.tab === 'jobs') {
      const who = r.selected || r.characters[0], w = r.workOf(who);
      keep(text(this, W / 2, 188, w.job ? `You work as ${rungOf(w.job.career, w.job.rung).title}. Quit to apply elsewhere.` : `Jobs for ${who.name}: tap Apply, you hear straight away`, 18, { color: '#7a6a58' }).setOrigin(0.5));
      listings(w, c.day, { record: r.hard.record }).forEach((j, i) => {
        const y = 236 + i * 62, can = !j.why && !w.job;
        keep(inkPanel(this, W / 2, y, 680, 56, { fill: can ? CARD : 0xe9dfd0, radius: 12, shadow: false, weight: 2.8, seed: 140 + i, depth: 4 }));
        keep(text(this, 150, y - 22, j.title, 21, { fontStyle: 'bold', color: can ? '#3a2a22' : '#8a7a68' }).setDepth(5));
        keep(text(this, 150, y + 2, `${EMPLOYER_NAMES[j.employer]} · ${j.rota.days.length} days from ${j.rota.start} · ${j.rota.hours} h`, 15, { color: '#7a6a58' }).setDepth(5));
        keep(text(this, 520, y - 22, `$${j.pay.toLocaleString('en-US')}/shift`, 20, { fontStyle: 'bold', color: '#3f7f3f' }).setDepth(5));
        keep(text(this, 440, y + 2, j.why || (w.job ? 'You have a job' : ''), 14, { color: '#b0584e' }).setDepth(5));
        keep(inkButton(this, 820, y, 'Apply', { w: 90, h: 34, size: 18, fill: can ? COLORS.green : COLORS.grey, depth: 6, seed: 150 + i, onTap: () => { const res = r.applyForJob(who, j); if (res.ok) { r.sfx.ding(); this.tab = 'job'; } else { r.sfx.nope(); this.msg = res.why; } this.build(); } }));
      });
      if (this.msg) keep(text(this, W / 2, 500, this.msg, 18, { color: '#b0584e' }).setOrigin(0.5));
    } else if (this.tab === 'job') {
      this.msg = '';
      const who = r.selected || r.characters[0], w = r.workOf(who), total = r.totalMinutes();
      if (!w.job) {
        keep(text(this, W / 2, 240, `${who.name} has no job`, 30, { fontStyle: 'bold' }).setOrigin(0.5));
        keep(text(this, W / 2, 290, 'Look under Jobs, or ask at the labour board for a day of work.', 18, { color: '#7a6a58' }).setOrigin(0.5));
      } else {
        const j = w.job, rg = rungOf(j.career, j.rung), next = nextShift(w, total), skill = skillOf(w, j.career), strikes = activeStrikes(w, c.day).length;
        keep(text(this, W / 2, 214, rg.title, 30, { fontStyle: 'bold' }).setOrigin(0.5));
        keep(text(this, W / 2, 248, `${EMPLOYER_NAMES[j.employer]} · $${rg.pay.toLocaleString('en-US')} a shift · paid weekly${w.owed ? ` · owed so far $${w.owed.toLocaleString('en-US')}` : ''}`, 17, { color: '#7a6a58' }).setOrigin(0.5));
        keep(text(this, W / 2, 282, next ? `Next shift: ${label({ day: next.day, minute: next.start % 1440 })} at ${EMPLOYER_NAMES[j.employer]}` : 'No more shifts on the rota', 22).setOrigin(0.5));
        keep(text(this, 190, 322, `Skill ${skill}/100`, 18, { fontStyle: 'bold' }));
        const g = keep(this.add.graphics().setDepth(5)); inkMeter(g, 330, 332, 260, 16, skill / 100, 0x78c363, 9, 0);
        keep(text(this, 640, 322, `Strikes ${strikes}/3`, 18, { fontStyle: 'bold', color: strikes ? '#b0584e' : '#3a2a22' }));
        const miss = missingForNext(w);
        keep(text(this, W / 2, 372, !CAREER_NEXT(j) ? 'You are at the top of the ladder.' : miss.length ? `For ${rungOf(j.career, j.rung + 1).title}: ${miss.join(' · ')}` : `${rungOf(j.career, j.rung + 1).title} is on offer!`, 17, { color: miss.length ? '#7a6a58' : '#3f7f3f', wordWrap: { width: 640 }, align: 'center' }).setOrigin(0.5));
        if (promotionOffered(w)) keep(inkButton(this, W / 2 - 100, 430, 'Accept promotion', { w: 190, h: 42, size: 19, fill: COLORS.green, depth: 6, seed: 160, onTap: () => { r.acceptPromotion(who); r.sfx.ding(); this.build(); } }));
        keep(inkButton(this, W / 2 + (promotionOffered(w) ? 120 : 0), 430, this.sure ? 'Really quit?' : 'Quit the job', { w: 170, h: 42, size: 19, fill: this.sure ? COLORS.red : CARD, depth: 6, seed: 161, onTap: () => { if (this.sure) { r.quitJob(who); this.sure = false; } else this.sure = true; this.build(); } }));
        const certs = w.certs.map(id => COURSES[id].label);
        keep(text(this, W / 2, 484, certs.length ? `Certificates: ${certs.join(', ')}` : 'No certificates yet: courses are at the College', 15, { color: '#7a6a58', wordWrap: { width: 640 }, align: 'center' }).setOrigin(0.5));
      }
    } else if (this.tab === 'orders') {
      const who = texters(r.hard.custs, c.day);
      keep(text(this, W / 2, 188, who.length ? 'People who want something tonight — meet at the corner after dark' : 'No texts today. People text once they know you.', 18, { color: '#7a6a58' }).setOrigin(0.5));
      who.forEach((id, i) => {
        const cu = CUSTOMERS[id], st = r.hard.custs[id], y = 240 + i * 62;
        keep(inkPanel(this, W / 2, y, 660, 54, { fill: CARD, radius: 12, shadow: false, weight: 2.8, seed: 240 + i, depth: 4 }));
        keep(text(this, 170, y - 21, `${cu.name}  ·  wants ${stillWants(id, st, c.day)}`, 20, { fontStyle: 'bold' }).setDepth(5));
        keep(text(this, 170, y + 2, `Likes ${cu.likes === 'cheap' ? 'it cheap' : cu.likes}${cu.minPurity ? `, ${cu.minPurity}%+ pure` : ''}${st.owes ? ` · owes $${st.owes}` : ''}`, 15, { color: '#7a6a58' }).setDepth(5));
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
