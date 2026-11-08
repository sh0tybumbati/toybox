// Character creator: an overlay on top of the (paused) room. Edits the real
// characters live; the big preview on the left is a clone that reacts to the pointer.
import { W, H } from '../config.js';
import Character from '../entities/Character.js';
import {
  SKIN_TONES, HAIR_COLORS, SHIRT_COLORS, PANTS_COLORS, SHOE_COLORS, HAIR_STYLES, randomLook,
} from '../data/look.js';
import { freshId, freshName } from '../data/characters.js';
import { CARD, COLORS, hitZone, inkButton, inkPanel, inkSwatch } from '../ui.js';
import { blob, inkFill } from '../data/ink.js';

const INK = '#3a2a22';
const label = { fontSize: '21px', color: INK, fontStyle: 'bold' };

export default class CreatorScene extends Phaser.Scene {
  constructor() { super('Creator'); }

  init(data) {
    this.room = data.room;
    this.index = 0;
    this.dyn = [];                 // everything rebuilt by build()
    this.preview = null;
    this.needsBuild = true;
  }

  create() {
    this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive();   // blocks the room underneath
    inkPanel(this, W / 2, H / 2, 892, 534, { seed: 13 });
    const stage = this.add.graphics();                                              // the preview platform
    inkFill(stage, blob(240, 520, 120, 17, { n: 20, amp: 0.05, seed: 3 }), 0xe6d3b3, { w: 3.4, seed: 3, heavy: 0 });
  }

  update(time) {
    if (this.needsBuild) { this.needsBuild = false; this.build(); }
    if (this.preview) {
      const p = this.input.activePointer;
      this.preview.animate(time, p.x, p.y);
    }
  }

  get current() { return this.room.characters[this.index]; }

  track(obj) { this.dyn.push(obj); return obj; }

  button(x, y, w, text, fill, onClick) {
    return this.track(inkButton(this, x, y, text, { w, h: 40, fill, size: 20, onTap: onClick, depth: 6, seed: Math.round(x + y) }));
  }

  // Edit the selected character's look: copy, change, apply live, rebuild the UI.
  edit(change) {
    const c = this.current, look = { ...c.look, hair: { ...c.look.hair } };
    change(look);
    c.applyLook(look);
    this.needsBuild = true;
  }

  swatches(title, y, colors, selected, onPick, { x = 470, pitch = 47, r = 21 } = {}) {
    this.track(this.add.text(x, y, title, { ...label, fontSize: r < 20 ? '19px' : '21px' }).setDepth(2));
    colors.forEach((color, i) => {
      const sx = x + 16 + i * pitch, sy = y + r + 24;
      inkSwatch(this.sg, sx, sy, r, color, color === selected, i + Math.round(y));
      this.track(hitZone(this, sx, sy, r * 2 + 6, r * 2 + 6, () => onPick(color), 3));
    });
  }

  build() {
    this.dyn.forEach(o => o.destroy());
    this.dyn = [];
    const room = this.room, c = this.current;
    this.sg = this.track(this.add.graphics().setDepth(2));                          // this build's swatches

    // Party chips (+ add friend)
    room.characters.forEach((ch, i) => {
      const chip = this.button(112 + i * 92, 62, 86, ch.name, ch.look.shirt, () => { this.index = i; this.needsBuild = true; });
      chip.setScale(i === this.index ? 1.14 : 0.94);                               // the one being edited is bigger
    });
    if (room.canAddCharacter()) {
      this.button(124 + room.characters.length * 92, 62, 104, '➕ Friend', COLORS.green, () => {
        const party = room.characters.map(x => ({ id: x.id, name: x.name }));
        room.addCharacter({ id: freshId(party), name: freshName(party), look: randomLook(Math.random, { adult: Boolean(room.hard) }) });
        this.index = room.characters.length - 1;
        this.needsBuild = true;
      });
    }

    // Actions
    this.button(596, 62, 120, '🎲 Random', COLORS.gold, () => this.edit(look => Object.assign(look, randomLook(Math.random, { adult: Boolean(room.hard) }))));
    if (room.characters.length > 1) {
      this.button(716, 62, 104, '🗑 Leave', COLORS.red, () => {
        room.removeCharacter(c);
        this.index = Math.min(this.index, room.characters.length - 1);
        this.needsBuild = true;
      });
    }
    this.button(852, 62, 118, '✔ Done', COLORS.green, () => this.close());

    // Preview (a clone; tap it for a giggle)
    this.preview = this.track(new Character(this, { id: 'preview', name: c.name, look: c.look, x: 240 }));
    this.preview.disableInteractive();
    const big = this.preview.look.age === 'adult' ? 1.0 : 1.3;               // grown-ups are taller: smaller on the stage
    this.preview.setScale(big).setPosition(240, 515 - this.preview.foot()).setDepth(5);
    this.track(this.add.text(240, 108, c.name, { ...label, fontSize: '34px' }).setOrigin(0.5).setDepth(2));
    this.track(this.add.rectangle(240, 340, 220, 380, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.preview.setExpression('giggle');
        room.sfx.giggle();
        this.time.delayedCall(900, () => this.preview && this.preview.active && this.preview.setExpression('neutral'));
      }));

    // Controls
    const look = c.look;
    const ages = this.room.hard ? [['adult', '🧑 Grown-up']] : [['kid', '🧒 Kid'], ['adult', '🧑 Grown-up']];      // hard mode: adults only
    for (const [i, [age, text]] of ages.entries()) {
      this.button(560 + i * 176, 112, 166, text, look.age === age ? COLORS.gold : CARD, () => this.edit(l => { l.age = age; }));
    }
    this.swatches('Skin', 138, SKIN_TONES, look.skin, color => this.edit(l => { l.skin = color; }), { r: 18, pitch: 42 });

    this.track(this.add.text(470, 206, 'Hair style', { ...label, fontSize: '21px' }).setDepth(2));
    Object.entries(HAIR_STYLES).forEach(([key, style], i) => {
      const on = key === look.hair.style;
      this.button(514 + (i % 5) * 90, 254 + Math.floor(i / 5) * 46, 84, style.label, on ? COLORS.gold : CARD,
        () => this.edit(l => { l.hair.style = key; }));
    });

    this.swatches('Hair colour', 334, HAIR_COLORS, look.hair.color, color => this.edit(l => { l.hair.color = color; }), { r: 18, pitch: 42 });
    this.swatches('Shirt', 400, SHIRT_COLORS, look.shirt, color => this.edit(l => { l.shirt = color; }), { r: 18, pitch: 42 });
    this.swatches('Trousers', 466, PANTS_COLORS, look.pants, color => this.edit(l => { l.pants = color; }), { r: 14, pitch: 34 });
    this.swatches('Shoes', 466, SHOE_COLORS, look.shoe, color => this.edit(l => { l.shoe = color; }), { x: 700, r: 14, pitch: 34 });
  }

  close() {
    const room = this.room;
    this.scene.resume('Room');
    room.afterCreator();
    this.scene.stop();
  }
}
