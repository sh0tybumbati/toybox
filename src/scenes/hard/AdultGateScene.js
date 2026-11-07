// The adult gate: says plainly what hard mode is, then asks for a PIN (made now if there isn't one).
import { W, H } from '../../config.js';
import { COLORS, TEXT, inkButton } from '../../ui.js';
import { hardStore, metaStore } from '../../systems/save.js';
import { backdrop, leave, text } from './overlay.js';

export default class AdultGateScene extends Phaser.Scene {
  constructor() { super('AdultGate'); }

  init(data) { this.room = data.room; }

  create() {
    backdrop(this, 700, 440, 'Adults only', { seed: 43 });
    const copy = 'This switches Toybox to a mature life sim: money, rent and bills, hunger, homelessness, crime, police, violence and addiction. It is drawn in the same cartoon style and everything in it is made up, but it is not for children.\n\nIt keeps its own separate save. Your kid world stays exactly as you left it.';
    text(this, W / 2, 190, copy, 21, { align: 'center', lineSpacing: 6, wordWrap: { width: 600 } }).setOrigin(0.5, 0);
    inkButton(this, W / 2 - 150, 440, 'I am an adult', { w: 250, h: 52, size: 24, fill: COLORS.green, depth: 5, onTap: () => this.proceed() });
    inkButton(this, W / 2 + 150, 440, 'Back', { w: 180, h: 52, size: 24, fill: COLORS.grey, depth: 5, onTap: () => leave(this) });
  }

  async proceed() {
    const room = this.room, pin = metaStore.get().pin, existing = await hardStore.load();
    const next = () => (existing && existing.hard
      ? (metaStore.set({ mode: 'hard' }), room.save(), setTimeout(() => location.reload(), 150))
      : room.scene.start('HardSetup', { room }));
    if (pin) this.scene.start('Pin', { room, mode: 'check', hash: pin, title: 'Enter your PIN', onOk: next });
    else this.scene.start('Pin', { room, mode: 'set', title: 'Choose a 4-digit PIN (it keeps children out)', onOk: next });
  }
}
