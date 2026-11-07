// The recipe book: an overlay listing every recipe. Cooked ones show their
// ingredients; the rest show a hint and how many ingredients they need.
import { W, H } from '../config.js';
import { iconButton } from '../ui.js';
import { CATALOG } from '../data/items.js';
import { RECIPES } from '../data/recipes.js';
import { itemIcon } from '../systems/itemTextures.js';

const ink = '#4a3426';
const text = (size, extra = {}) => ({ fontSize: `${size}px`, color: ink, ...extra });

export default class BookScene extends Phaser.Scene {
  constructor() { super('Book'); }

  init(data) { this.room = data.room; }

  create() {
    const known = this.room.discovered;
    this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive();
    this.add.rectangle(W / 2, H / 2, 900, 540, 0xfff4e0).setStrokeStyle(6, 0xe3c9a0);
    this.add.text(60, 52, '📖 Recipe Book', text(30, { fontStyle: 'bold' }));
    this.add.text(W / 2 + 40, 58, `${known.size} / ${RECIPES.length} found`, text(20));
    iconButton(this, W - 70, 62, '✖', () => this.close(), 0);
    this.add.text(60, 100, 'Drop ingredients into the oven in the kitchen. Try different mixes!', text(15, { fontStyle: 'italic' }));
    this.input.keyboard.on('keydown-ESC', () => this.close());

    RECIPES.forEach((r, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 50 + col * 440, y = 130 + row * 52;
      const got = known.has(r.id);
      this.add.rectangle(x + 205, y + 22, 420, 46, got ? 0xffffff : 0xefe3cc).setStrokeStyle(2, got ? 0xe0a030 : 0xcdbd9e);
      const result = got ? itemIcon(this, r.result, x + 28, y + 22, 42) : this.add.text(x + 28, y + 22, '❓', { fontSize: '30px' }).setOrigin(0.5).setAlpha(0.6);
      this.add.text(x + 56, y + 6, got ? r.name : '???', text(15, { fontStyle: 'bold' }));
      if (got) {
        r.ingredients.forEach((k, n) => {
          itemIcon(this, k, x + 68 + n * 52, y + 34, 28);
          if (n) this.add.text(x + 42 + n * 52, y + 33, '+', text(14, { fontStyle: 'bold' })).setOrigin(0.5);
        });
      } else {
        this.add.text(x + 56, y + 25, `${r.ingredients.length} ingredient${r.ingredients.length > 1 ? 's' : ''} — ${r.hint}`, text(12));
      }
    });
  }

  close() {
    this.scene.resume('Room');
    this.scene.stop();
  }
}
