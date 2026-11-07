// Little Toybox — entry point. Everything lives in src/ as ES modules
// (serve over HTTP: `npm start` or `python -m http.server`). Phaser comes from the CDN.
import { W, H, FONT } from './src/config.js';
import BootScene from './src/scenes/BootScene.js';
import RoomScene from './src/scenes/RoomScene.js';
import CreatorScene from './src/scenes/CreatorScene.js';
import HubScene from './src/scenes/HubScene.js';
import BookScene from './src/scenes/BookScene.js';
import CatalogScene from './src/scenes/CatalogScene.js';
import BuilderScene from './src/scenes/BuilderScene.js';
import FishingScene from './src/scenes/minigames/FishingScene.js';
import ArcadeScene from './src/scenes/minigames/ArcadeScene.js';
import ShirtShopScene from './src/scenes/minigames/ShirtShopScene.js';
import SculptScene from './src/scenes/minigames/SculptScene.js';

// Every `add.text` without its own font gets the emoji-friendly stack.
const addText = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style) {
  return addText.call(this, x, y, text, { fontFamily: FONT, ...style });
};

window.__toybox = new Phaser.Game({   // handy for poking at the game from the console and from tests

  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game',
  backgroundColor: '#2b2233',
  input: { touch: true, activePointers: 1 },        // one finger at a time — a toy, not a two-handed game
  scene: [BootScene, RoomScene, CreatorScene, HubScene, BookScene, CatalogScene, BuilderScene, FishingScene, ArcadeScene, ShirtShopScene, SculptScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});
