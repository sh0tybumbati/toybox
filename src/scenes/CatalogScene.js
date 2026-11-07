// The furniture catalogue: an overlay over the paused room. Tap a piece to add it.
import { W, H } from '../config.js';
import { iconButton } from '../ui.js';
import { penFor } from '../data/inkpen.js';
import { PROP_TYPES } from '../data/props.js';

const ink = '#4a3426';
const text = (size, extra = {}) => ({ fontSize: `${size}px`, color: ink, ...extra });
const BLURB = {
  storage: 'Holds your things', dispenser: 'Hands out surprises', oven: 'Cooks recipes',
  switch: 'Day / night', bell: 'Ding!', connector: 'Go to another floor', bed: 'Sleepy time', pets: 'Pets live here',
};
const COLS = 5, CARD_W = 164, CARD_H = 132;

export default class CatalogScene extends Phaser.Scene {
  constructor() { super('Catalog'); }

  init(data) { this.room = data.room; }

  create() {
    this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive();
    this.add.rectangle(W / 2, H / 2, 900, 540, 0xfff4e0).setStrokeStyle(6, 0xe3c9a0);
    this.add.text(60, 52, '🛋️ Furniture catalogue', text(30, { fontStyle: 'bold' }));
    const n = this.room.props.length;
    this.add.text(W / 2 + 120, 62, `${n} / ${this.room.furnitureLimit()} on this floor`, text(18));
    iconButton(this, W - 70, 62, '✖', () => this.close(null), 0);
    this.input.keyboard.on('keydown-ESC', () => this.close(null));

    Object.entries(PROP_TYPES).forEach(([type, def], i) => {
      const col = i % COLS, row = Math.floor(i / COLS);
      const cx = 50 + CARD_W / 2 + col * (CARD_W + 7), cy = 108 + CARD_H / 2 + row * (CARD_H + 8);
      this.add.rectangle(cx, cy, CARD_W, CARD_H, 0xffffff).setStrokeStyle(3, 0xe0a030)
        .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.close(type));
      const art = this.add.graphics().setPosition(cx, cy - 16);
      def.draw(penFor(art, type), def.behaviour === 'switch');                      // the piece itself, as a preview
      art.setScale(Math.min(1, 80 / def.w, 70 / def.h));
      this.add.text(cx, cy + 38, def.name, text(15, { fontStyle: 'bold' })).setOrigin(0.5);
      this.add.text(cx, cy + 55, BLURB[def.behaviour] || '', text(12)).setOrigin(0.5);
    });
  }

  close(type) {
    const room = this.room;
    this.scene.resume('Room');
    this.scene.stop();
    if (type) room.addFurniture(type);
  }
}
