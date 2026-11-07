// Room scene mixin — HUD: top-bar buttons, coin counter, opening the map and recipe book.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { W } from '../../config.js';
import { metaStore } from '../../systems/save.js';
import { COLORS, inkButton, inkChip, inkSwatch, pin, touchable } from '../../ui.js';
import { ensureSpriteTexture, spriteImage } from '../../systems/itemTextures.js';

export const hudMethods = {
  createHud(hasSave) {
    const fixed = pin;                                                 // the HUD stays put while the camera scrolls
    this.roomLabel = fixed(this.add.text(W / 2, 30, '', { fontSize: '28px', color: '#fff7e0',
      fontStyle: 'bold', stroke: '#3a2a22', strokeThickness: 6 }).setOrigin(0.5).setDepth(10000));
    fixed(inkButton(this, 70, 30, '🗺️ Map', { w: 112, h: 46, fill: COLORS.gold, size: 22, onTap: () => this.openMap(), depth: 10000 }));
    this.coinText = fixed(inkChip(this, 196, 30, '', { size: 22, depth: 10000 }));
    this.updateNav();

    this.refreshTip();

    // Icon buttons along the top right, 52px apart so finger-sized hit areas don't overlap.
    const icon = (n, key, onTap, onHold) => {
      const x = W - 34 - n * 52, disc = this.add.graphics().setDepth(9999);                 // a little paper disc behind each icon
      inkSwatch(disc, x, 30, 25, 0xf8eed8, false, 40 + n);
      fixed(disc);
      const t = fixed(spriteImage(this, key, x, 30, 36).setDepth(10000));
      touchable(t, 34);                                                                  // a fingertip-sized target (~55px) around a 36px icon
      if (!onHold) return t.on('pointerdown', onTap);
      let timer = null, held = false;                                                    // tap = onTap, press and hold = onHold
      t.on('pointerdown', () => { held = false; timer = this.time.delayedCall(700, () => { held = true; timer = null; onHold(); }); });
      t.on('pointerup', () => { if (timer) { timer.remove(); timer = null; } if (!held) onTap(); });
      t.on('pointerout', () => { if (timer) { timer.remove(); timer = null; } });
      return t;
    };
    const show = (img, key) => img.setTexture(ensureSpriteTexture(this, key));
    const mute = icon(0, this.sfx.muted ? 'icon-mute' : 'icon-sound', () => {
      show(mute, this.sfx.toggle() ? 'icon-mute' : 'icon-sound');
      this.sfx.pop();
    }, () => this.openSettings());                                       // hold the sound button for settings

    // Reset: two taps (the first one arms it) wipes the saved toybox.
    let armed = false;
    const reset = icon(1, 'icon-broom', async () => {
      if (!armed) {
        armed = true;
        show(reset, 'icon-trash');                                  // tap again to really wipe everything
        this.time.delayedCall(2000, () => { armed = false; show(reset, 'icon-broom'); });
        return;
      }
      this.noSave = true;
      await this.store.clear();
      if (this.hard) metaStore.set({ mode: 'kid' });                     // a wiped adult game: back to the kid world
      location.reload();
    });

    icon(2, 'icon-palette', () => this.openCreator());
    icon(3, 'icon-book', () => this.openBook());
    icon(4, 'icon-furniture', () => this.toggleEdit());
    if (this.hard) icon(5, 'coin', () => this.openBank());
  },

  updateNav() {
    this.roomLabel.setText(this.zoneLabel());
    this.coinText.setLabel(this.hard ? `$ ${this.cash.toLocaleString('en-US')}` : `🪙 ${this.coins}`);
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
