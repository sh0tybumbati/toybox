// The Toy Workshop: sculpt a toy out of clay — pick a body, a colour, up to four parts and a face — squish it to see
// it wobble, then make it. The new toy is a real item (and the design is saved, so you can make more copies).
import { W, H } from '../../config.js';
import MiniGame from './MiniGame.js';
import { INK, blob, inkFill } from '../../data/ink.js';
import { InkPen } from '../../data/inkpen.js';
import { MAX_PARTS, TOY_BODIES, TOY_FACES, TOY_PARTS, defaultToy, drawToy, newToyId, randomToyName, toyKey } from '../../data/toys.js';
import { CARD, COLORS, TEXT, hitZone, inkButton, inkSwatch } from '../../ui.js';
import { ensureItemTexture } from '../../systems/itemTextures.js';

const CLAY = [0xf59ab4, 0x6aaee8, 0x7bd88f, 0xffd166, 0xb59ae0, 0xff9f68, 0xf4f4f4, 0x8a6a4f];
const S = 2.5;                                              // the preview is the 128 box drawn 2.5x

export default class SculptScene extends MiniGame {
  constructor() { super('Sculpt'); }

  create() {
    this.frame();
    this.design = defaultToy();
    const stage = this.add.graphics().setDepth(1);
    inkFill(stage, blob(250, 486, 130, 18, { n: 20, amp: 0.05, seed: 4 }), 0xe6d3b3, { w: 3.4, seed: 4, heavy: 0 });
    this.toyG = this.add.graphics().setDepth(5);
    this.squish = { sx: 1, sy: 1 };
    this.place();
    hitZone(this, 250, 330, 300, 320, () => this.poke(), 7);
    this.hint = this.add.text(250, 118, 'Tap the clay to squish it!', { fontSize: '22px', color: TEXT }).setOrigin(0.5).setDepth(3);
    this.g = this.add.graphics().setDepth(2);
    this.ui = [];
    this.redraw();
    this.build();
  }

  // The preview sits with its feet on the platform; squishing scales around the feet.
  place() {
    const g = this.toyG, k = this.squish;
    g.setScale(S * k.sx, S * k.sy).setPosition(250 - 64 * S * k.sx, 486 - 118 * S * k.sy);
  }

  redraw() {
    this.toyG.clear();
    drawToy(new InkPen(this.toyG, 5, { weight: 1.9 }), this.design);
  }

  poke() {
    this.room.sfx.boing();
    this.tweens.killTweensOf(this.squish);
    this.squish.sx = 1.18; this.squish.sy = 0.8;
    this.tweens.add({ targets: this.squish, sx: 1, sy: 1, duration: 700, ease: 'Elastic.easeOut', onUpdate: () => this.place() });
    this.place();
  }

  build() {
    this.ui.forEach(o => o.destroy());
    this.ui = [];
    this.g.clear();
    const add = o => { this.ui.push(o); return o; }, d = this.design;
    const label = (x, y, t) => add(this.add.text(x, y, t, { fontSize: '21px', fontStyle: 'bold', color: TEXT }).setDepth(3));
    const swatches = (y, pick, current) => CLAY.forEach((col, i) => {
      const x = 490 + i * 50;
      inkSwatch(this.g, x, y, 17, col, current === col, i + y);
      add(hitZone(this, x, y, 42, 42, () => { this.room.sfx.pop(); pick(col); this.afterChange(); }, 4));
    });
    label(470, 100, 'Body');
    Object.entries(TOY_BODIES).forEach(([id, b], i) => add(inkButton(this, 520 + i * 84, 142, b.name, { w: 78, h: 34, size: 19, fill: d.body === id ? COLORS.gold : CARD, depth: 6, seed: i + 2, onTap: () => { d.body = id; this.afterChange(); } })));
    label(470, 170, 'Clay colour');
    swatches(214, col => { d.color = col; }, d.color);
    label(470, 244, `Parts (up to ${MAX_PARTS})`);
    Object.entries(TOY_PARTS).forEach(([id, p], i) => {
      const on = d.parts.includes(id);
      add(inkButton(this, 520 + (i % 4) * 112, 282 + Math.floor(i / 4) * 38, p.name, { w: 104, h: 34, size: 18, fill: on ? COLORS.gold : CARD, depth: 6, seed: i + 9,
        onTap: () => { if (on) d.parts = d.parts.filter(x => x !== id); else if (d.parts.length < MAX_PARTS) d.parts = [...d.parts, id]; else { this.room.sfx.nope(); return; } this.afterChange(); } }));
    });
    label(470, 346, 'Part colour');
    swatches(392, col => { d.partColor = col; }, d.partColor);
    label(470, 418, 'Face');
    Object.entries(TOY_FACES).forEach(([id, name], i) => add(inkButton(this, 520 + i * 92, 458, name, { w: 86, h: 34, size: 19, fill: d.face === id ? COLORS.gold : CARD, depth: 6, seed: i + 14, onTap: () => { d.face = id; this.afterChange(); } })));
    // toys made before: tap one to make another copy
    const saved = this.room.toyDesigns;
    if (saved.length) {
      add(this.add.text(70, 100, 'Your toys (tap for a copy)', { fontSize: '18px', fontStyle: 'bold', color: TEXT }).setDepth(3));
      saved.forEach((t, i) => {
        const x = 90 + (i % 6) * 54, y = 146 + Math.floor(i / 6) * 54;
        add(this.add.image(x, y, ensureItemTexture(this, toyKey(t.id))).setDisplaySize(50, 50).setDepth(3));
        add(hitZone(this, x, y, 50, 50, () => this.finish({ items: [toyKey(t.id)] }), 4));
      });
    }
    add(inkButton(this, 770, 528, '🧸 Make it!', { w: 220, h: 52, size: 28, fill: COLORS.green, depth: 6, onTap: () => this.craft() }));
  }

  afterChange() { this.room.sfx.pop(); this.redraw(); this.build(); }

  craft() {
    if (this.making) return;
    this.making = true;
    this.poke();
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 160, () => this.room.sfx.pop());
    const id = newToyId(this.room.toyDesigns.map(t => t.id)), toy = { id, name: randomToyName(), ...this.design, parts: [...this.design.parts] };
    this.time.delayedCall(950, () => { this.room.sfx.fanfare(); this.results([`${toy.name} is alive!`, '+2 coins'], { coins: 2, toy, items: [toyKey(id)] }); });
  }
}
