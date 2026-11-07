// Fishing: cast, wait for the bite, tap while it bites, then hold to reel (let go when the line strains). Hand-inked.
// Every catch is a coin or two and a real fish for the room; the golden one is worth five.
import { W, H } from '../../config.js';
import MiniGame from './MiniGame.js';
import { INK, blob, inkFill, inkLine, inkStroke, wobblyPoly, rectPoints } from '../../data/ink.js';
import { MAP_COLORS } from '../../data/mapart.js';
import { TEXT } from '../../ui.js';
import { iconImage, spriteImage } from '../../systems/itemTextures.js';
import { stepFishing, pickCatch, CATCHES, BITE_WINDOW } from '../../systems/fishing.js';
import Character from '../../entities/Character.js';

const WATER = { x: 330, y: 300, w: 560, h: 200 };

export default class FishingScene extends MiniGame {
  constructor() { super('Fishing'); }

  create() {
    const area = this.frame();
    this.area = area;
    this.timeLeft = 75;
    this.caught = [];
    this.coins = 0;
    this.s = { phase: 'idle', t: 0, wait: 0, progress: 0, strain: 0, burst: 0, burstIn: 1, bx: 600, by: WATER.y + 40 };
    this.paintBackdrop();
    // the player's own character on the dock, holding the rod
    const look = this.room.characters[0].look;
    this.angler = new Character(this, { id: 'angler', name: 'you', look, x: 140 });
    this.angler.disableInteractive();
    this.angler.setScale(look.age === 'adult' ? 0.62 : 0.8);
    this.angler.setPosition(140, 300 - this.angler.foot()).setDepth(5);
    this.gfx = this.add.graphics().setDepth(6);
    this.bobber = spriteImage(this, 'bobber', 600, 340, 38).setDepth(8).setVisible(false);
    this.fishImg = null;
    this.hint = this.add.text(W / 2, 108, '', { fontSize: '28px', fontStyle: 'bold', color: TEXT }).setOrigin(0.5).setDepth(20);
    this.hud = this.add.text(W / 2 + 60, 52, '', { fontSize: '24px', color: TEXT }).setDepth(20);
    this.timer = this.add.text(W - 140, 108, '', { fontSize: '24px', color: TEXT }).setOrigin(1, 0).setDepth(20);
    this.input.on('pointerdown', () => this.press(true));
    this.input.on('pointerup', () => this.press(false));
    this.holding = false;
    this.setHint('Tap to cast!');
  }

  paintBackdrop() {
    const g = this.add.graphics().setDepth(1);
    inkFill(g, wobblyPoly(rectPoints(66, 160, 828, 140), { amp: 1.4, seed: 3, step: 30 }), 0xcfeaff, { w: 3.4, seed: 3, heavy: 0 });       // sky
    inkFill(g, blob(260, 300, 260, 52, { n: 22, amp: 0.05, seed: 4 }).filter(p => p.y <= 300), MAP_COLORS.hill, { w: 3, seed: 4, heavy: 0 });
    for (const [x, y, rx] of [[420, 214, 40], [700, 190, 52]]) inkFill(g, blob(x, y, rx, rx * 0.5, { n: 12, seed: x }), 0xffffff, { w: 2.8, seed: x, heavy: 0 });
    inkFill(g, wobblyPoly(rectPoints(66, 300, 828, 200), { amp: 1.6, seed: 5, step: 30 }), 0x7fc4e8, { w: 3.6, seed: 5, heavy: 0 });            // water
    for (let i = 0; i < 16; i++) inkStroke(g, [{ x: 360 + ((i * 97) % 520), y: 330 + ((i * 43) % 150) }, { x: 380 + ((i * 97) % 520), y: 326 + ((i * 43) % 150) }, { x: 400 + ((i * 97) % 520), y: 330 + ((i * 43) % 150) }], { w: 2, color: 0xdff2fb, heavy: 0 });
    inkFill(g, wobblyPoly(rectPoints(66, 292, 230, 34), { amp: 1.2, seed: 6, step: 24 }), 0xc99a62, { w: 4, seed: 6 });                         // the dock
    for (const x of [90, 190, 280]) inkFill(g, wobblyPoly(rectPoints(x, 326, 12, 60), { amp: 0.8, seed: x, step: 12 }), 0x8a5e3b, { w: 3, seed: x, heavy: 0 });
  }

  setHint(t) { this.hint.setText(t); }

  press(down) {
    if (this.over) return;
    this.holding = down;
    if (!down) return;
    const s = this.s;
    if (s.phase === 'idle') { this.cast(); return; }
    if (s.phase === 'bite') { this.hook(); return; }
  }

  cast() {
    const s = this.s;
    s.phase = 'cast'; s.t = 0;
    s.bx = Phaser.Math.Between(WATER.x + 80, WATER.x + WATER.w - 60); s.by = Phaser.Math.Between(WATER.y + 50, WATER.y + 150);
    s.wait = Phaser.Math.FloatBetween(1.6, 4.2);
    this.room.sfx.whoosh();
    this.setHint('Wait for a bite…');
  }

  hook() {
    const s = this.s;
    s.phase = 'reel'; s.progress = 0.12; s.strain = 0; s.burst = 0; s.burstIn = 0.8;
    s.catch = pickCatch();
    this.room.sfx.boing();
    this.fishImg = s.catch.item ? iconImage(this, `item:${s.catch.item}`, s.bx, s.by, 62).setDepth(7) : spriteImage(this, 'sock', s.bx, s.by, 56).setDepth(7);
    if (s.catch.gold && this.fishImg) this.fishImg.setTint(0xffd24d);
    this.setHint('Hold to reel — let go when it strains!');
  }

  land(c) {
    const s = this.s;
    this.caught.push(c);
    this.coins += c.coins;
    this.room.sfx.ding();
    if (this.fishImg) { this.tweens.add({ targets: this.fishImg, y: this.fishImg.y - 90, alpha: 0, scale: this.fishImg.scale * 1.4, duration: 600, onComplete: () => { this.fishImg.destroy(); this.fishImg = null; } }); }
    this.setHint(c.coins ? `${c.name}! +${c.coins}` : `${c.name}…`);
    s.phase = 'idle';
    this.time.delayedCall(900, () => { if (s.phase === 'idle' && !this.over) this.setHint('Tap to cast!'); });
  }

  lose(why) {
    const s = this.s;
    this.room.sfx.nope();
    if (this.fishImg) { this.fishImg.destroy(); this.fishImg = null; }
    s.phase = 'idle';
    this.setHint(why);
    this.time.delayedCall(1100, () => { if (s.phase === 'idle' && !this.over) this.setHint('Tap to cast!'); });
  }

  update(time, delta) {
    if (this.over) return;
    const dt = Math.min(delta / 1000, 1 / 20), s = this.s;
    this.angler.animate(time, s.bx, s.by);
    this.timeLeft -= dt;
    if (this.timeLeft <= 0 && s.phase === 'idle') { this.end(); return; }
    this.timer.setText(`${Math.max(0, Math.ceil(this.timeLeft))}s`);
    this.hud.setText(`Caught ${this.caught.filter(c => c.item).length}    +${this.coins} coins`);

    const ev = stepFishing(s, dt, this.holding, () => Math.random());
    if (ev === 'bite') { this.room.sfx.pop(); this.setHint('BITE! Tap now!'); }
    if (ev === 'missed') this.lose('It got away…');
    if (ev === 'snap') this.lose('The line snapped!');
    if (ev === 'caught') this.land(s.catch);

    this.paint(time);
  }

  paint(time) {
    const g = this.gfx.clear(), s = this.s, rod = { x: 200, y: 220 };
    g.lineStyle(5, INK, 1).strokePoints([{ x: 168, y: 250 }, { x: 186, y: 232 }, rod], false);                                          // the rod
    if (s.phase === 'idle') { this.bobber.setVisible(false); inkLine(g, rod, { x: 230, y: 285 }, { w: 2.6, amp: 1, heavy: 0 }); return; }
    const dive = s.phase === 'bite' ? 18 : s.phase === 'nibble' ? Math.sin(time / 60) * 3 : s.phase === 'reel' ? Math.sin(time / 50) * 5 : 0;
    const bob = Math.sin(time / 380) * 2 + dive;
    const tip = s.phase === 'cast' ? { x: rod.x + (s.bx - rod.x) * Math.min(1, s.t / 0.5), y: rod.y - Math.sin(Math.min(1, s.t / 0.5) * Math.PI) * 90 + (s.by - rod.y) * Math.min(1, s.t / 0.5) } : { x: s.bx, y: s.by + bob };
    this.bobber.setVisible(true).setPosition(tip.x, tip.y - 6);
    g.lineStyle(2.4, INK, 1).strokePoints([rod, { x: (rod.x + tip.x) / 2, y: Math.min(rod.y, tip.y) - 18 }, { x: tip.x, y: tip.y - 14 }], false);
    for (let k = 0; k < 2; k++) g.lineStyle(2, 0xffffff, 0.8 - ((time / 700 + k * 0.5) % 1) * 0.8).strokeEllipse(tip.x, tip.y + 4, 24 + ((time / 12 + k * 30) % 60), 8 + ((time / 40 + k * 8) % 14));   // ripples
    if (s.phase === 'bite') this.drawBang(g, tip);
    if (s.phase === 'reel' && this.fishImg) {
      this.fishImg.setPosition(s.bx + Math.sin(time / 70) * 14, s.by + 26 + Math.cos(time / 90) * 6).setAngle(Math.sin(time / 60) * 24);
      this.meters(g);
    }
  }

  drawBang(g, tip) { inkFill(g, wobblyPoly([{ x: tip.x - 6, y: tip.y - 70 }, { x: tip.x + 6, y: tip.y - 70 }, { x: tip.x + 3, y: tip.y - 40 }, { x: tip.x - 3, y: tip.y - 40 }], { amp: 0.6, seed: 2, step: 10 }), 0xe0453d, { w: 3, seed: 2, heavy: 0 }); inkFill(g, blob(tip.x, tip.y - 28, 6, 6, { n: 8, seed: 2 }), 0xe0453d, { w: 3, seed: 3, heavy: 0 }); }

  // Two little bars: how close you are to landing it, and how hard the fish is pulling.
  meters(g) {
    const s = this.s, x = 120, y = 400;
    for (const [i, label, v, col] of [[0, 'Reel', s.progress, 0x78c363], [1, 'Strain', s.strain, s.strain > 0.75 ? 0xe5685c : 0xf2ae44]]) {
      const yy = y + i * 34;
      inkFill(g, wobblyPoly(rectPoints(x, yy, 200, 20), { amp: 0.8, seed: 5 + i, step: 20 }), 0xfffaf0, { w: 3, seed: 5 + i, heavy: 0 });
      if (v > 0.02) g.fillStyle(col, 1).fillPoints(wobblyPoly(rectPoints(x + 3, yy + 3, Math.max(4, 194 * Math.min(1, v)), 14), { amp: 0.5, seed: 9 + i, step: 20 }), true);
    }
  }

  end() {
    if (this.over) return;
    const fish = this.caught.filter(c => c.item).map(c => c.item);
    const lines = [`${fish.length} fish caught`, `+${this.coins} coins`];
    this.results(lines, { coins: this.coins, items: fish.slice(0, 6) });
  }
}
