// The bank (for now): swap kid-mode coins and hard-mode cash at 1 coin = 100 cash, either way.
import { W } from '../../config.js';
import { COLORS, TEXT, inkButton } from '../../ui.js';
import { exchange } from '../../systems/mode.js';
import { saveStore } from '../../systems/save.js';
import { backdrop, text } from './overlay.js';

export default class BankScene extends Phaser.Scene {
  constructor() { super('Bank'); }

  init(data) { this.room = data.room; this.kid = null; }

  async create() {
    backdrop(this, 620, 440, 'Bank', { seed: 46 });
    text(this, W / 2, 168, '1 coin = 100 cash, both ways', 20, { color: '#7a6a58' }).setOrigin(0.5);
    this.cashText = text(this, W / 2, 218, '', 30, { fontStyle: 'bold' }).setOrigin(0.5);
    this.coinText = text(this, W / 2, 262, 'Kid-mode coins: …', 26).setOrigin(0.5);
    this.note = text(this, W / 2, 304, '', 20, { color: '#b0584e' }).setOrigin(0.5);
    [1, 5, 20].forEach((n, i) => {
      inkButton(this, W / 2 - 170 + i * 170, 372, `+${n} 🪙 → cash`, { w: 150, h: 46, size: 18, fill: COLORS.green, depth: 5, seed: 60 + i, onTap: () => this.swap('toCash', n) });
      inkButton(this, W / 2 - 170 + i * 170, 428, `cash → ${n} 🪙`, { w: 150, h: 46, size: 18, fill: COLORS.gold, depth: 5, seed: 70 + i, onTap: () => this.swap('toCoins', n) });
    });
    this.kid = await saveStore.load();                         // the kid world's coins live in its own save
    this.show();
  }

  show() {
    this.cashText.setText(`Cash: $ ${this.room.cash.toLocaleString('en-US')}`);
    this.coinText.setText(this.kid ? `Kid-mode coins: ${this.kid.coins}` : 'No kid world saved yet');
  }

  async swap(direction, n) {
    if (!this.kid) { this.note.setText('There is no kid world to swap with yet.'); return; }
    const r = exchange({ coins: this.kid.coins, cash: this.room.cash }, direction, n);
    if (!r) { this.room.sfx.nope(); this.note.setText(direction === 'toCash' ? 'Not enough coins.' : 'Not enough cash.'); return; }
    this.note.setText('');
    this.kid.coins = r.coins;
    this.room.cash = r.cash;
    await saveStore.save(this.kid);
    this.room.updateNav(); this.room.dirty = true; this.room.sfx.coin();
    this.show();
  }
}
