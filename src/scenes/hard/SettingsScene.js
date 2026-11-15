// Settings: sound, the version (seven quick taps on it is the hidden way into adult mode) and, in hard mode, the way back.
import { W, H, GUI_SIZES } from '../../config.js';
import { COLORS, TEXT, hitZone, inkButton } from '../../ui.js';
import { tapCounter } from '../../systems/mode.js';
import { metaStore } from '../../systems/save.js';
import { backdrop, text } from './overlay.js';

export const VERSION = 'Toybox 0.9';

export default class SettingsScene extends Phaser.Scene {
  constructor() { super('Settings'); }

  init(data) { this.room = data.room; this.taps = null; }

  create() {
    const hard = Boolean(this.room.hard);
    backdrop(this, 520, hard ? 500 : 440, 'Settings');
    this.sound = inkButton(this, W / 2, hard ? 175 : 190, this.label(), { w: 300, h: 50, size: 24, fill: COLORS.blue, depth: 5, onTap: () => { this.room.sfx.toggle(); this.sound.setLabel(this.label()); this.room.sfx.pop(); } });
    this.gui = inkButton(this, W / 2, hard ? 240 : 255, this.guiLabel(), { w: 300, h: 50, size: 24, fill: COLORS.green, depth: 5, onTap: () => this.nextGui() });
    this.wipe = inkButton(this, W / 2, hard ? 440 : 335, '🧹 Start over', { w: 300, h: 50, size: 24, fill: COLORS.red, depth: 5, onTap: () => this.askWipe() });
    if (hard) this.subsButton = inkButton(this, W / 2, 370, this.subsLabel(), { w: 300, h: 50, size: 21, fill: COLORS.blue, depth: 5, onTap: () => this.askSubs() });
    if (hard) inkButton(this, W / 2, 305, '🧒 Back to kid mode', { w: 300, h: 50, size: 24, fill: COLORS.gold, depth: 5, onTap: () => this.leaveHard() });
    const v = text(this, W / 2, H / 2 + (hard ? 205 : 170), VERSION, 20, { color: '#8a7a68' }).setOrigin(0.5);
    hitZone(this, W / 2, v.y, 200, 44, () => this.tapVersion(), 5);
  }

  // Two taps: the first one arms it, the second wipes the saved toybox.
  askWipe() {
    if (!this.armed) {
      this.armed = true; this.wipe.setLabel('🗑 Tap again to erase everything');
      this.time.delayedCall(2500, () => { this.armed = false; this.wipe.setLabel('🧹 Start over'); });
      return;
    }
    this.room.wipeSave();
  }

  subsLabel() { return this.room.subs() ? '🌿 Substances: on' : '🌿 Substances: off'; }

  // Hides or restores the substance trade; nothing is deleted. Turning it off asks first.
  askSubs() {
    const h = this.room.hard, on = this.room.subs();
    if (on && !this.subsArmed) {
      this.subsArmed = true; this.subsButton.setLabel('Tap again: hides it, keeps progress');
      this.time.delayedCall(3000, () => { this.subsArmed = false; this.subsButton.setLabel(this.subsLabel()); });
      return;
    }
    this.subsArmed = false;
    h.setup.toggles.substances = !on;
    this.room.applyDarkToggle(); this.room.dirty = true; this.room.save();
    this.subsButton.setLabel(this.subsLabel()); this.room.sfx.pop();
  }

  guiLabel() { return `🔍 Menu size: ${(GUI_SIZES.find(g => g.k === metaStore.get().gui) || GUI_SIZES[1]).label}`; }
  // Cycle Small / Normal / Large / Huge; the HUD resizes straight away.
  nextGui() {
    const at = GUI_SIZES.findIndex(g => g.k === metaStore.get().gui), next = GUI_SIZES[(at + 1) % GUI_SIZES.length];
    this.room.setGuiSize(next.k);
    this.gui.setLabel(this.guiLabel()); this.room.sfx.pop();
  }

  label() { return this.room.sfx.muted ? '🔇 Sound is off' : '🔊 Sound is on'; }

  // Seven quick taps: the adult gate.
  tapVersion() {
    this.taps = tapCounter(this.taps, this.time.now);
    if (this.taps.open) { this.taps = null; this.scene.start('AdultGate', { room: this.room }); }
  }

  // Hard mode back to kid mode: the PIN, then the kid save loads (the hard save stays where it is).
  leaveHard() {
    const pin = metaStore.get().pin;
    this.scene.start('Pin', { room: this.room, mode: 'check', hash: pin, title: 'Enter your PIN to go back to kid mode', onOk: () => { this.room.save(); metaStore.set({ mode: 'kid' }); setTimeout(() => location.reload(), 150); } });
  }
}
