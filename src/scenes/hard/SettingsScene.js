// Settings: sound, the version (seven quick taps on it is the hidden way into adult mode) and, in hard mode, the way back.
import { W, H } from '../../config.js';
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
    backdrop(this, 520, hard ? 360 : 300, 'Settings');
    this.sound = inkButton(this, W / 2, 200, this.label(), { w: 300, h: 50, size: 24, fill: COLORS.blue, depth: 5, onTap: () => { this.room.sfx.toggle(); this.sound.setLabel(this.label()); this.room.sfx.pop(); } });
    if (hard) inkButton(this, W / 2, 275, '🧒 Back to kid mode', { w: 300, h: 50, size: 24, fill: COLORS.gold, depth: 5, onTap: () => this.leaveHard() });
    const v = text(this, W / 2, H / 2 + (hard ? 138 : 98), VERSION, 20, { color: '#8a7a68' }).setOrigin(0.5);
    hitZone(this, W / 2, v.y, 200, 44, () => this.tapVersion(), 5);
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
