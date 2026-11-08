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
import CampScene from './src/scenes/minigames/CampScene.js';
import ConsoleScene from './src/scenes/minigames/ConsoleScene.js';
import BubbleScene from './src/scenes/minigames/BubbleScene.js';
import MemoryScene from './src/scenes/minigames/MemoryScene.js';
import CashierScene from './src/scenes/minigames/CashierScene.js';
import IkeaScene from './src/scenes/minigames/IkeaScene.js';
import SettingsScene from './src/scenes/hard/SettingsScene.js';
import AdultGateScene from './src/scenes/hard/AdultGateScene.js';
import PinScene from './src/scenes/hard/PinScene.js';
import HardSetupScene from './src/scenes/hard/HardSetupScene.js';
import BankScene from './src/scenes/hard/BankScene.js';
import BegScene from './src/scenes/minigames/BegScene.js';
import BillsScene from './src/scenes/hard/BillsScene.js';
import DeviceScene from './src/scenes/hard/DeviceScene.js';
import StackScene from './src/scenes/minigames/StackScene.js';
import DealScene from './src/scenes/hard/DealScene.js';
import NurseryScene from './src/scenes/hard/NurseryScene.js';
import BedScene from './src/scenes/hard/BedScene.js';
import HopperScene from './src/scenes/minigames/HopperScene.js';

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
  scene: [BootScene, RoomScene, CreatorScene, HubScene, BookScene, CatalogScene, BuilderScene, FishingScene, ArcadeScene, ShirtShopScene, SculptScene, CampScene, ConsoleScene, BubbleScene, MemoryScene, HopperScene, CashierScene, IkeaScene, SettingsScene, AdultGateScene, PinScene, HardSetupScene, BankScene, BegScene, BillsScene, DeviceScene, StackScene, DealScene, NurseryScene, BedScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});
