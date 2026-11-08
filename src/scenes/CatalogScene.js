// The furniture catalogue: an overlay over the paused room. Tap a piece to add it.
import { W, H } from '../config.js';
import { CARD, hitZone, iconButton, inkButton, inkPanel, leftText } from '../ui.js';
import { penFor } from '../data/inkpen.js';
import { PROP_TYPES } from '../data/props.js';
import { ROOMS } from '../data/rooms.js';

const ink = '#4a3426';
const text = (size, extra = {}) => ({ fontSize: `${size}px`, color: ink, ...extra });
const BLURB = {
  storage: 'Holds your things', dispenser: 'Hands out surprises', oven: 'Cooks recipes',
  switch: 'Day / night', bell: 'Ding!', connector: 'Go to another floor', station: 'A game to play', mail: 'Post things away', bed: 'Sleepy time', pets: 'Pets live here',
};
export const TABS = [['home', '🏠 Home'], ['storage', '🧺 Storage'], ['play', '🛝 Park & play'], ['town', '🏙️ Town']];
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

    this.cards = [];
    this.tabs = TABS.map(([cat, label], i) => inkButton(this, 150 + i * 200, 106, label, { w: 184, h: 38, size: 19, depth: 1, seed: 20 + i, onTap: () => this.showTab(cat) }));
    const outdoor = ROOMS[this.room.currentRoomType()]?.outdoor;
    this.showTab(outdoor ? 'play' : 'home');
  }

  // One tab of the catalogue: three rows of pieces.
  showTab(cat) {
    this.cards.forEach(o => o.destroy());
    this.cards = [];
    TABS.forEach(([c], i) => this.tabs[i].setAlpha(c === cat ? 1 : 0.55));
    const keep = o => { this.cards.push(o); return o; };
    Object.entries(PROP_TYPES).filter(([, d]) => d.cat === cat && (!d.hardOnly || this.room.hard) && (!d.gear || (this.room.hard && this.room.hard.gear[d.gear] > 0))).slice(0, COLS * 3).forEach(([type, def], i) => {
      const col = i % COLS, row = Math.floor(i / COLS);
      const cx = 50 + CARD_W / 2 + col * (CARD_W + 8), cy = 148 + CARD_H / 2 + row * (CARD_H + 8);
      keep(inkPanel(this, cx, cy, CARD_W, CARD_H, { fill: CARD, radius: 14, shadow: false, weight: 3, seed: i + 40 }));
      keep(hitZone(this, cx, cy, CARD_W, CARD_H, () => this.close(type)));
      const art = keep(this.add.graphics().setPosition(cx, cy - 16));
      def.draw(penFor(art, type), def.behaviour === 'switch');                      // the piece itself, as a preview
      art.setScale(Math.min(1, 74 / def.w, 66 / def.h));
      keep(this.add.text(cx, cy + 34, def.gear ? `${def.name} ×${this.room.hard.gear[def.gear]}` : def.name, text(16, { fontStyle: 'bold' })).setOrigin(0.5));
      keep(this.add.text(cx, cy + 51, def.blurb || BLURB[def.behaviour] || '', text(13)).setOrigin(0.5));
    });
  }

  close(type) {
    const room = this.room;
    this.scene.resume('Room');
    this.scene.stop();
    const gear = type && PROP_TYPES[type].gear;
    if (gear) {                                                    // grow gear you bought: one comes out of the household's stock
      if (!(room.hard && room.hard.gear[gear] > 0)) return;
      if (!room.addFurniture(type)) return;
      room.hard.gear = { ...room.hard.gear, [gear]: room.hard.gear[gear] - 1 };
    } else if (type) room.addFurniture(type);
  }
}
