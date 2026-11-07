// Starting a hard-mode game: how failure works, which parts of the mature content are on, and the scenario to begin in.
import { W, H } from '../../config.js';
import { CARD, COLORS, TEXT, hitZone, inkButton, inkPanel } from '../../ui.js';
import { defaultSetup } from '../../systems/mode.js';
import { hardStore, metaStore } from '../../systems/save.js';
import { newHardSave } from '../../data/hard/start.js';
import { SCENARIOS, SCENARIO_IDS } from '../../data/hard/scenarios.js';
import { backdrop, leave, text } from './overlay.js';

const FAILURES = [['soft', 'Soft', 'Debt and a way back'], ['true', 'True hard', 'Permadeath, real homelessness']];
const TOGGLES = [['violence', 'Violence'], ['substances', 'Substances and addiction'], ['police', 'Police and crime'], ['survival', 'Harsh survival']];

export default class HardSetupScene extends Phaser.Scene {
  constructor() { super('HardSetup'); }

  init(data) { this.room = data.room; this.setup = defaultSetup(); this.dyn = []; this.starting = false; }

  create() {
    backdrop(this, 900, 540, 'New adult game', { seed: 45, onClose: () => leave(this) });
    this.build();
  }

  build() {
    this.dyn.forEach(o => o.destroy());
    this.dyn = [];
    const keep = o => { this.dyn.push(o); return o; };
    const left = 100;
    keep(text(this, left, 134, 'If you fail', 22, { fontStyle: 'bold' }));
    FAILURES.forEach(([id, name, blurb], i) => {
      const on = this.setup.failure === id;
      keep(inkButton(this, left + 100 + i * 210, 186, name, { w: 190, h: 44, size: 22, fill: on ? COLORS.gold : CARD, depth: 5, seed: 10 + i, onTap: () => { this.setup.failure = id; this.build(); } }));
      keep(text(this, left + 100 + i * 210, 222, blurb, 15, { color: '#7a6a58' })).setOrigin(0.5);
    });
    keep(text(this, left, 258, 'What is in the game', 22, { fontStyle: 'bold' }));
    TOGGLES.forEach(([id, name], i) => {
      const on = this.setup.toggles[id], x = 250, y = 306 + i * 46;
      keep(inkButton(this, x, y, `${on ? '☑' : '☐'} ${name}`, { w: 380, h: 40, size: 19, fill: on ? COLORS.green : CARD, depth: 5, seed: 20 + i, onTap: () => { this.setup.toggles[id] = !on; this.build(); } }));
    });
    keep(text(this, 520, 134, 'Where you begin', 22, { fontStyle: 'bold' }));
    SCENARIO_IDS.forEach((id, i) => {
      const sc = SCENARIOS[id], on = this.setup.scenario === id, y = 190 + i * 80;
      keep(inkPanel(this, 700, y, 360, 72, { fill: on ? 0xfff0b8 : CARD, radius: 14, shadow: false, weight: on ? 4.4 : 3, seed: 50 + i, depth: 4 }));
      keep(text(this, 534, y - 31, sc.label, 20, { fontStyle: 'bold' }).setDepth(5));
      keep(text(this, 534, y - 6, sc.blurb, 14, { wordWrap: { width: 330 } }).setDepth(5));
      keep(hitZone(this, 700, y, 360, 72, () => { this.setup.scenario = id; this.build(); }, 6));
    });
    keep(inkButton(this, W / 2, 506, 'Start', { w: 260, h: 54, size: 28, fill: COLORS.green, depth: 5, onTap: () => this.start() }));
  }

  async start() {
    if (this.starting) return;
    this.starting = true;
    await hardStore.save(newHardSave(this.setup));
    metaStore.set({ mode: 'hard' });
    this.room.save();
    setTimeout(() => location.reload(), 150);
  }
}
