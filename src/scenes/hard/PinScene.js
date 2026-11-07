// A PIN pad. mode 'check' compares with `hash`; mode 'set' asks twice and stores the new PIN. Then `onOk()`.
import { W, H } from '../../config.js';
import { COLORS, TEXT, inkButton } from '../../ui.js';
import { checkPin, hashPin } from '../../systems/mode.js';
import { metaStore } from '../../systems/save.js';
import { backdrop, leave, text } from './overlay.js';

export default class PinScene extends Phaser.Scene {
  constructor() { super('Pin'); }

  init(data) { Object.assign(this, { room: data.room, pinMode: data.mode, hash: data.hash, title: data.title, onOk: data.onOk }); this.entry = ''; this.first = null; }

  create() {
    backdrop(this, 440, 520, 'PIN', { seed: 44 });
    this.prompt = text(this, W / 2, 168, this.title, 20, { align: 'center', wordWrap: { width: 380 } }).setOrigin(0.5, 0);
    this.dots = text(this, W / 2, 238, '', 44, { fontStyle: 'bold' }).setOrigin(0.5);
    this.note = text(this, W / 2, 282, '', 20, { color: '#b0584e' }).setOrigin(0.5);
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', ''];
    keys.forEach((k, i) => {
      if (!k) return;
      inkButton(this, W / 2 - 100 + (i % 3) * 100, 340 + Math.floor(i / 3) * 62, k, { w: 84, h: 52, size: 28, fill: k === '⌫' ? COLORS.grey : COLORS.gold, depth: 5, seed: 30 + i, onTap: () => this.press(k) });
    });
    this.showDots();
  }

  showDots() { this.dots.setText('●'.repeat(this.entry.length) + '○'.repeat(4 - this.entry.length)); }

  press(k) {
    if (k === '⌫') this.entry = this.entry.slice(0, -1);
    else if (this.entry.length < 4) this.entry += k;
    this.showDots();
    if (this.entry.length === 4) this.time.delayedCall(120, () => this.submit());
  }

  submit() { return this.pinMode === 'set' ? this.submitSet() : this.submitCheck(); }

  submitCheck() {
    if (checkPin(this.entry, this.hash)) return this.onOk();
    this.entry = ''; this.showDots(); this.note.setText('That is not it. Try again.');
    this.tweens.add({ targets: this.dots, x: W / 2 + 8, duration: 50, yoyo: true, repeat: 3 });
  }

  submitSet() {
    if (!this.first) { this.first = this.entry; this.entry = ''; this.showDots(); this.prompt.setText('Enter it again to confirm'); return; }
    if (this.entry !== this.first) { this.first = null; this.entry = ''; this.showDots(); this.prompt.setText(this.title); this.note.setText('They did not match. Start again.'); return; }
    metaStore.set({ pin: hashPin(this.entry) });
    this.onOk();
  }
}
