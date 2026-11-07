// Room scene mixin — the guided start: a hint bubble at the bottom that follows the TIPS sequence.
// These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
import { W, H } from '../../config.js';
import { markDone, currentTip } from '../../data/tips.js';
import { inkPanel, pin, richText } from '../../ui.js';

export const tipMethods = {
  // Something the player did that a tip may be waiting for.
  tipEvent(name) {
    if (markDone(this.tipsSeen, name).length) this.dirty = true;
    this.refreshTip();
  },

  // Show the right bubble for now (or none). Called on events and when the room changes.
  refreshTip() {
    const tip = currentTip(this.tipsSeen, this.currentRoomType());
    if (this.tipShown && this.tipShown.id === tip?.id) return;
    this.hideTip();
    if (!tip) return;
    const timer = this.time.delayedCall(1200, () => {            // a beat, so it doesn't pop up mid-action
      this.tipTimer = null;
      if (currentTip(this.tipsSeen, this.currentRoomType())?.id !== tip.id) return;
      const words = richText(this, `${tip.text}   ✕`, { fontSize: '22px' }), bw = Math.min(880, words.textWidth + 56);
      const panel = inkPanel(this, 0, 0, bw, 50, { radius: 18, seed: 9, weight: 3.6 });
      const bubble = this.add.container(W / 2, H - 36, [panel, words]).setDepth(9000).setSize(bw, 50).setAlpha(0)
        .setInteractive({ useHandCursor: true });
      pin(bubble);
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
