import { metaStore, storeFor } from '../systems/save.js';
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
      document.fonts ? Promise.all([document.fonts.load('32px "Noto Color Emoji"', '🍎🧸'), document.fonts.load('24px "Patrick Hand"', 'Aa')]).catch(() => null) : null,
      new Promise(r => setTimeout(r, 2000)),
    ]);
    // The active mode picks the save. Hard mode without a hard save (wiped, or never started) falls back to kid mode.
    const mode = metaStore.get().mode;
    Promise.all([storeFor(mode).load(), font]).then(async ([save]) => {
      if (mode === 'hard' && !(save && save.hard)) { metaStore.set({ mode: 'kid' }); save = await storeFor('kid').load(); }
      this.scene.start('Room', { save });
    });
  }
}
