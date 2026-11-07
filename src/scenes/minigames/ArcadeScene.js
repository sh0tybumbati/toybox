// Star Catcher, on the TV: slide the basket to catch falling stars and dodge the socks. Hand-inked.
import { W, H } from '../../config.js';
import MiniGame from './MiniGame.js';
import { INK, blob, inkFill, wobblyPoly, rectPoints } from '../../data/ink.js';
import { TEXT } from '../../ui.js';
import { spriteImage } from '../../systems/itemTextures.js';
import { GAME_SECONDS, LIVES, caught, catchEffect, coinsFor, fallSpeed, nextThing, spawnGap } from '../../systems/arcade.js';

const SCREEN = { x: 96, y: 120, w: 768, h: 380 };
const RIM = SCREEN.y + SCREEN.h - 66;

export default class ArcadeScene extends MiniGame {
  constructor() { super('Arcade'); }

  create() {
    this.frame();
    const g = this.add.graphics().setDepth(1);                                                       // the TV and its screen
    inkFill(g, wobblyPoly(rectPoints(SCREEN.x - 16, SCREEN.y - 16, SCREEN.w + 32, SCREEN.h + 32), { amp: 1.6, seed: 2, step: 26 }), 0x4a5368, { w: 5, seed: 2 });
    inkFill(g, wobblyPoly(rectPoints(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h), { amp: 1.2, seed: 3, step: 30 }), 0x2e2a52, { w: 3.4, seed: 3, heavy: 0 });
    for (let i = 0; i < 22; i++) g.fillStyle(0xffe27a, 0.7).fillPoints(blob(SCREEN.x + 30 + ((i * 97) % (SCREEN.w - 60)), SCREEN.y + 24 + ((i * 53) % (SCREEN.h - 80)), 2.6, 2.6, { n: 5, seed: i }), true);
    this.basket = spriteImage(this, 'basket', W / 2, RIM + 32, 112).setDepth(6);
    this.things = [];
    this.score = 0; this.lives = LIVES; this.t = 0; this.nextAt = 0.4; this.bx = W / 2; this.ended = false;
    this.hud = this.add.text(SCREEN.x + 18, SCREEN.y + 12, '', { fontSize: '28px', fontStyle: 'bold', color: '#fff3d0' }).setDepth(10);
    this.livesImgs = [];
    this.input.on('pointermove', p => { this.bx = p.x; });
    this.input.on('pointerdown', p => { this.bx = p.x; });
    this.keys = this.input.keyboard.createCursorKeys();
  }

  spawn() {
    const kind = nextThing(this.t), x = Phaser.Math.Between(SCREEN.x + 40, SCREEN.x + SCREEN.w - 40);
    const img = kind === 'sock' ? spriteImage(this, 'sock', x, SCREEN.y - 20, 52) : spriteImage(this, 'star', x, SCREEN.y - 20, kind === 'gold' ? 62 : 46);
    img.setDepth(5);
    if (kind === 'gold') img.setTint(0xfff0a0);
    this.things.push({ kind, img, vy: fallSpeed(kind, this.t), spin: Phaser.Math.FloatBetween(-2, 2) });
  }

  update(time, delta) {
    if (this.over || this.ended) return;
    const dt = Math.min(delta / 1000, 1 / 20);
    this.t += dt;
    if (this.keys.left.isDown) this.bx -= 520 * dt;
    if (this.keys.right.isDown) this.bx += 520 * dt;
    this.bx = Phaser.Math.Clamp(this.bx, SCREEN.x + 56, SCREEN.x + SCREEN.w - 56);
    this.basket.x += (this.bx - this.basket.x) * Math.min(1, dt * 22);
    this.nextAt -= dt;
    if (this.nextAt <= 0) { this.spawn(); this.nextAt = spawnGap(this.t); }
    for (const th of this.things) {
      th.img.y += th.vy * dt; th.img.angle += th.spin * 60 * dt;
      if (!th.done && caught(th.img.x, th.img.y, this.basket.x, RIM)) this.take(th);
      if (th.img.y > SCREEN.y + SCREEN.h + 30) th.done = true;
    }
    this.things = this.things.filter(th => { if (th.done) { th.img.destroy(); return false; } return true; });
    this.hud.setText(`★ ${this.score}     ${'♥'.repeat(Math.max(0, this.lives))}     ${Math.max(0, Math.ceil(GAME_SECONDS - this.t))}s`);
    if (this.lives <= 0 || this.t >= GAME_SECONDS) this.end();
  }

  take(th) {
    th.done = true;
    const e = catchEffect(th.kind);
    this.score += e.score; this.lives += e.lives;
    this.room.sfx[e.lives < 0 ? 'nope' : th.kind === 'gold' ? 'ding' : 'pop']();
    this.tweens.add({ targets: this.basket, scaleY: this.basket.scaleY * 0.86, duration: 70, yoyo: true });
  }

  end() {
    this.ended = true;
    const coins = coinsFor(this.score);
    this.results([`${this.score} stars`, `+${coins} coins`], { coins });
  }
}
