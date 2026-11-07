// The furniture catalogue: an overlay over the paused room. Tap a piece to add it.
import { W, H } from '../config.js';
import { CARD, hitZone, iconButton, inkPanel, leftText } from '../ui.js';
import { penFor } from '../data/inkpen.js';
import { PROP_TYPES } from '../data/props.js';

const ink = '#4a3426';
const text = (size, extra = {}) => ({ fontSize: `${size}px`, color: ink, ...extra });
const BLURB = {
  storage: 'Holds your things', dispenser: 'Hands out surprises', oven: 'Cooks recipes',
  switch: 'Day / night', bell: 'Ding!', connector: 'Go to another floor', station: 'A game to play', mail: 'Post things away', bed: 'Sleepy time', pets: 'Pets live here',
};
const COLS = 6, CARD_W = 138, CARD_H = 124;

export default class CatalogScene extends Phaser.Scene {
  constructor() { super('Catalog'); }

  init(data) { this.room = data.room; }

  create() {
    this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive();
    inkPanel(this, W / 2, H / 2, 900, 546, { seed: 11 });
    leftText(this, 60, 62, '🛋️ Furniture catalogue', { fontSize: '34px', fontStyle: 'bold' });
    const n = this.room.props.length;
    this.add.text(W / 2 + 120, 50, `${n} / ${this.room.furnitureLimit()} on this floor`, text(22));
    iconButton(this, W - 70, 62, '✖', () => this.close(null), 0);
    this.input.keyboard.on('keydown-ESC', () => this.close(null));

    Object.entries(PROP_TYPES).forEach(([type, def], i) => {
      const col = i % COLS, row = Math.floor(i / COLS);
      const cx = 50 + CARD_W / 2 + col * (CARD_W + 8), cy = 104 + CARD_H / 2 + row * (CARD_H + 8);
      inkPanel(this, cx, cy, CARD_W, CARD_H, { fill: CARD, radius: 14, shadow: false, weight: 3, seed: i + 40 });
      hitZone(this, cx, cy, CARD_W, CARD_H, () => this.close(type));
      const art = this.add.graphics().setPosition(cx, cy - 16);
      def.draw(penFor(art, type), def.behaviour === 'switch');                      // the piece itself, as a preview
      art.setScale(Math.min(1, 74 / def.w, 66 / def.h));
      this.add.text(cx, cy + 34, def.name, text(16, { fontStyle: 'bold' })).setOrigin(0.5);
      this.add.text(cx, cy + 51, BLURB[def.behaviour] || '', text(13)).setOrigin(0.5);
    });
  }

  close(type) {
    const room = this.room;
    this.scene.resume('Room');
    this.scene.stop();
    if (type) room.addFurniture(type);
  }
}
