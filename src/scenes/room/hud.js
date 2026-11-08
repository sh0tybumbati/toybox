// Room scene mixin — HUD: top-bar buttons, coin counter, opening the map and recipe book.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { W, HUD_SCALE } from '../../config.js';
import { metaStore } from '../../systems/save.js';
import { CARD, COLORS, inkButton, inkChip, inkDisc, inkPlate, pin } from '../../ui.js';

export const hudMethods = {
  createHud(hasSave) {
    // The HUD lives in three layers, scaled about the left, centre and right edges so it stays tucked in its corners.
    const layer = x => pin(this.add.container(x, 0).setScale(HUD_SCALE).setDepth(10000));
    this.hudL = layer(0); this.hudC = layer(W / 2 * (1 - HUD_SCALE)); this.hudR = layer(W * (1 - HUD_SCALE));
    const left = o => { this.hudL.add(o); return o; }, centre = o => { this.hudC.add(o); return o; }, right = o => { this.hudR.add(o); return o; }, fixed = left;
    this.roomLabel = centre(inkPlate(this, W / 2 - 20, 32, '', { maxW: 400 }));
    fixed(inkButton(this, 76, 32, '🗺️ Map', { w: 116, h: 48, fill: COLORS.gold, size: 22, onTap: () => this.openMap(), depth: 10000 }));
    if (!this.hard) this.coinText = fixed(inkChip(this, 100, 82, '', { size: 21, depth: 10000, h: 38, fill: CARD }));   // adult mode keeps its cash on the player card
    this.updateNav();

    this.refreshTip();

    // Round buttons along the top right, 56px apart so finger-sized hit areas don't overlap.
    const disc = (n, key, onTap, onHold) => right(inkDisc(this, W - 36 - n * 56, 32, key, { onTap, onHold, seed: 40 + n }));
    disc(0, 'icon-gear', () => this.openSettings());
    disc(1, 'icon-palette', () => this.openCreator());
    disc(2, 'icon-book', () => this.openBook());
    this.editDisc = disc(3, 'icon-furniture', () => this.toggleEdit());
    this.updateNav();
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
    if (this.editDisc) this.editDisc.setVisible(this.editRights() !== '');             // adult mode: only your own places can be changed
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

  openBook() {
    if (this.switching) return;
    this.tipEvent('book');
    this.scene.pause();
    this.scene.launch('Book', { room: this });
  },
};
