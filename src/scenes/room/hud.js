// Room scene mixin — HUD: top-bar buttons, coin counter, opening the map and recipe book.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { W, H, HUD_SCALE } from '../../config.js';
import { view } from '../../view.js';
import { metaStore } from '../../systems/save.js';
import { CARD, COLORS, inkButton, inkChip, inkDisc, inkPlate, pin } from '../../ui.js';

export const hudMethods = {
  createHud(hasSave) {
    // The HUD lives in three layers, scaled about the left, centre and right edges so it stays tucked in its corners.
    // Anything added to a layer is pinned to the screen too (pinning only reaches the children a container already has, and a
    // child left unpinned is drawn in place but hit-tested as if it scrolled with the room: its buttons stop working).
    const layer = () => {
      const c = pin(this.add.container(0, 0).setDepth(10000)), add = c.add;
      c.add = function (o) { add.call(this, o); for (const k of [].concat(o)) k.setScrollFactor(0, 0, true); return this; };
      return c;
    };
    this.hudL = layer(); this.hudC = layer(); this.hudR = layer(); this.hudBL = layer(); this.hudBR = layer();      // the bottom two hold the player card and the clock in adult mode
    this.layoutHud();
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

  // The size of the HUD: its base scale times the player's GUI size. Each layer is scaled about the edge it is tucked into.
  hudScale() { return HUD_SCALE * metaStore.get().gui; },
  layoutHud() {
    const s = this.hudScale(), x = { l: 0, c: view.w / 2 - W / 2 * s, r: view.w - W * s }, yb = H * (1 - s);
    for (const [layer, px, py] of [[this.hudL, x.l, 0], [this.hudC, x.c, 0], [this.hudR, x.r, 0], [this.hudBL, x.l, yb], [this.hudBR, x.r, yb]]) if (layer) layer.setScale(s).setPosition(px, py);
  },
  // Settings: change the GUI size, and put anything that was placed from the old size back.
  setGuiSize(k) {
    metaStore.set({ gui: k });
    this.layoutHud();
    this.hideTip(); this.refreshTip();
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
    if (this.coinText) this.coinText.setLabel(this.hard ? (this.hard.credit && this.hard.credit.pay === 'card' ? `Card $${this.cash.toLocaleString('en-US')}` : `$ ${this.wallet.toLocaleString('en-US')}`) : `🪙 ${this.coins}`);
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
