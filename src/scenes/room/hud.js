// Room scene mixin — HUD: top-bar buttons, coin counter, opening the map and recipe book.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { W } from '../../config.js';
import { metaStore } from '../../systems/save.js';
import { CARD, COLORS, inkButton, inkChip, inkDisc, inkPlate, pin } from '../../ui.js';

export const hudMethods = {
  createHud(hasSave) {
    const fixed = pin;                                                 // the HUD stays put while the camera scrolls
    this.roomLabel = fixed(inkPlate(this, W / 2 - 20, 32, '', { maxW: 400 }));
    fixed(inkButton(this, 76, 32, '🗺️ Map', { w: 116, h: 48, fill: COLORS.gold, size: 22, onTap: () => this.openMap(), depth: 10000 }));
    if (!this.hard) this.coinText = fixed(inkChip(this, 100, 82, '', { size: 21, depth: 10000, h: 38, fill: CARD }));   // adult mode keeps its cash on the player card
    this.updateNav();

    this.refreshTip();

    // Round buttons along the top right, 56px apart so finger-sized hit areas don't overlap.
    const disc = (n, key, onTap, onHold) => fixed(inkDisc(this, W - 36 - n * 56, 32, key, { onTap, onHold, seed: 40 + n }));
    disc(0, 'icon-gear', () => this.openSettings());
    disc(1, 'icon-palette', () => this.openCreator());
    disc(2, 'icon-book', () => this.openBook());
    disc(3, 'icon-furniture', () => this.toggleEdit());
    if (this.hard) disc(4, 'coin', () => this.openBank());
  },

  // Settings' "start over": wipes the saved toybox (an adult game falls back to the kid world).
  async wipeSave() {
    this.noSave = true;
    await this.store.clear();
    if (this.hard) metaStore.set({ mode: 'kid' });
    location.reload();
  },

  updateNav() {
    this.roomLabel.setLabel(this.zoneLabel());
    if (this.coinText) this.coinText.setLabel(this.hard ? `$ ${this.cash.toLocaleString('en-US')}` : `🪙 ${this.coins}`);
    this.refreshPrices();
  },

  openMap() {
    if (this.switching) return;
    this.openCityMap();
  },

  openSettings() {
    if (this.switching || this.decor) return;
    this.scene.pause();
    this.scene.launch('Settings', { room: this });
  },

  openBank() {
    if (this.switching) return;
    this.scene.pause();
    this.scene.launch('Bank', { room: this });
  },

  openBook() {
    if (this.switching) return;
    this.tipEvent('book');
    this.scene.pause();
    this.scene.launch('Book', { room: this });
  },
};
