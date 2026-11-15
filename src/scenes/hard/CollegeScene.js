// The College: paid day classes (6 hours) that give a certificate for good (docs/careers-spec.md, 1.7).
import { W } from '../../config.js';
import { CARD, COLORS, inkButton, inkPanel } from '../../ui.js';
import { COURSES } from '../../data/hard/careers.js';
import { SHIFT_DRAIN } from '../../data/hard/gigs.js';
import { takeCourse, whyNotCourse } from '../../systems/hard/careers.js';
import { apply } from '../../systems/hard/needs.js';
import { backdrop, leave, text } from './overlay.js';

const IDS = Object.keys(COURSES);

export default class CollegeScene extends Phaser.Scene {
  constructor() { super('College'); }

  init(data) { this.room = data.room; this.who = data.who; this.dyn = []; }

  create() {
    backdrop(this, 760, 520, 'College', { seed: 53, onClose: () => this.close() });
    this.build();
  }

  close() { this.room.billsClosed(); leave(this); }

  build() {
    this.dyn.forEach(o => o.destroy());
    this.dyn = [];
    const keep = o => { this.dyn.push(o); return o; }, r = this.room, w = r.workOf(this.who);
    keep(text(this, W / 2, 168, `Cash: $${r.cash.toLocaleString('en-US')}   ·   A class is one day: it takes six hours and gives a certificate for good`, 17, { color: '#7a6a58' }).setOrigin(0.5));
    IDS.forEach((id, i) => {
      const c = COURSES[id], y = 202 + i * 34, why = whyNotCourse(w, id, r.cash), have = w.certs.includes(id);
      keep(inkPanel(this, W / 2, y, 700, 31, { fill: have ? 0xe3f2d0 : CARD, radius: 10, shadow: false, weight: 2.4, seed: 190 + i, depth: 4 }));
      keep(text(this, 140, y - 11, c.label, 18, { fontStyle: 'bold' }).setDepth(5));
      keep(text(this, 470, y - 10, have ? 'Certificate ✔' : `$${c.price.toLocaleString('en-US')}`, 18, { fontStyle: 'bold', color: have ? '#3f7f3f' : '#3a2a22' }).setDepth(5));
      if (!have) keep(inkButton(this, 770, y, 'Take class', { w: 120, h: 26, size: 15, fill: why ? COLORS.grey : COLORS.green, depth: 6, seed: 210 + i, onTap: () => this.take(id, why) }));
    });
  }

  take(id, why) {
    const r = this.room, who = this.who;
    if (why) { r.sfx.nope(); return; }
    r.cash -= COURSES[id].price;
    takeCourse(r.workOf(who), id);
    apply(who.needs, Object.fromEntries(Object.entries(SHIFT_DRAIN).map(([k, v]) => [k, v * COURSES[id].hours * 60 * 0.5])));          // sitting still is half as tiring as lifting
    r.updateNav(); r.dirty = true; r.sfx.coin();
    this.close();
    r.passTime(COURSES[id].hours * 60);
    r.notice(`🎓 Certificate: ${COURSES[id].label}`);
  }
}
