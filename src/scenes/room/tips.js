// Room scene mixin — the guided start: a hint bubble at the bottom that follows the TIPS sequence.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { W, H } from '../../config.js';
import { markDone, currentTip } from '../../data/tips.js';

export const tipMethods = {
  // Something the player did that a tip may be waiting for.
  tipEvent(name) {
    if (markDone(this.tipsSeen, name).length) this.dirty = true;
    this.refreshTip();
  },

  // Show the right bubble for now (or none). Called on events and when the room changes.
  refreshTip() {
    const tip = currentTip(this.tipsSeen, this.roomKey);
    if (this.tipShown && this.tipShown.id === tip?.id) return;
    this.hideTip();
    if (!tip) return;
    const timer = this.time.delayedCall(1200, () => {            // a beat, so it doesn't pop up mid-action
      this.tipTimer = null;
      if (currentTip(this.tipsSeen, this.roomKey)?.id !== tip.id) return;
      const bubble = this.add.text(W / 2, H - 32, `${tip.text}   ✕`, {
        fontSize: '19px', color: '#4a3426', backgroundColor: '#fff4e0', padding: { x: 16, y: 10 }, wordWrap: { width: 760 }, align: 'center',
      }).setOrigin(0.5).setDepth(9000).setAlpha(0).setInteractive({ useHandCursor: true });
      bubble.on('pointerdown', () => { this.tipsSeen.add(tip.id); this.dirty = true; this.refreshTip(); });   // tap to dismiss
      this.tweens.add({ targets: bubble, alpha: 1, duration: 300 });
      this.tweens.add({ targets: bubble, y: bubble.y - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tipShown = { id: tip.id, bubble };
    });
    this.tipTimer = timer;
  },

  hideTip() {
    if (this.tipTimer) { this.tipTimer.remove(); this.tipTimer = null; }
    if (this.tipShown) {
      this.tweens.killTweensOf(this.tipShown.bubble);
      this.tipShown.bubble.destroy();
      this.tipShown = null;
    }
  },
};
