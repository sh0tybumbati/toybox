// Room scene mixin — Mini-games: stations launch them, results come back here (coins, items, designs).
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { MINIGAMES } from '../../data/minigames.js';
import { floatText } from '../../systems/interactions.js';
import { spawnFront } from '../../systems/spawn.js';
import { registerToy } from '../../data/toys.js';
import { furnKey } from '../../systems/ikea.js';

export const gameMethods = {
  // Tap on a station: pause the room and run the game as an overlay.
  openGame(id, prop) {
    const def = MINIGAMES[id];
    if (!def || this.switching || this.decor) return;
    this.tipEvent('play');
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
    if (result.spend) {                                       // paid for something (a flat-pack)
      this.coins -= result.spend;
      this.updateNav();
      floatText(this, at.x, at.y - at.def.h / 2 - 20, `-${result.spend} 🪙`, 28);
    }
    if (result.coins) {
      this.coins += result.coins;
      this.updateNav();
      this.sfx.coin();
      floatText(this, at.x, at.y - at.def.h / 2 - 50, `+${result.coins} 🪙`, 30);
    }
    (result.items || []).forEach((key, i) => this.time.delayedCall(250 + i * 220, () => { if (this.zone && at.active !== false) spawnFront(this, key, at, 80); }));
    this.applyGameResult(id, result, prop);
    this.dirty = true;
  },

  // Games that hand back more than coins and items: a shirt design, a sculpted toy.
  applyGameResult(id, result, prop) {
    if (result.game && Number.isFinite(result.score)) this.scores[result.game] = Math.max(this.scores[result.game] || 0, Math.floor(result.score));     // arcade high scores
    if (result.shirt) {
      const kid = this.selected || this.characters[0], design = result.shirt;
      kid.applyLook({ ...kid.look, shirt: design.color, pattern: design.pattern });
      const same = s => s.color === design.color && JSON.stringify(s.pattern) === JSON.stringify(design.pattern);
      this.shirtDesigns = [design, ...this.shirtDesigns.filter(s => !same(s))].slice(0, 8);
      floatText(this, kid.x, kid.headTopY() + 60, '✨', 56);
    }
    if (result.furniture && this.zone) this.openMailPicker(this.props.includes(prop) ? prop : this.props.find(p => p.def.fee), furnKey(result.furniture));     // built: now where should the van take it?
    if (result.toy) {
      registerToy(result.toy);
      this.toyDesigns = [...this.toyDesigns, result.toy].slice(-12);
    }
  },
};
