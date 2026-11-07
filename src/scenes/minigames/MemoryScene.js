// Memory Match: turn two cards over at a time and find all the pairs. Fewer moves = more coins. Hand-inked.
import { W } from '../../config.js';
import MiniGame from './MiniGame.js';
import { CARD, COLORS, TEXT, hitZone, inkPanel } from '../../ui.js';
import { iconImage, spriteImage } from '../../systems/itemTextures.js';
import { coinsFor, deal, done, flip, settle } from '../../systems/memory.js';

const COLS = 4, CW = 150, CH = 116, X0 = W / 2 - 1.5 * 176, Y0 = 204;

export default class MemoryScene extends MiniGame {
  constructor() { super('Memory'); }

  heading() { return 'Memory Match'; }

  create() {
    this.frame();
    this.game = deal();
    this.busy = false;
    this.moves = this.add.text(W / 2 + 60, 52, 'Moves: 0', { fontSize: '26px', color: TEXT }).setDepth(3);
    this.add.text(W / 2, 112, 'Find the matching pairs!', { fontSize: '24px', color: TEXT }).setOrigin(0.5).setDepth(3);
    this.cards = this.game.cards.map((key, i) => {
      const x = X0 + (i % COLS) * 176, y = Y0 + Math.floor(i / COLS) * 134;
      const back = inkPanel(this, 0, 0, CW, CH, { fill: 0x6fb4ea, radius: 16, shadow: false, weight: 4, seed: 70 + i });
      const q = spriteImage(this, 'icon-question', 0, 0, 56).setAlpha(0.9);
      const face = inkPanel(this, 0, 0, CW, CH, { fill: CARD, radius: 16, shadow: false, weight: 4, seed: 90 + i }).setVisible(false);
      const pic = iconImage(this, `item:${key}`, 0, 0, 84).setVisible(false);
      const c = this.add.container(x, y, [back, q, face, pic]).setDepth(4);
      hitZone(this, x, y, CW, CH, () => this.pick(i), 8);
      return { c, back, q, face, pic, up: false };
    });
  }

  show(i, up) {
    const k = this.cards[i];
    this.tweens.add({ targets: k.c, scaleX: 0, duration: 110, onComplete: () => {
      k.up = up; k.back.setVisible(!up); k.q.setVisible(!up); k.face.setVisible(up); k.pic.setVisible(up);
      this.tweens.add({ targets: k.c, scaleX: 1, duration: 110 });
    } });
  }

  pick(i) {
    if (this.busy || this.over) return;
    const r = flip(this.game, i);
    if (r === 'ignored') return;
    this.room.sfx.pop();
    this.show(i, true);
    this.moves.setText(`Moves: ${this.game.moves}`);
    if (r === 'match') {
      this.busy = true;
      this.time.delayedCall(500, () => { this.room.sfx.ding(); this.cards.forEach((k, n) => { if (this.game.matched[n]) this.tweens.add({ targets: k.c, scale: 1.06, duration: 120, yoyo: true }); }); this.busy = false; if (done(this.game)) this.win(); });
    } else if (r === 'miss') {
      this.busy = true;
      const [a, b] = this.game.faceUp;
      this.time.delayedCall(850, () => { this.room.sfx.nope(); settle(this.game); this.show(a, false); this.show(b, false); this.busy = false; });
    }
  }

  win() {
    const coins = coinsFor(this.game.moves), best = this.room.scores.memory || 0, score = Math.max(1, 30 - this.game.moves);       // a higher score = fewer moves
    this.time.delayedCall(500, () => this.results([`${this.game.moves} moves${score > best ? ' — a new best!' : ''}`, `+${coins} coins`], { coins, score, game: 'memory' }));
  }
}
