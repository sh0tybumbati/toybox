// Room scene mixin — HUD: top-bar buttons, coin counter, opening the map and recipe book.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { W } from '../../config.js';
import { saveStore } from '../../systems/save.js';
import { COLORS, inkButton, inkChip, inkSwatch, pin, touchable } from '../../ui.js';
import { ensureSpriteTexture, spriteImage } from '../../systems/itemTextures.js';

export const hudMethods = {
  createHud(hasSave) {
    const fixed = pin;                                                 // the HUD stays put while the camera scrolls
    this.roomLabel = fixed(this.add.text(W / 2, 30, '', { fontSize: '28px', color: '#fff7e0',
      fontStyle: 'bold', stroke: '#3a2a22', strokeThickness: 6 }).setOrigin(0.5).setDepth(10000));
    fixed(inkButton(this, 70, 30, '🗺️ Map', { w: 108, h: 42, fill: COLORS.gold, size: 22, onTap: () => this.openMap(), depth: 10000 }));
    this.coinText = fixed(inkChip(this, 196, 30, '', { size: 22, depth: 10000 }));
    this.updateNav();

    this.refreshTip();

    // Icon buttons along the top right, 52px apart so finger-sized hit areas don't overlap.
    const icon = (n, key, onTap) => {
      const x = W - 34 - n * 52, disc = this.add.graphics().setDepth(9999);                 // a little paper disc behind each icon
      inkSwatch(disc, x, 30, 25, 0xf8eed8, false, 40 + n);
      fixed(disc);
      const t = fixed(spriteImage(this, key, x, 30, 36).setDepth(10000));
      return touchable(t, 10).on('pointerdown', onTap);
    };
    const show = (img, key) => img.setTexture(ensureSpriteTexture(this, key));
    const mute = icon(0, this.sfx.muted ? 'icon-mute' : 'icon-sound', () => {
      show(mute, this.sfx.toggle() ? 'icon-mute' : 'icon-sound');
      this.sfx.pop();
    });

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
      await saveStore.clear();
      location.reload();
    });

    icon(2, 'icon-palette', () => this.openCreator());
    icon(3, 'icon-book', () => this.openBook());
    icon(4, 'icon-furniture', () => this.toggleEdit());
  },

  updateNav() {
    this.roomLabel.setText(this.zoneLabel());
    this.coinText.setLabel(`🪙 ${this.coins}`);
  },

  openMap() {
    if (this.switching) return;
    this.openCityMap();
  },

  openBook() {
    if (this.switching) return;
    this.tipEvent('book');
    this.scene.pause();
    this.scene.launch('Book', { room: this });
  },
};
