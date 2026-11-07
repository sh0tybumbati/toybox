// Room scene mixin — HUD: top-bar buttons, coin counter, opening the map and recipe book.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { W } from '../../config.js';
import { saveStore } from '../../systems/save.js';
import { touchable } from '../../ui.js';

export const hudMethods = {
  createHud(hasSave) {
    const pill = { fontSize: '18px', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.28)', padding: { x: 12, y: 8 } };
    const fixed = o => o.setScrollFactor(0);                           // the HUD stays put while the camera scrolls
    this.roomLabel = fixed(this.add.text(W / 2, 30, '', { fontSize: '26px', color: '#ffffff',
      fontStyle: 'bold', stroke: '#00000066', strokeThickness: 4 }).setOrigin(0.5).setDepth(10000));
    touchable(fixed(this.add.text(70, 30, '🗺️ Map', pill).setOrigin(0.5).setDepth(10000)), 6)
      .on('pointerdown', () => this.openMap());
    this.coinText = fixed(this.add.text(190, 30, '', { ...pill, fontSize: '20px' }).setOrigin(0.5).setDepth(10000));
    this.updateNav();

    this.refreshTip();

    // Icon buttons along the top right, 52px apart so finger-sized hit areas don't overlap.
    const icon = (n, glyph, onTap) => {
      const t = fixed(this.add.text(W - 34 - n * 52, 30, glyph, { fontSize: '28px' }).setOrigin(0.5).setDepth(10000));
      return touchable(t, 8).on('pointerdown', onTap);
    };
    const mute = icon(0, this.sfx.muted ? '🔇' : '🔊', () => {
      mute.setText(this.sfx.toggle() ? '🔇' : '🔊');
      this.sfx.pop();
    });

    // Reset: two taps (the first one arms it) wipes the saved toybox.
    let armed = false;
    const reset = icon(1, '🧹', async () => {
      if (!armed) {
        armed = true;
        reset.setText('❓');
        this.time.delayedCall(2000, () => { armed = false; reset.setText('🧹'); });
        return;
      }
      this.noSave = true;
      await saveStore.clear();
      location.reload();
    });

    icon(2, '🎨', () => this.openCreator());
    icon(3, '📖', () => this.openBook());
    icon(4, '🛋️', () => this.toggleEdit());
  },

  updateNav() {
    this.roomLabel.setText(this.zoneLabel());
    this.coinText.setText(`🪙 ${this.coins}`);
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
