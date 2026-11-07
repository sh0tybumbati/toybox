// Begging: people walk along the pavement; ask the ones who look at you. Hand-inked, side-on.
import { W } from '../../config.js';
import MiniGame from './MiniGame.js';
import { COLORS, TEXT, hitZone } from '../../ui.js';
import { INK, blob, inkFill, wobblyPoly, rectPoints } from '../../data/ink.js';
import { DURATION, PATIENCE, ask, newGame, over, step } from '../../systems/hard/begging.js';

const SHIRTS = [0xe5685c, 0x6aaee8, 0x7bd88f, 0xf5c14a, 0xb59ae0, 0xf08060];
const ROAD_Y = 420;

export default class BegScene extends MiniGame {
  constructor() { super('Beg'); }

  create() {
    this.frame();
    this.g = newGame(this.room.characters.find(c => c.current && c.current.waiting)?.needs || this.room.selected?.needs || {});
    const bg = this.add.graphics().setDepth(1);
    inkFill(bg, wobblyPoly(rectPoints(60, ROAD_Y, 840, 70), { amp: 2, seed: 4, step: 30 }), 0xcfc7b8, { w: 3.2, seed: 4, heavy: 0 });           // the pavement
    inkFill(bg, wobblyPoly(rectPoints(60, 150, 840, 270), { amp: 2, seed: 9, step: 30 }), 0xdfe9f0, { w: 3.2, seed: 9, heavy: 0 });              // a wall behind
    this.actors = new Map();
    this.score = this.add.text(W / 2, 110, '', { fontSize: '26px', color: TEXT }).setOrigin(0.5).setDepth(5);
    this.hint = this.add.text(W / 2, 132, 'Tap people when they look at you', { fontSize: '20px', color: '#7a6a58' }).setOrigin(0.5).setDepth(5);
    this.me = this.add.graphics().setDepth(3);                                                                                                // you, sitting at the side
    inkFill(this.me, blob(120, 470, 30, 22, { n: 14, seed: 3 }), 0x6a7a8c, { w: 3, seed: 3, heavy: 0 });
    inkFill(this.me, blob(120, 438, 17, 17, { n: 14, seed: 4 }), 0xffd9a8, { w: 3, seed: 4, heavy: 0 });
    this.finished = false;
  }

  update(time, delta) {
    if (this.finished) return;
    const dt = Math.min(delta / 1000, 0.05);
    step(this.g, dt);
    const seen = new Set();
    for (const p of this.g.passers) {
      seen.add(p.id);
      let a = this.actors.get(p.id);
      if (!a) a = this.makeActor(p);
      a.c.setPosition(60 + p.x * 840, ROAD_Y + 8 + Math.sin((this.g.t + p.id) * 8) * 2);
      a.mark.setVisible(p.looking && !p.asked);
      a.c.setAlpha(p.asked ? 0.7 : 1);
    }
    for (const [id, a] of this.actors) if (!seen.has(id)) { a.c.destroy(); a.zone.destroy(); this.actors.delete(id); }
    this.score.setText(`$ ${this.g.earned}     ${'♥'.repeat(Math.max(0, this.g.patience))}${'♡'.repeat(PATIENCE - Math.max(0, this.g.patience))}     ${Math.max(0, Math.ceil(DURATION - this.g.t))}s`);
    if (over(this.g)) this.end();
  }

  makeActor(p) {
    const body = this.add.graphics(), shirt = SHIRTS[p.id % SHIRTS.length];
    inkFill(body, blob(0, -34, 16, 22, { n: 14, seed: p.id }), shirt, { w: 3, seed: p.id, heavy: 0 });
    inkFill(body, blob(0, -66, 14, 14, { n: 14, seed: p.id + 3 }), 0xffd9a8, { w: 3, seed: p.id + 3, heavy: 0 });
    inkFill(body, blob(-6, -10, 6, 10, { n: 8, seed: p.id + 6 }), 0x3b5b8c, { w: 2.4, seed: p.id + 6, heavy: 0 });
    inkFill(body, blob(6, -10, 6, 10, { n: 8, seed: p.id + 7 }), 0x3b5b8c, { w: 2.4, seed: p.id + 7, heavy: 0 });
    const mark = this.add.text(0, -102, '❗', { fontSize: '26px' }).setOrigin(0.5).setVisible(false);
    const c = this.add.container(0, 0, [body, mark]).setDepth(4);
    const zone = hitZone(this, 0, 0, 70, 120, () => this.tap(p), 6);
    this.events.on('update', () => { if (zone.active && c.active) zone.setPosition(c.x, c.y - 50); });
    const a = { c, mark, zone };
    this.actors.set(p.id, a);
    return a;
  }

  tap(p) {
    if (this.finished) return;
    const r = ask(this.g, p.id);
    const a = this.actors.get(p.id);
    const say = (t, col) => { const x = a ? a.c.x : 400; const f = this.add.text(x, ROAD_Y - 130, t, { fontSize: '24px', color: col, fontStyle: 'bold' }).setOrigin(0.5).setDepth(8); this.tweens.add({ targets: f, y: f.y - 30, alpha: 0, duration: 900, onComplete: () => f.destroy() }); };
    if (r.result === 'coin') { this.room.sfx.coin(); say(`+$${r.amount}`, '#3f7f3f'); }
    else if (r.result === 'no') { this.room.sfx.nope(); say('"Sorry."', '#7a6a58'); }
    else if (r.result === 'annoyed') { this.room.sfx.nope(); say('😠', '#b0584e'); }
  }

  end() {
    this.finished = true;
    this.results([`You collected $${this.g.earned}`, `${this.g.given} of ${this.g.asked} asked said yes`, 'That took an hour'], { cash: this.g.earned, minutes: 60 });
  }
}
