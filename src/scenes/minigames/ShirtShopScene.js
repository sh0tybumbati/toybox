// The Shirt Factory: design a shirt (colour, pattern, pattern colour) on a live preview of your own character, then
// run it through the machine. The new shirt is worn straight away, and the design is kept for next time.
import { W, H } from '../../config.js';
import MiniGame from './MiniGame.js';
import Character from '../../entities/Character.js';
import { SHIRT_COLORS } from '../../data/look.js';
import { PATTERN_IDS, PATTERNS } from '../../data/patterns.js';
import { INK, blob, inkFill } from '../../data/ink.js';
import { CARD, COLORS, TEXT, hitZone, inkButton, inkSwatch } from '../../ui.js';

const PALETTE = [...SHIRT_COLORS, 0xff5d5d, 0x4cc9a8, 0xffb703, 0x9d4edd];

export default class ShirtShopScene extends MiniGame {
  constructor() { super('ShirtShop'); }

  create() {
    this.frame();
    const kid = this.room.selected || this.room.characters[0];
    this.baseLook = kid.look;
    this.design = { color: kid.look.shirt, pattern: kid.look.pattern ? { ...kid.look.pattern } : null };
    const stage = this.add.graphics().setDepth(1);
    inkFill(stage, blob(250, 492, 130, 18, { n: 20, amp: 0.05, seed: 3 }), 0xe6d3b3, { w: 3.4, seed: 3, heavy: 0 });
    this.preview = new Character(this, { id: 'model', name: 'model', look: this.baseLook, x: 250 });
    this.preview.disableInteractive();
    const big = this.baseLook.age === 'adult' ? 0.95 : 1.3;
    this.preview.setScale(big).setPosition(250, 490 - this.preview.foot()).setDepth(5);
    this.g = this.add.graphics().setDepth(2);                                   // swatches
    this.ui = [];
    this.build();
  }

  update(time) {
    if (this.preview && !this.over) this.preview.animate(time, this.input.activePointer.x, this.input.activePointer.y);
  }

  look() { return { ...this.baseLook, shirt: this.design.color, pattern: this.design.pattern }; }
  refresh() { this.preview.applyLook(this.look()); this.build(); }

  build() {
    this.ui.forEach(o => o.destroy());
    this.ui = [];
    this.g.clear();
    const add = o => { this.ui.push(o); return o; }, d = this.design;
    const label = (x, y, t) => add(this.add.text(x, y, t, { fontSize: '22px', fontStyle: 'bold', color: TEXT }).setDepth(3));
    const swatches = (y, pick, current, cols = 6) => PALETTE.forEach((col, i) => {
      const x = 500 + (i % cols) * 56, yy = y + Math.floor(i / cols) * 42;
      inkSwatch(this.g, x, yy, 16, col, current === col, i + y);
      add(hitZone(this, x, yy, 40, 40, () => { this.room.sfx.pop(); pick(col); }, 4));
    });
    label(470, 104, 'Shirt colour');
    swatches(150, col => { d.color = col; this.refresh(); }, d.color);
    label(470, 232, 'Pattern');
    ['none', ...PATTERN_IDS].forEach((id, i) => {
      const on = (id === 'none' && !d.pattern) || (d.pattern && d.pattern.id === id);
      add(inkButton(this, 530 + (i % 3) * 132, 280 + Math.floor(i / 3) * 44, id === 'none' ? 'Plain' : PATTERNS[id].name, {
        w: 120, h: 36, size: 20, fill: on ? COLORS.gold : CARD, depth: 6, seed: i + 4,
        onTap: () => { d.pattern = id === 'none' ? null : { id, color: d.pattern ? d.pattern.color : 0xffffff }; this.room.sfx.pop(); this.refresh(); } }));
    });
    if (d.pattern) { label(470, 372, 'Pattern colour'); swatches(420, col => { d.pattern = { ...d.pattern, color: col }; this.refresh(); }, d.pattern.color); }
    else add(this.add.text(470, 380, 'Pick a pattern to choose its colour.', { fontSize: '20px', color: TEXT }).setDepth(3));
    // designs made before
    const saved = this.room.shirtDesigns;
    if (saved.length) {
      add(this.add.text(70, 108, 'Your designs', { fontSize: '20px', fontStyle: 'bold', color: TEXT }).setDepth(3));
      saved.forEach((s, i) => {
        const x = 84 + (i % 4) * 44, y = 150 + Math.floor(i / 4) * 44;
        inkSwatch(this.g, x, y, 17, s.color, false, i + 70);
        if (s.pattern) this.g.fillStyle(s.pattern.color, 1).fillCircle(x, y, 6);
        add(hitZone(this, x, y, 40, 40, () => { d.color = s.color; d.pattern = s.pattern ? { ...s.pattern } : null; this.room.sfx.pop(); this.refresh(); }, 4));
      });
    }
    add(inkButton(this, 770, 526, '🧵 Make it!', { w: 230, h: 54, size: 30, fill: COLORS.green, depth: 6, onTap: () => this.craft() }));
  }

  // The machine (named craft(): Phaser scenes already have a `make`): the kid jiggles, the needle sounds, then the shirt is theirs.
  craft() {
    if (this.making) return;
    this.making = true;
    this.tweens.add({ targets: this.preview, angle: { from: -3, to: 3 }, duration: 90, yoyo: true, repeat: 10, onComplete: () => { this.preview.angle = 0; } });
    for (let i = 0; i < 7; i++) this.time.delayedCall(i * 150, () => this.room.sfx.click());
    this.time.delayedCall(1250, () => { this.room.sfx.fanfare(); this.results(['Your new shirt is ready!', '+2 coins'], { coins: 2, shirt: { color: this.design.color, pattern: this.design.pattern } }); });
  }
}
