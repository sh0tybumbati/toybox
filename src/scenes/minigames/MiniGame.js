// Base class for the mini-games: a full overlay over the paused room with a hand-inked frame, a title and a close
// button. A game calls finish(result) when it's over (result = null if abandoned); the room is resumed and told.
import { W, H } from '../../config.js';
import { COLORS, TEXT, iconButton, inkButton, inkPanel, leftText } from '../../ui.js';
import { MINIGAMES } from '../../data/minigames.js';

export default class MiniGame extends Phaser.Scene {
  init(data) {
    this.room = data.room; this.prop = data.prop; this.gameId = data.game;
    this.over = false;
  }

  // The frame: dim backdrop, panel, title, close button. Returns the play area { x, y, w, h }.
  frame(subtitle = '') {
    this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive();
    inkPanel(this, W / 2, H / 2, 920, 560, { seed: 31 });
    leftText(this, 54, 50, MINIGAMES[this.gameId].name, { fontSize: '36px', fontStyle: 'bold' });
    if (subtitle) this.add.text(W / 2 + 40, 42, subtitle, { fontSize: '21px', color: TEXT });
    iconButton(this, W - 56, 50, '✖', () => this.finish(null), 100);
    this.input.keyboard.on('keydown-ESC', () => this.finish(null));
    return { x: 54, y: 88, w: 852, h: 424 };
  }

  // The "all done" card: what you got, and a button to go back.
  results(lines, result) {
    this.add.rectangle(0, 0, W, H, 0x000000, 0.35).setOrigin(0).setInteractive().setDepth(200);
    inkPanel(this, W / 2, H / 2, 480, 300, { depth: 201, seed: 33 });
    this.add.text(W / 2, H / 2 - 100, 'All done!', { fontSize: '40px', fontStyle: 'bold', color: TEXT }).setOrigin(0.5).setDepth(202);
    lines.forEach((l, i) => this.add.text(W / 2, H / 2 - 40 + i * 34, l, { fontSize: '26px', color: TEXT }).setOrigin(0.5).setDepth(202));
    inkButton(this, W / 2, H / 2 + 100, '✔ Done', { w: 180, h: 52, size: 26, fill: COLORS.green, depth: 203, onTap: () => this.finish(result) });
  }

  finish(result) {
    if (this.over) return;
    this.over = true;
    this.scene.resume('Room');
    this.scene.stop();
    this.room.onGameResult(this.gameId, result, this.prop);
  }
}
