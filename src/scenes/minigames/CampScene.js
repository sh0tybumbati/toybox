// Marshmallows at the campfire: hold to toast one over the flames, let go when it's golden. Three rounds. Hand-inked.
import { W, H } from '../../config.js';
import MiniGame from './MiniGame.js';
import { INK, blob, inkFill, inkLine, inkStroke, wobblyPoly, rectPoints } from '../../data/ink.js';
import { TEXT } from '../../ui.js';
import { COINS, ROUNDS, SAY, grade, reward, toastColor, toastLevel } from '../../systems/camp.js';

export default class CampScene extends MiniGame {
  constructor() { super('Camp'); }

  create() {
    this.frame();
    const g = this.add.graphics().setDepth(1);
    inkFill(g, wobblyPoly(rectPoints(66, 140, 828, 360), { amp: 1.6, seed: 4, step: 30 }), 0x2a2a55, { w: 3.6, seed: 4, heavy: 0 });                 // the night
    for (let i = 0; i < 26; i++) g.fillStyle(0xffe27a, 0.8).fillPoints(blob(90 + ((i * 131) % 780), 160 + ((i * 59) % 150), 2.4, 2.4, { n: 5, seed: i }), true);
    inkFill(g, wobblyPoly(rectPoints(66, 430, 828, 70), { amp: 1.4, seed: 5, step: 30 }), 0x4a7a46, { w: 3.4, seed: 5, heavy: 0 });                  // the grass
    inkFill(g, blob(480, 470, 110, 16, { n: 18, seed: 3 }), 0x1c1c3a, { w: 2, seed: 3, heavy: 0 });
    for (const [x, y, rot] of [[400, 474, 0.1], [560, 476, -0.1]]) inkFill(g, blob(x, y, 48, 11, { n: 14, rot, seed: x }), 0x8a5e3b, { w: 3.4, seed: x, heavy: 0 });   // logs
    this.fire = this.add.graphics().setDepth(2);
    this.stick = this.add.graphics().setDepth(4);
    this.round = 0; this.grades = []; this.hold = 0; this.holding = false; this.state = 'ready';
    this.say = this.add.text(W / 2, 112, '', { fontSize: '30px', fontStyle: 'bold', color: TEXT }).setOrigin(0.5).setDepth(10);
    this.tally = this.add.text(W / 2 + 60, 52, '', { fontSize: '24px', color: TEXT }).setDepth(10);
    this.input.on('pointerdown', () => this.press(true));
    this.input.on('pointerup', () => this.press(false));
    this.next();
  }

  next() {
    this.hold = 0; this.state = 'ready';
    this.say.setText(`Marshmallow ${this.round + 1} of ${ROUNDS}: hold to toast, let go when golden!`).setFontSize(26);
    this.tally.setText(this.grades.map(gr => (gr === 'perfect' ? '★' : gr === 'burnt' ? '✕' : '•')).join(' '));
  }

  press(down) {
    if (this.over || this.state === 'done') return;
    if (down && this.state === 'ready') { this.state = 'toast'; this.holding = true; this.room.sfx.sizzle(); return; }
    if (!down && this.state === 'toast') this.eat();
  }

  eat() {
    this.state = 'eaten';
    const gr = grade(toastLevel(this.hold));
    this.grades.push(gr);
    this.room.sfx[gr === 'perfect' ? 'fanfare' : gr === 'burnt' ? 'yuck' : 'crunch']();
    this.say.setText(SAY[gr]).setFontSize(34);
    this.tally.setText(this.grades.map(x => (x === 'perfect' ? '★' : x === 'burnt' ? '✕' : '•')).join(' '));
    this.round++;
    this.time.delayedCall(1300, () => {
      if (this.over) return;
      if (this.round >= ROUNDS) { this.state = 'done'; const r = reward(this.grades); this.results([`${this.grades.filter(x => x === 'perfect').length} perfect`, `+${r.coins} coins${r.items.length ? ' and a cocoa!' : ''}`], r); }
      else this.next();
    });
  }

  update(time, delta) {
    if (this.over) return;
    const dt = Math.min(delta / 1000, 1 / 20);
    if (this.state === 'toast') this.hold += dt;
    // the flames
    const f = this.fire.clear(), flick = Math.sin(time / 90) * 6;
    inkFill(f, wobblyPoly([{ x: 440, y: 470 }, { x: 460, y: 390 + flick }, { x: 480, y: 340 + flick * 1.5 }, { x: 502, y: 392 - flick }, { x: 522, y: 470 }], { amp: 2, seed: Math.floor(time / 120) % 5, step: 14 }), 0xf0902f, { w: 3.6, seed: 9, heavy: 0 });
    inkFill(f, wobblyPoly([{ x: 462, y: 470 }, { x: 476, y: 410 - flick }, { x: 490, y: 380 + flick }, { x: 504, y: 430 }, { x: 510, y: 470 }], { amp: 1.4, seed: 11, step: 12 }), 0xf7d24a, { w: 2.6, seed: 11, heavy: 0 });
    // the stick lowers into the fire while you hold
    const lvl = toastLevel(this.hold), down = this.state === 'toast' ? 1 : this.state === 'eaten' ? 0.4 : 0;
    const tip = { x: 330 + 120 * down + Math.sin(time / 140) * 2 * down, y: 300 + 110 * down };
    const s = this.stick.clear();
    inkLine(s, { x: 150, y: 460 }, tip, { w: 7, seed: 3, amp: 1.6, heavy: 0, color: 0x6b4a2a });
    inkFill(s, wobblyPoly([{ x: tip.x - 22, y: tip.y - 18 }, { x: tip.x + 22, y: tip.y - 18 }, { x: tip.x + 22, y: tip.y + 14 }, { x: tip.x - 22, y: tip.y + 14 }], { amp: 2, seed: 4, step: 10 }), toastColor(lvl), { w: 3.6, seed: 4, heavy: 1 });
    if (this.state === 'toast') {                                             // a little gauge so it isn't a guessing game
      const gx = 760, gy = 200;
      inkFill(s, wobblyPoly(rectPoints(gx, gy, 26, 200), { amp: 1, seed: 6, step: 20 }), 0xfffaf0, { w: 3, seed: 6, heavy: 0 });
      s.fillStyle(0xf7d24a, 0.9).fillRect(gx + 3, gy + 200 - 200 * 0.78, 20, 200 * (0.78 - 0.52));
      s.fillStyle(INK, 1).fillRect(gx - 6, gy + 200 - 200 * lvl - 2, 38, 5);
    }
  }
}
