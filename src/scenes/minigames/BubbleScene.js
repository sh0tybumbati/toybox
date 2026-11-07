// Bubble Pop: tap bubbles as they float up. Pop quickly, one after another, for a combo multiplier. Hand-inked.
import { W } from '../../config.js';
import MiniGame from './MiniGame.js';
import { INK, blob, inkFill, inkStroke, wobblyPoly, rectPoints } from '../../data/ink.js';
import { KINDS, SECONDS, coinsFor, nextCombo, nextKind, popScore, riseSpeed, spawnGap, multiplier } from '../../systems/bubbles.js';
import { floatText } from '../../systems/interactions.js';

const SCREEN = { x: 96, y: 120, w: 768, h: 380 };
const COLS = [0xa9d9f0, 0xf5b5c8, 0xbfe3b0, 0xd9c5f0, 0xffd9a0];

export default class BubbleScene extends MiniGame {
  constructor() { super('Bubbles'); }

  heading() { return 'Bubble Pop'; }

  create() {
    this.frame();
    const g = this.add.graphics().setDepth(1);
    inkFill(g, wobblyPoly(rectPoints(SCREEN.x - 16, SCREEN.y - 16, SCREEN.w + 32, SCREEN.h + 32), { amp: 1.6, seed: 2, step: 26 }), 0x4a5368, { w: 5, seed: 2 });
    inkFill(g, wobblyPoly(rectPoints(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h), { amp: 1.2, seed: 3, step: 30 }), 0xdff3fb, { w: 3.4, seed: 3, heavy: 0 });
    this.gfx = this.add.graphics().setDepth(4);
    this.gfx.setMask(this.make.graphics({ add: false }).fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h).createGeometryMask());      // bubbles only show inside the screen
    this.bubbles = []; this.score = 0; this.t = 0; this.nextAt = 0.2; this.combo = { combo: 0, last: null }; this.ended = false;
    this.hud = this.add.text(SCREEN.x + 18, SCREEN.y + 10, '', { fontSize: '28px', fontStyle: 'bold', color: '#3a2a22' }).setDepth(10);
    this.input.on('pointerdown', p => this.tap(p.x, p.y));
  }

  spawn() {
    const kind = nextKind(), k = KINDS[kind];
    this.bubbles.push({ kind, r: k.r, x: Phaser.Math.Between(SCREEN.x + k.r, SCREEN.x + SCREEN.w - k.r), y: SCREEN.y + SCREEN.h + k.r, vy: riseSpeed(kind, this.t), col: kind === 'gold' ? 0xffd24d : Phaser.Utils.Array.GetRandom(COLS), wob: Math.random() * 6 });
  }

  tap(x, y) {
    if (this.over || this.ended) return;
    const hit = [...this.bubbles].reverse().find(b => Math.hypot(b.x - x, b.y - y) <= b.r + 10);
    if (!hit) return;
    this.combo = nextCombo(this.combo, this.t);
    const pts = popScore(hit.kind, this.combo.combo - 1 || 0);
    this.score += pts;
    this.bubbles = this.bubbles.filter(b => b !== hit);
    this.room.sfx[hit.kind === 'gold' ? 'ding' : 'pop']();
    this.burst(hit);
    const t = this.add.text(hit.x, hit.y, `+${pts}`, { fontSize: '30px', fontStyle: 'bold', color: '#fff', stroke: '#3a2a22', strokeThickness: 5 }).setOrigin(0.5).setDepth(12);
    this.tweens.add({ targets: t, y: hit.y - 50, alpha: 0, duration: 650, onComplete: () => t.destroy() });
  }

  burst(b) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, d = this.add.circle(b.x, b.y, 6, b.col).setStrokeStyle(2.5, INK).setDepth(11);
      this.tweens.add({ targets: d, x: b.x + Math.cos(a) * b.r * 1.4, y: b.y + Math.sin(a) * b.r * 1.4, alpha: 0, scale: 0.3, duration: 360, onComplete: () => d.destroy() });
    }
  }

  update(time, delta) {
    if (this.over || this.ended) return;
    const dt = Math.min(delta / 1000, 1 / 20);
    this.t += dt;
    this.nextAt -= dt;
    if (this.nextAt <= 0) { this.spawn(); this.nextAt = spawnGap(this.t); }
    for (const b of this.bubbles) b.y -= b.vy * dt;
    this.bubbles = this.bubbles.filter(b => b.y > SCREEN.y - b.r);
    const g = this.gfx.clear();
    for (const b of this.bubbles) {
      const wx = b.x + Math.sin(time / 400 + b.wob) * 5;
      inkFill(g, blob(wx, b.y, b.r, b.r * 1.04, { n: 18, amp: 0.05, seed: Math.round(b.wob * 10) }), b.col, { w: 3.6, seed: Math.round(b.wob * 10), heavy: 0 });
      inkStroke(g, [{ x: wx - b.r * 0.5, y: b.y - b.r * 0.2 }, { x: wx - b.r * 0.4, y: b.y - b.r * 0.55 }, { x: wx - b.r * 0.1, y: b.y - b.r * 0.7 }], { w: 3, color: 0xffffff, heavy: 0 });
    }
    const stale = this.combo.last !== null && this.t - this.combo.last > 0.9;
    const m = stale ? 1 : multiplier(this.combo.combo - 1 || 0);
    this.hud.setText(`Score ${this.score}     x${m}     ${Math.max(0, Math.ceil(SECONDS - this.t))}s`);
    if (this.t >= SECONDS) this.end();
  }

  end() {
    this.ended = true;
    const coins = coinsFor(this.score), best = this.room.scores.bubbles || 0;
    this.results([`${this.score} points${this.score > best ? ' — a new best!' : ''}`, `+${coins} coins`], { coins, score: this.score, game: 'bubbles' });
  }
}
