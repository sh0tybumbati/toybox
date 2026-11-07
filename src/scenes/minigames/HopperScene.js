// Hopper: your character runs by itself; tap (or press space / up) to jump over rocks, logs and bushes, and grab coins.
// One bump ends the run. Hand-inked.
import { W } from '../../config.js';
import MiniGame from './MiniGame.js';
import Character from '../../entities/Character.js';
import { INK, blob, inkFill, inkStroke, wobblyPoly, rectPoints } from '../../data/ink.js';
import { MAP_COLORS } from '../../data/mapart.js';
import { spriteImage } from '../../systems/itemTextures.js';
import { HERO, coinsFor, hits, jump, newHero, nextGap, scoreFor, speedAt, stepHero } from '../../systems/hopper.js';
import { TEXT } from '../../ui.js';

const SCREEN = { x: 70, y: 120, w: 820, h: 380 };
const GROUND = SCREEN.y + SCREEN.h - 70;                     // y of the ground line
const TYPES = [{ id: 'rock', w: 54, h: 46, col: 0xa6adb8 }, { id: 'log', w: 86, h: 36, col: 0x9a6238 }, { id: 'bush', w: 50, h: 66, col: 0x4a9548 }];

export default class HopperScene extends MiniGame {
  constructor() { super('Hopper'); }

  heading() { return 'Hopper'; }

  create() {
    this.frame();
    const g = this.add.graphics().setDepth(1);
    inkFill(g, wobblyPoly(rectPoints(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h), { amp: 1.4, seed: 3, step: 30 }), 0xcfeaff, { w: 4, seed: 3, heavy: 0 });
    this.world = this.add.graphics().setDepth(2);
    this.gfx = this.add.graphics().setDepth(5);
    this.clip = this.make.graphics({ add: false }).fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h).createGeometryMask();      // the world only shows inside the frame
    this.world.setMask(this.clip); this.gfx.setMask(this.clip);
    const look = this.room.characters[0].look;
    this.hero = new Character(this, { id: 'runner', name: 'you', look, x: HERO.x + SCREEN.x });
    this.hero.disableInteractive();
    this.hero.setScale(look.age === 'adult' ? 0.4 : 0.52).setDepth(6);
    this.hero.walking = true;
    this.h = newHero(); this.obs = []; this.coins = []; this.t = 0; this.nextAt = 1.2; this.got = 0; this.ended = false; this.scroll = 0;
    this.hud = this.add.text(SCREEN.x + 18, SCREEN.y + 10, '', { fontSize: '28px', fontStyle: 'bold', color: TEXT }).setDepth(10);
    this.input.on('pointerdown', () => this.hop());
    this.input.keyboard.on('keydown-SPACE', () => this.hop());
    this.input.keyboard.on('keydown-UP', () => this.hop());
    this.hint = this.add.text(W / 2, SCREEN.y + 70, 'Tap to jump!', { fontSize: '30px', fontStyle: 'bold', color: TEXT }).setOrigin(0.5).setDepth(10);
  }

  hop() {
    if (this.over || this.ended) return;
    if (jump(this.h)) { this.room.sfx.boing(); this.hint.setVisible(false); }
  }

  spawn() {
    const type = Phaser.Utils.Array.GetRandom(TYPES);
    this.obs.push({ ...type, x: SCREEN.x + SCREEN.w + 60 });
    if (Math.random() < 0.55) this.coins.push({ x: SCREEN.x + SCREEN.w + 60 + (Math.random() < 0.5 ? 0 : 120), y: 90 + Math.random() * 90, img: spriteImage(this, 'coin', 0, 0, 40).setDepth(5).setMask(this.clip) });
  }

  update(time, delta) {
    if (this.over || this.ended) return;
    const dt = Math.min(delta / 1000, 1 / 20), speed = speedAt(this.t);
    this.t += dt; this.scroll += speed * dt;
    stepHero(this.h, dt);
    this.nextAt -= dt;
    if (this.nextAt <= 0) { this.spawn(); this.nextAt = nextGap(speed); }
    for (const o of this.obs) o.x -= speed * dt;
    for (const c of this.coins) c.x -= speed * dt;
    this.obs = this.obs.filter(o => o.x > SCREEN.x - 100);

    // the hero (a real, boneless character mid-run)
    const h = this.hero;
    h.advanceWalk(speed * dt * 0.6, 56);
    h.setPosition(SCREEN.x + HERO.x, GROUND - h.foot() - this.h.y).setAngle(this.h.y > 0 ? -4 : 0);
    h.animate(time, h.x + 200, h.y);

    // coins
    for (const c of this.coins) {
      c.img.setPosition(c.x, GROUND - c.y);
      if (!c.taken && Math.abs(c.x - (SCREEN.x + HERO.x)) < 34 && Math.abs((GROUND - c.y) - (GROUND - this.h.y - 40)) < 52) { c.taken = true; this.got++; this.room.sfx.coin(); c.img.destroy(); }
    }
    this.coins = this.coins.filter(c => { if (c.taken) return false; if (c.x < SCREEN.x - 60) { c.img.destroy(); return false; } return true; });

    const hero = { y: this.h.y };
    for (const o of this.obs) {
      const local = { x: o.x - SCREEN.x, w: o.w, h: o.h };
      if (hits(hero, local)) { this.crash(); return; }
    }
    this.paint(time, speed);
    this.hud.setText(`Score ${scoreFor(this.t, this.got)}     coins ${this.got}`);
  }

  paint(time, speed) {
    const w = this.world.clear();
    for (let i = 0; i < 4; i++) {                                                                   // far hills scrolling slowly
      const x = SCREEN.x + ((i * 260 - this.scroll * 0.2) % 1040 + 1040) % 1040 - 100;
      w.fillStyle(MAP_COLORS.hill, 1).fillPoints(blob(x, GROUND - 10, 150, 80, { n: 16, seed: i }).filter(p => p.y <= GROUND - 10), true);
    }
    w.fillStyle(MAP_COLORS.grass, 1).fillRect(SCREEN.x + 2, GROUND, SCREEN.w - 4, SCREEN.h - (GROUND - SCREEN.y) - 2);
    inkStroke(w, [{ x: SCREEN.x, y: GROUND }, { x: SCREEN.x + SCREEN.w, y: GROUND }], { w: 5, seed: 4, heavy: 2 });
    for (let x = ((-this.scroll) % 90 + 90) % 90; x < SCREEN.w; x += 90) inkStroke(w, [{ x: SCREEN.x + x, y: GROUND + 24 }, { x: SCREEN.x + x + 12, y: GROUND + 20 }], { w: 3, color: 0x3f7f3f, heavy: 0 });
    const g = this.gfx.clear();
    for (const o of this.obs) {
      if (o.id === 'rock') inkFill(g, blob(o.x, GROUND - o.h / 2, o.w / 2, o.h / 2, { n: 12, amp: 0.1, seed: Math.round(o.x) % 9 }), o.col, { w: 3.8, seed: 5 });
      else if (o.id === 'log') { inkFill(g, wobblyPoly(rectPoints(o.x - o.w / 2, GROUND - o.h, o.w, o.h), { amp: 1.4, seed: 6, step: 14 }), o.col, { w: 3.8, seed: 6 }); inkFill(g, blob(o.x + o.w / 2, GROUND - o.h / 2, 7, o.h / 2, { n: 8, seed: 7 }), 0xd9a066, { w: 2.6, seed: 7, heavy: 0 }); }
      else { inkFill(g, blob(o.x, GROUND - o.h / 2, o.w / 2, o.h / 2, { n: 14, amp: 0.12, seed: 8 }), o.col, { w: 3.8, seed: 8 }); }
    }
  }

  crash() {
    this.ended = true;
    this.room.sfx.nope();
    this.tweens.add({ targets: this.hero, angle: 90, y: this.hero.y + 20, duration: 300 });
    const score = scoreFor(this.t, this.got), coins = coinsFor(score), best = this.room.scores.hopper || 0;
    this.time.delayedCall(700, () => this.results([`${score} points${score > best ? ' — a new best!' : ''}`, `+${coins} coins`], { coins, score, game: 'hopper' }));
  }
}
