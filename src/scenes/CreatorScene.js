// Character creator: an overlay on top of the (paused) room. Edits the real
// characters live; the big preview on the left is a clone that reacts to the pointer.
import { W, H } from '../config.js';
import Character from '../entities/Character.js';
import {
  SKIN_TONES, HAIR_COLORS, SHIRT_COLORS, PANTS_COLORS, SHOE_COLORS, HAIR_STYLES, randomLook,
} from '../data/look.js';
import { freshId, freshName } from '../data/characters.js';

const INK = '#4a3426';
const label = { fontSize: '18px', color: INK, fontStyle: 'bold' };

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
    this.add.rectangle(W / 2, H / 2, 880, 520, 0xfff4e0).setStrokeStyle(6, 0xe3c9a0);
    this.add.ellipse(240, 515, 230, 34, 0xe6d3b3);                                 // preview platform
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
    const r = this.track(this.add.rectangle(x, y, w, 44, fill).setStrokeStyle(3, 0x4a3426)
      .setInteractive({ useHandCursor: true }).on('pointerdown', onClick));
    this.track(this.add.text(x, y, text, { ...label, fontSize: '16px' }).setOrigin(0.5));
    return r;
  }

  // Edit the selected character's look: copy, change, apply live, rebuild the UI.
  edit(change) {
    const c = this.current, look = { ...c.look, hair: { ...c.look.hair } };
    change(look);
    c.applyLook(look);
    this.needsBuild = true;
  }

  swatches(title, y, colors, selected, onPick, { x = 470, pitch = 47, r = 21 } = {}) {
    this.track(this.add.text(x, y, title, { ...label, fontSize: r < 20 ? '16px' : '18px' }));
    colors.forEach((color, i) => {
      const on = color === selected;
      this.track(this.add.circle(x + 16 + i * pitch, y + r + 22, r, color)
        .setStrokeStyle(on ? 5 : 2, on ? 0x222222 : 0xffffff)
        .setInteractive({ useHandCursor: true }).on('pointerdown', () => onPick(color)));
    });
  }

  build() {
    this.dyn.forEach(o => o.destroy());
    this.dyn = [];
    const room = this.room, c = this.current;

    // Party chips (+ add friend)
    room.characters.forEach((ch, i) => {
      const on = i === this.index;
      this.track(this.add.rectangle(112 + i * 92, 62, 84, 44, ch.look.shirt).setStrokeStyle(on ? 5 : 2, 0x4a3426)
        .setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.index = i; this.needsBuild = true; }));
      this.track(this.add.text(112 + i * 92, 62, ch.name, { ...label, fontSize: '14px' }).setOrigin(0.5));
    });
    if (room.canAddCharacter()) {
      this.button(112 + room.characters.length * 92, 62, 84, '➕ Friend', 0xdff5d8, () => {
        const party = room.characters.map(x => ({ id: x.id, name: x.name }));
        room.addCharacter({ id: freshId(party), name: freshName(party), look: randomLook() });
        this.index = room.characters.length - 1;
        this.needsBuild = true;
      });
    }

    // Actions
    this.button(630, 62, 100, '🎲 Random', 0xffe9a8, () => this.edit(look => Object.assign(look, randomLook())));
    if (room.characters.length > 1) {
      this.button(730, 62, 80, '🗑 Leave', 0xffd0d0, () => {
        room.removeCharacter(c);
        this.index = Math.min(this.index, room.characters.length - 1);
        this.needsBuild = true;
      });
    }
    this.button(850, 62, 110, '✔ Done', 0xb8ecb0, () => this.close());

    // Preview (a clone; tap it for a giggle)
    this.preview = this.track(new Character(this, { id: 'preview', name: c.name, look: c.look, x: 240 }));
    this.preview.disableInteractive();
    const big = this.preview.look.age === 'adult' ? 1.0 : 1.3;               // grown-ups are taller: smaller on the stage
    this.preview.setScale(big).setPosition(240, 515 - this.preview.foot()).setDepth(5);
    this.track(this.add.text(240, 100, c.name, { ...label, fontSize: '28px' }).setOrigin(0.5));
    this.track(this.add.rectangle(240, 340, 220, 380, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.preview.setExpression('giggle');
        room.sfx.giggle();
        this.time.delayedCall(900, () => this.preview && this.preview.active && this.preview.setExpression('neutral'));
      }));

    // Controls
    const look = c.look;
    for (const [i, [age, text]] of [['kid', '🧒 Kid'], ['adult', '🧑 Grown-up']].entries()) {
      this.button(560 + i * 170, 112, 160, text, look.age === age ? 0xffd166 : 0xffffff, () => this.edit(l => { l.age = age; }));
    }
    this.swatches('Skin', 138, SKIN_TONES, look.skin, color => this.edit(l => { l.skin = color; }), { r: 18, pitch: 42 });

    this.track(this.add.text(470, 208, 'Hair style', { ...label, fontSize: '16px' }));
    Object.entries(HAIR_STYLES).forEach(([key, style], i) => {
      const on = key === look.hair.style;
      this.button(512 + (i % 5) * 88, 252 + Math.floor(i / 5) * 48, 82, style.label, on ? 0xffd166 : 0xffffff,
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
