// A police event, as a short run of choices: a patrol stop (comply, bribe, run), a raid on the home, then arrest, plea or trial, sentence.
import { W } from '../../config.js';
import { COLORS, inkButton } from '../../ui.js';
import { LAWYER_PRICE, RECOVER_HEAT } from '../../data/hard/police.js';
import { CROPS } from '../../data/hard/plants.js';
import { addHeat } from '../../systems/hard/alley.js';
import { bribeChance, bribeCost, charge, hasPlants, lost, pleaDeal, runChance, search, seize, trialOdds, unitsOf, valueOf } from '../../systems/hard/police.js';
import { backdrop, leave, text } from './overlay.js';

const money = n => `$${n.toLocaleString('en-US')}`;

export default class PoliceScene extends Phaser.Scene {
  constructor() { super('Police'); }

  init(data) { this.room = data.room; this.event = data.event; this.dyn = []; this.heatDelta = 0; this.flags = {}; this.stage = data.event.kind; }

  create() {
    backdrop(this, 720, 470, this.event.kind === 'raid' ? '🚨 Raid' : '🚔 Stopped', { seed: 56, onClose: () => {} });
    this.show();
  }

  rng() { return this.room.policeRng(); }
  say(y, str, size = 22, extra = {}) { return this.keep(text(this, W / 2, y, str, size, { wordWrap: { width: 600 }, align: 'center', ...extra }).setOrigin(0.5, 0)); }
  keep(o) { this.dyn.push(o); return o; }
  button(y, label, fill, onTap, i = 0) { return this.keep(inkButton(this, W / 2, y, label, { w: 520, h: 46, size: 20, fill, depth: 6, seed: 320 + i, onTap })); }

  show() {
    this.dyn.forEach(o => o.destroy());
    this.dyn = [];
    const r = this.room, h = r.hard, o = this.event.officer;
    const carried = h.goods.map((g, i) => (g.at === 'carry' ? i : -1)).filter(i => i >= 0);
    if (this.stage === 'stop') {
      this.say(160, `${o.name}: "${o.line}"`, 22);
      if (!carried.length) { this.say(250, 'You have nothing on you. "Alright. Move along."', 20, { color: '#7a6a58' }); this.button(380, 'Walk on', COLORS.green, () => this.finish(-5)); return; }
      const cost = bribeCost(valueOf(h.goods, carried), h.record);
      this.say(230, `You are carrying ${unitsOf(h.goods, carried)} units. Heat ${h.heat}.${h.record ? ' They know your record.' : ''}`, 17, { color: '#7a6a58' });
      this.button(300, 'Comply: let them search', COLORS.green, () => this.comply(carried), 0);
      this.button(356, `Offer a bribe (${money(cost)}, about ${Math.round(bribeChance(o, h.heat) * 100)}% to work)`, r.cash >= cost ? COLORS.orange : COLORS.grey, () => this.bribe(carried, cost), 1);
      this.button(412, `Run (about ${Math.round(runChance(h.heat) * 100)}% to get away)`, COLORS.red, () => this.run(carried), 2);
    } else if (this.stage === 'raid') {
      this.say(160, `${o.name} and a team at your door, 5 a.m. "Police. We have a warrant."`, 22);
      this.button(330, 'Let them in', COLORS.green, () => this.raid());
    } else if (this.stage === 'clear') {
      this.say(200, this.flags.msg, 22);
      this.button(380, 'Carry on', COLORS.green, () => this.finish(this.flags.heat));
    } else if (this.stage === 'arrest') {
      const c = this.charge;
      this.say(150, `Arrested. Charge: ${c.label}.`, 24, { fontStyle: 'bold' });
      this.say(196, `${this.flags.seized || ''}If convicted: ${c.days} day${c.days === 1 ? '' : 's'} and a ${money(c.fine)} fine.`, 17, { color: '#7a6a58' });
      const lawyerOdds = trialOdds({ lawyer: true, units: this.flags.units, record: h.record }), publicOdds = trialOdds({ units: this.flags.units, record: h.record });
      this.button(290, `Plead guilty: ${pleaDeal(c).days} days, ${money(pleaDeal(c).fine)}`, COLORS.orange, () => this.sentence(pleaDeal(c)), 0);
      this.button(346, `Fight it with a public defender (${Math.round(publicOdds * 100)}% to walk, lose and it is worse)`, COLORS.blue, () => this.trial(false), 1);
      this.button(402, `Hire a lawyer, ${money(LAWYER_PRICE)} (${Math.round(lawyerOdds * 100)}% to walk)`, r.cash >= LAWYER_PRICE ? COLORS.blue : COLORS.grey, () => this.trial(true), 2);
    } else if (this.stage === 'free') {
      this.say(200, this.flags.msg, 22);
      this.button(380, 'Walk out', COLORS.green, () => this.finish(this.flags.heat));
    } else if (this.stage === 'jail') {
      const s = this.sentenceObj;
      this.say(180, `${this.flags.verdict} ${s.days} day${s.days === 1 ? '' : 's'} inside and a ${money(s.fine)} fine.`, 24, { fontStyle: 'bold' });
      this.say(250, 'Bills keep arriving while you are away. Your gig is gone. You leave with a record.', 18, { color: '#7a6a58' });
      this.button(380, 'Serve it', COLORS.grey, () => { r.serveSentence(s.days, s.fine); this.finish(0, true); });
    }
  }

  // --- the stop -------------------------------------------------------------------------------
  comply(carried) {
    const h = this.room.hard, found = search(h.goods, 'carry', Boolean(h.hides.bag), () => this.rng());
    if (!found.length) { this.stage = 'clear'; this.flags = { msg: '"Huh. Clean. Move along."', heat: -5 }; this.show(); return; }
    this.arrest(found, {});
  }

  bribe(carried, cost) {
    const r = this.room, h = r.hard;
    if (r.cash < cost) { r.sfx.nope(); return; }
    r.cash -= cost; r.updateNav();
    if (this.rng() < bribeChance(this.event.officer, h.heat)) { this.stage = 'free'; this.flags = { msg: `"I didn't see anything. Take care of yourself." (-${money(cost)})`, heat: 5 }; }
    else { this.arrest(carried, { bribed: true }); return; }
    this.show();
  }

  run(carried) {
    if (this.rng() < runChance(this.room.hard.heat)) { this.stage = 'free'; this.flags = { msg: 'You cut down an alley and lose them. Your heart is going.', heat: 10 }; this.show(); return; }
    this.arrest(carried, { resisting: true });
  }

  // --- the raid -------------------------------------------------------------------------------
  raid() {
    const h = this.room.hard, found = search(h.goods, 'home', Boolean(h.hides.safe), () => this.rng()), plants = hasPlants(h.beds, h.raw);
    if (!found.length && !plants) { this.stage = 'clear'; this.flags = { msg: 'They turn the place over and find nothing. They leave.', heat: -15 }; this.show(); return; }
    this.arrest(found, { plants, raid: true });
  }

  // --- arrest, plea, trial, sentence ------------------------------------------------------------
  arrest(idx, extra) {
    const r = this.room, h = r.hard, units = unitsOf(h.goods, idx), value = valueOf(h.goods, idx);
    this.charge = charge({ units, value, plants: Boolean(extra.plants), resisting: Boolean(extra.resisting), bribed: Boolean(extra.bribed), record: h.record });
    this.flags = { units, seized: `Seized: ${units ? `${units} units` : ''}${units && extra.plants ? ' and ' : ''}${extra.plants ? 'your plants' : ''}. ` };
    const where = extra.raid ? ['carry', 'home'] : ['carry'];
    h.goods = extra.raid ? seize(h.goods.filter((g, i) => g.at !== 'home' || idx.includes(i)), where) : seize(h.goods, where);
    if (extra.plants) {
      h.raw = Object.fromEntries(Object.entries(h.raw).filter(([id]) => !CROPS[id].dark));
      h.beds = Object.fromEntries(Object.entries(h.beds).filter(([, b]) => !CROPS[b.crop].dark));
      r.refreshBeds();
    }
    this.stage = 'arrest';
    this.show();
  }

  trial(lawyer) {
    const r = this.room, h = r.hard;
    if (lawyer) { if (r.cash < LAWYER_PRICE) { r.sfx.nope(); return; } r.cash -= LAWYER_PRICE; r.updateNav(); }
    if (this.rng() < trialOdds({ lawyer, units: this.flags.units, record: h.record })) { this.stage = 'free'; this.flags = { ...this.flags, msg: 'Not guilty. The case falls apart. What they took stays taken.', heat: RECOVER_HEAT - h.heat }; this.show(); return; }
    this.flags.verdict = 'Guilty.';
    this.sentence(lost(this.charge), true);
  }

  sentence(s, fromTrial = false) {
    this.sentenceObj = s;
    if (!fromTrial) this.flags.verdict = 'You pleaded guilty.';
    this.stage = 'jail';
    this.show();
  }

  finish(heatDelta, jailed = false) {
    const r = this.room;
    if (!jailed) r.hard.heat = addHeat(r.hard.heat, heatDelta || 0);
    r.dirty = true; r.updateNav();
    r.policeDone();
    leave(this);
  }
}
