// Room scene mixin — Mini-games: stations launch them, results come back here (coins, items, designs).
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { MINIGAMES } from '../../data/minigames.js';
import { floatText } from '../../systems/interactions.js';
import { spawnFront } from '../../systems/spawn.js';

export const gameMethods = {
  // Tap on a station: pause the room and run the game as an overlay.
  openGame(id, prop) {
    const def = MINIGAMES[id];
    if (!def || this.switching || this.decor) return;
    this.hideTip();
    this.sfx.pop();
    if (prop) prop.setState(true);
    this.scene.pause();
    this.scene.launch(def.scene, { room: this, prop, game: id });
  },

  // A game finished (result = null if the player just closed it). Hand out what was won.
  onGameResult(id, result, prop) {
    if (prop && prop.active) prop.setState(false);
    this.lastActive = this.time.now;
    this.refreshTip();
    if (!result) return;
    const at = prop && prop.active ? prop : { x: this.cameras.main.scrollX + 480, y: 440, def: { h: 100 } };
    if (result.coins) {
      this.coins += result.coins;
      this.updateNav();
      this.sfx.coin();
      floatText(this, at.x, at.y - at.def.h / 2 - 50, `+${result.coins} 🪙`, 30);
    }
    (result.items || []).forEach((key, i) => this.time.delayedCall(250 + i * 220, () => { if (this.zone && at.active !== false) spawnFront(this, key, at, 80); }));
    if (this.applyGameResult) this.applyGameResult(id, result);
    this.dirty = true;
  },
};
