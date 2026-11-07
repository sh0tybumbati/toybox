// The TV's console: a shelf of game cartridges with your best scores. Tap one to play it.
import { W, H } from '../../config.js';
import MiniGame from './MiniGame.js';
import { ARCADE_GAMES } from '../../data/minigames.js';
import { CARD, COLORS, TEXT, hitZone, inkPanel } from '../../ui.js';
import { iconImage } from '../../systems/itemTextures.js';

export default class ConsoleScene extends MiniGame {
  constructor() { super('Console'); }

  create() {
    this.frame();
    this.add.text(W / 2, 112, 'Pick a cartridge', { fontSize: '30px', color: TEXT }).setOrigin(0.5).setDepth(3);
    Object.entries(ARCADE_GAMES).forEach(([id, game], i) => {
      const x = 150 + i * 220, y = 320, best = this.room.scores[id] || 0;
      inkPanel(this, x, y, 196, 270, { fill: [0xf2b3c2, 0xa9d3ee, 0xa8dcc0, 0xf3d98b][i % 4], depth: 2, seed: 40 + i, radius: 18, weight: 4 });
      inkPanel(this, x, y - 20, 150, 120, { fill: CARD, depth: 3, seed: 50 + i, radius: 12, shadow: false, weight: 3 });
      iconImage(this, game.icon.startsWith('item:') || game.icon.startsWith('icon-') ? game.icon : game.icon, x, y - 22, 92).setDepth(4);
      this.add.text(x, y + 58, game.name, { fontSize: '26px', fontStyle: 'bold', color: TEXT }).setOrigin(0.5).setDepth(4);
      this.add.text(x, y + 88, game.blurb, { fontSize: '16px', color: TEXT, align: 'center', wordWrap: { width: 170 } }).setOrigin(0.5, 0).setDepth(4);
      this.add.text(x, y - 112, best ? `Best: ${best}` : 'New!', { fontSize: '21px', fontStyle: 'bold', color: '#7a5a1a' }).setOrigin(0.5).setDepth(4);
      hitZone(this, x, y, 196, 270, () => this.play(id), 6);
    });
  }

  play(id) {
    this.room.sfx.pop();
    this.scene.start(ARCADE_GAMES[id].scene, { room: this.room, prop: this.prop, game: 'arcade' });
  }
}
