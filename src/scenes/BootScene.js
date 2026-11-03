import { saveStore } from '../systems/save.js';
import { W, H, FONT } from '../config.js';

// Loads the save (async: IndexedDB), then hands it to the room scene.
// Later passes: preload art here and route through a Hub (world map).
export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.add.text(W / 2, H / 2, 'Loading…', { fontSize: '28px', color: '#ffffff' })
      .setOrigin(0.5);
    // Load the save and the emoji font together; never wait more than ~2s for the font.
    const font = Promise.race([
      document.fonts ? document.fonts.load('32px "Noto Color Emoji"', '🍎🧸').catch(() => null) : null,
      new Promise(r => setTimeout(r, 2000)),
    ]);
    Promise.all([saveStore.load(), font]).then(([save]) => this.scene.start('Room', { save }));
  }
}
