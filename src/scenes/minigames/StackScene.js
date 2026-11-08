// Crate stacking (day-labour work): a crate swings side to side; tap to drop it on the pile. Hand-inked.
import { W } from '../../config.js';
import MiniGame from './MiniGame.js';
import { TEXT } from '../../ui.js';
import { INK, inkFill, wobblyPoly, rectPoints } from '../../data/ink.js';
import { WIDTH, drop, newGame, performance, step } from '../../systems/hard/stacker.js';

const CRATE_H = 34, FLOOR_Y = 478, MAX_CRATES = 14;
const COLORS = { crates: [0xc99466, 0xb5835a, 0xd9aa72], parcels: [0xe3c291, 0xd9b27a, 0xf0d6a8], bags: [0x8a9aa8, 0x7a8a98, 0x9aa8b6], turf: [0x69b653, 0x5aa545, 0x7cc464] };

export default class StackScene extends MiniGame {
  constructor() { super('Stack'); }

  heading() { return this.title || 'Stack the crates'; }

  init(data) { super.init(data); this.theme = data.crate || 'crates'; this.title = data.title; }

  create() {
    this.frame();
    this.g = newGame();
    this.gfx = this.add.graphics().setDepth(3);
    this.msg = this.add.text(W / 2, 112, 'Tap to drop the crate — line it up!', { fontSize: '24px', color: TEXT }).setOrigin(0.5).setDepth(5);
    this.count = this.add.text(W - 120, 112, '', { fontSize: '26px', color: TEXT, fontStyle: 'bold' }).setOrigin(0.5).setDepth(5);
    this.input.on('pointerdown', () => this.tap());
    this.input.keyboard.on('keydown-SPACE', () => this.tap());
    this.finished = false;
  }

  tap() {
    if (this.finished || this.g.over) return;
    const r = drop(this.g);
    this.room.sfx[r === 'miss' ? 'nope' : r === 'perfect' ? 'ding' : 'pop']();
    this.msg.setText(r === 'perfect' ? 'Perfect!' : r === 'ok' ? 'Nice' : 'It toppled!');
    if (this.g.over || this.g.score >= MAX_CRATES) this.time.delayedCall(700, () => this.end());
  }

  update(time, delta) {
    if (this.finished) return;
    step(this.g, Math.min(delta / 1000, 0.05));
    this.draw();
  }

  draw() {
    const g = this.g, x0 = W / 2 - WIDTH / 2, shift = Math.max(0, (g.stack.length - 8) * CRATE_H), pal = COLORS[this.theme] || COLORS.crates, gfx = this.gfx.clear();
    inkFill(gfx, wobblyPoly(rectPoints(x0 - 40, FLOOR_Y, WIDTH + 80, 18), { amp: 1.4, seed: 5, step: 24 }), 0x9a8a78, { w: 3.2, seed: 5, heavy: 0 });          // the floor
    g.stack.forEach((c, i) => {
      const y = FLOOR_Y - (i + 1) * CRATE_H + shift;
      if (y > 120 && y < FLOOR_Y) inkFill(gfx, wobblyPoly(rectPoints(x0 + c.x, y, c.w, CRATE_H - 2), { amp: 1, seed: 20 + i, step: 20 }), pal[i % pal.length], { w: 3.2, seed: 20 + i, heavy: 0 });
    });
    if (!g.over) {
      const y = FLOOR_Y - (g.stack.length + 1) * CRATE_H + shift - 6;
      inkFill(gfx, wobblyPoly(rectPoints(x0 + g.x, Math.max(130, y), g.w, CRATE_H - 2), { amp: 1, seed: 90, step: 20 }), 0xf5c14a, { w: 3.2, seed: 90, heavy: 0 });             // the one in your hands
    }
    this.count.setText(`${g.score} / ${MAX_CRATES}`);
  }

  end() {
    if (this.finished) return;
    this.finished = true;
    const p = performance(this.g);
    this.results([`${this.g.score} crates stacked`, p >= 8 ? 'Great work!' : p >= 4 ? 'A decent shift' : 'A rough shift', 'That took three hours'], { performance: p, minutes: 180, game: 'stack' });
  }
}
