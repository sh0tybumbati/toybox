// The furniture store: pick a flat-pack, then put it together by tapping the numbered parts in order. Hand-inked.
import { W } from '../../config.js';
import MiniGame from './MiniGame.js';
import { CARD, TEXT, hitZone, inkPanel } from '../../ui.js';
import { penFor } from '../../data/inkpen.js';
import { PROP_TYPES } from '../../data/props.js';
import { FLATPACK, coinsFor, newAssembly, place } from '../../systems/ikea.js';

const WOODS = [0xc99466, 0xb5835a, 0xd9aa72, 0xa86f47, 0xe0b98a];

export default class IkeaScene extends MiniGame {
  constructor() { super('Ikea'); }

  create() {
    this.frame();
    this.live = [];
    this.showShelf();
  }

  keep(o) { this.live.push(o); return o; }
  clear() { this.live.forEach(o => o.destroy()); this.live = []; }

  // Stage one: the catalogue of flat-packs.
  showShelf() {
    this.clear(); this.stage = 'pick';
    this.keep(this.add.text(W / 2, 118, 'Pick a flat-pack to build', { fontSize: '26px', color: TEXT })).setOrigin(0.5).setDepth(3);
    Object.entries(FLATPACK).forEach(([type, f], i) => {
      const def = PROP_TYPES[type], cx = 150 + i * 220, cy = 300, ok = this.room.coins >= f.price;
      this.keep(inkPanel(this, cx, cy, 200, 250, { fill: CARD, radius: 14, shadow: false, weight: 3, seed: 40 + i, depth: 3 }));
      const art = this.keep(this.add.graphics().setPosition(cx, cy - 36).setDepth(4));
      def.draw(penFor(art, type), false);
      art.setScale(Math.min(1, 130 / def.w, 110 / def.h)).setAlpha(ok ? 1 : 0.5);
      this.keep(this.add.text(cx, cy + 50, def.name, { fontSize: '24px', fontStyle: 'bold', color: TEXT })).setOrigin(0.5).setDepth(4);
      this.keep(this.add.text(cx, cy + 78, `${f.parts} parts`, { fontSize: '18px', color: TEXT })).setOrigin(0.5).setDepth(4);
      const price = this.keep(this.add.text(cx, cy + 106, `🪙 ${f.price}`, { fontSize: '26px', fontStyle: 'bold', color: ok ? TEXT : '#b0584e' })).setOrigin(0.5).setDepth(4);
      this.keep(hitZone(this, cx, cy, 200, 250, () => this.choose(type, price), 5));
    });
  }

  choose(type, priceText) {
    if (this.stage !== 'pick') return;
    const f = FLATPACK[type];
    if (this.room.coins < f.price) {
      this.room.sfx.nope();
      this.tweens.add({ targets: priceText, x: priceText.x + 6, duration: 50, yoyo: true, repeat: 3 });
      this.say?.destroy();
      this.say = this.add.text(W / 2, 470, `${f.price - this.room.coins} more 🪙 needed`, { fontSize: '24px', color: TEXT }).setOrigin(0.5).setDepth(4);
      this.tweens.add({ targets: this.say, alpha: 0, delay: 1000, duration: 400 });
      return;
    }
    this.startBuild(type);
  }

  // Stage two: the numbered parts, jumbled on the floor, and a faint picture of the finished piece that fills in as you go.
  startBuild(type) {
    this.clear(); this.stage = 'build';
    this.type = type;
    this.a = newAssembly(type);
    const def = PROP_TYPES[type];
    this.keep(this.add.text(W / 2, 118, '', { fontSize: '26px', color: TEXT })).setOrigin(0.5).setDepth(3);
    this.hint = this.live[this.live.length - 1];
    this.updateHint();
    this.ghost = this.keep(this.add.graphics().setPosition(690, 320).setDepth(3));
    def.draw(penFor(this.ghost, type), false);
    this.ghost.setScale(Math.min(1.3, 250 / def.w, 230 / def.h)).setAlpha(0.18);
    this.parts = this.a.layout.map((label, slot) => {
      const x = 150 + (slot % 2) * 150 + (slot % 3) * 12, y = 220 + Math.floor(slot / 2) * 100, w = 120, h = 70 + (label % 2) * 14;
      const g = inkPanel(this, 0, 0, w, h, { fill: WOODS[label % WOODS.length], radius: 8, shadow: false, weight: 3.4, seed: 60 + label });
      const num = this.add.text(0, 0, String(label), { fontSize: '40px', fontStyle: 'bold', color: '#4a3426' }).setOrigin(0.5);
      const c = this.add.container(x, y, [g, num]).setDepth(4).setAngle(((slot * 37) % 17) - 8);
      c.setSize(w, h);
      this.keep(hitZone(this, x, y, w + 10, h + 10, () => this.tap(label, c), 5));
      return c;
    });
    this.parts.forEach(c => this.keep(c));
  }

  updateHint() { this.hint.setText(`Step ${Math.min(this.a.next, this.a.n)} of ${this.a.n}: tap part number ${Math.min(this.a.next, this.a.n)}`); }

  tap(label, c) {
    if (this.stage !== 'build' || !c.visible) return;
    const r = place(this.a, label);
    if (r === 'wrong') {
      this.room.sfx.nope();
      this.tweens.add({ targets: c, x: c.x + 7, duration: 45, yoyo: true, repeat: 3 });
      return;
    }
    this.room.sfx.pop();
    this.tweens.add({ targets: c, x: 690, y: 320, scale: 0.3, alpha: 0, duration: 320, onComplete: () => c.setVisible(false) });
    this.tweens.add({ targets: this.ghost, alpha: 0.18 + 0.82 * ((this.a.next - 1) / this.a.n), duration: 300 });
    this.updateHint();
    if (r === 'done') { this.stage = 'done'; this.time.delayedCall(500, () => this.finished()); }
  }

  finished() {
    this.room.sfx.fanfare();
    this.tweens.add({ targets: this.ghost, alpha: 1, scaleX: this.ghost.scaleX * 1.12, scaleY: this.ghost.scaleY * 1.12, duration: 160, yoyo: true });
    const f = FLATPACK[this.type], bonus = coinsFor(this.a.mistakes), name = PROP_TYPES[this.type].name;
    this.time.delayedCall(700, () => this.results([`${name} built!`, this.a.mistakes ? `${this.a.mistakes} slip${this.a.mistakes > 1 ? 's' : ''}` : 'Not one mistake!', bonus ? `+${bonus} coins` : 'Now to send it home'],
      { coins: bonus, spend: f.price, furniture: this.type }));
  }
}
