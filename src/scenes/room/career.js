// Room scene mixin — Hard mode, slice 5: jobs and careers (docs/careers-spec.md). Pure rules live in systems/hard/careers.js;
// this is the clock, the work sites, the mini-game and the notices. `this` is the RoomScene. Nothing here runs in kid mode.
import { CAREERS, EMPLOYER_NAMES, SITE_CRATES } from '../../data/hard/careers.js';
import { view } from '../../view.js';
import { SHIFT_DRAIN, SHIFT_MINUTES } from '../../data/hard/gigs.js';
import { payFor, standing } from '../../systems/hard/gig.js';
import { activeStrikes, autoPerformance, decay, finishShift, hire, newWork, payslip, promote, promotionOffered, quit, rungOf, shiftNow, skillOf, tickShifts, whyNotHire } from '../../systems/hard/careers.js';
import { apply } from '../../systems/hard/needs.js';
import { floatText } from '../../systems/interactions.js';
import { LATE_UNTIL } from '../../data/hard/gigs.js';
import { lateRow, nextShift } from '../../systems/hard/careers.js';
import { timeLabel, label } from '../../systems/hard/clock.js';

import { CARD, COLORS, TEXT, inkButton, inkPanel, pin } from '../../ui.js';

export const careerMethods = {
  workOf(c) { return this.hard.work[c.id] || (this.hard.work[c.id] = newWork()); },
  siteHere(site) { return Boolean(this.zone && this.zone.sections.some(s => s.type === site)); },
  careerEnv(c) { return { day: this.clock.day, hygiene: c.needs.hygiene, phone: Boolean(this.hard.phone || this.hard.home), dirty: false, record: Boolean(this.hard.record) }; },

  // The shift this person can start right here, right now (null = none).
  jobShift(c) {
    const w = this.workOf(c);
    return w.job && this.siteHere(w.job.employer) ? shiftNow(w, this.totalMinutes(), w.job.employer) : null;
  },

  // Is there work to start at this work site? Either today's shift or the day-labour gig. { ok, why }.
  canWork(c) {
    if (this.jobShift(c)) return { ok: true, why: '' };
    const w = this.workOf(c), gig = this.hard.gig;
    if (gig && standing(gig, this.totalMinutes()) !== 'gone') {
      if (!this.siteHere(gig.site)) return { ok: false, why: `Your gig is at ${gig.siteName}` };
      return { ok: true, why: '' };
    }
    if (w.job) return { ok: false, why: this.siteHere(w.job.employer) ? 'No shift right now' : `Your job is at ${EMPLOYER_NAMES[w.job.employer]}` };
    return { ok: false, why: gig ? 'They found someone else' : 'No work: ask at the labour board (06:00-09:00) or find a job' };
  },

  // The person reached a work site: start the job shift, or the day-labour gig.
  startWork(c, prop) {
    const shift = this.jobShift(c);
    c.current.waiting = true; c.current.arrived = this.totalMinutes();
    if (shift) {
      const w = this.workOf(c), r = rungOf(w.job.career, w.job.rung);
      c.current.job = { late: shift.late };
      if (shift.late > 0) floatText(this, c.x, c.headTopY() - 40, shift.late > 120 ? 'Very late: no pay' : 'You are late: pay cut', 22);
      if (r.play === 'stack') { this.openGame('stack', prop, { crate: SITE_CRATES[w.job.employer] || 'crates', title: r.title }); return; }
      this.jobShiftDone(c, autoPerformance(skillOf(w, w.job.career)), shift.late);          // till and bed shifts are auto-shifts for now
      c.current = null; this.queueDirty = true;
      return;
    }
    const gig = this.hard.gig;
    if (standing(gig, c.current.arrived) === 'late') floatText(this, c.x, c.headTopY() - 40, 'You are late: pay cut', 22);
    this.openGame('stack', prop, { crate: gig.crate, title: gig.title });
  },

  // A shift is over: pay (it goes on the weekly payslip), skill, strikes, tired legs, and the hours go by.
  jobShiftDone(c, performance, late) {
    const w = this.workOf(c), job = w.job, hours = job.rota.hours, title = rungOf(job.career, job.rung).title;
    const r = finishShift(w, performance, late, this.clock.day);
    apply(c.needs, Object.fromEntries(Object.entries(SHIFT_DRAIN).map(([k, v]) => [k, v * hours * 60])));
    floatText(this, c.x, c.headTopY() - 30, r.pay ? `${title}: earned $${r.pay.toLocaleString('en-US')}` : 'No pay for that one', 24);
    if (r.strikes) this.notice(`⚠️ ${r.strikes === 1 ? 'A strike' : `${r.strikes} strikes`} for being late`);
    if (r.sacked) this.notice('🚫 Sacked: three strikes');
    else if (promotionOffered(w)) this.notice('⭐ Your boss has a promotion for you: see the phone');
    this.sfx.coin();
    this.passTime(hours * 60);
  },

  // Called by hardGameResult when the stacking game ends and the shift was a job (not a gig).
  jobShiftResult(c, job, performance) { this.jobShiftDone(c, performance, job.late); },

  // Once an hour: shifts appear on the rota and no-shows are noticed.
  careerHourly(total) {
    for (const c of this.characters) for (const e of tickShifts(this.workOf(c), total)) {
      if (e.type === 'noshow') this.notice(`${c.name} missed a shift: ${e.sacked ? 'sacked' : `${e.strikes} strikes`}`);
    }
    this.queueDirty = true;
  },

  // Once a day: old strikes fall away, skill fades, and every Monday the week's pay arrives as a payslip.
  careerDaily(day) {
    for (const c of this.characters) {
      const w = this.workOf(c);
      w.strikes = activeStrikes(w, day); decay(w, day);
      if (day > 0 && day % 7 === 0) {
        const n = payslip(w);
        if (n) { this.hard.slips.push({ amount: n, day, who: c.name }); this.notice('✉️ A payslip is in the mail'); }
        if (promotionOffered(w)) this.notice('⭐ A promotion is on offer: see the phone');
      }
    }
  },

  // Reading the mail: the payslips pay out.
  readSlips() {
    const got = this.hard.slips.splice(0);
    const total = got.reduce((n, s) => n + s.amount, 0);
    if (total) { this.cash += total; this.updateNav(); this.sfx.coin(); }
    return got;
  },

  applyForJob(c, l) {
    const why = whyNotHire(this.workOf(c), l.career, l.rung, l.employer, this.careerEnv(c));
    if (why) return { ok: false, why };
    hire(this.workOf(c), l.career, l.rung, l.employer, this.clock.day);
    this.queueDirty = true; this.dirty = true;
    return { ok: true, why: '' };
  },
  acceptPromotion(c) { const ok = promote(this.workOf(c)); if (ok) this.dirty = true; return ok; },
  quitJob(c) { quit(this.workOf(c)); this.workOf(c).shift = null; this.dirty = true; },

  // What this person owes a work site right now, when they are in its building: { title, place, due, late, pct } or null.
  // `pct` is the share of the pay they would get for the lateness.
  workObligation(c) {
    const total = this.totalMinutes(), shift = this.jobShift(c);
    if (shift) {
      const w = this.workOf(c);
      return { title: rungOf(w.job.career, w.job.rung).title, place: EMPLOYER_NAMES[w.job.employer], due: shift.start, late: shift.late, pct: Math.round(lateRow(shift.late).pay * 100) };
    }
    const gig = this.hard.gig;
    if (gig && standing(gig, total) !== 'gone' && this.siteHere(gig.site)) {
      const late = Math.max(0, total - gig.due);
      return { title: gig.title, place: gig.siteName, due: gig.due, late, pct: late ? Math.round((0.6 - 0.2 * (late / LATE_UNTIL)) * 100) : 100 };
    }
    return null;
  },

  // "Start your shift?" over the person (docs/worksite-prompt-spec.md). Start walks to the work site and begins; Not yet leaves it pending.
  showWorkPrompt(c, ob) {
    this.closeWorkPrompt();
    const ui = (this.workPromptUI = []), add = o => { pin(o); ui.push(o); return o; };
    const x = view.w / 2, y = 150;
    add(inkPanel(this, x, y, 520, 118, { fill: CARD, depth: 9600, seed: 71, radius: 18 }));
    add(this.add.text(x, y - 40, 'Start your shift?', { fontSize: '24px', fontStyle: 'bold', color: TEXT }).setOrigin(0.5).setDepth(9700));
    add(this.add.text(x, y - 12, `${ob.title}, ${ob.place}, due ${timeLabel({ minute: ob.due % 1440 })}`, { fontSize: '17px', color: TEXT }).setOrigin(0.5).setDepth(9700));
    if (ob.late > 0) add(this.add.text(x, y + 8, `You are ${Math.round(ob.late)} min late: pay ${ob.pct}%`, { fontSize: '16px', color: '#b0584e', fontStyle: 'bold' }).setOrigin(0.5).setDepth(9700));
    add(inkButton(this, x - 90, y + 40, 'Start', { w: 140, h: 38, size: 20, fill: COLORS.green, depth: 9700, seed: 72, onTap: () => { this.closeWorkPrompt(); this.startShiftNow(c); this.sfx.click(); } }));
    add(inkButton(this, x + 90, y + 40, 'Not yet', { w: 140, h: 38, size: 20, fill: CARD, depth: 9700, seed: 73, onTap: () => { this.promptOff = true; this.closeWorkPrompt(); this.sfx.click(); } }));
    this.sfx.pop();
  },
  closeWorkPrompt() { (this.workPromptUI || []).forEach(o => o.destroy()); this.workPromptUI = []; },

  // Every HUD refresh: the prompt on arrival, and the pulsing marker while a shift is waiting.
  workWatch(c) {
    const ob = this.workObligation(c), busy = Boolean(c.current) || this.scene.isPaused('Room');
    if (!ob) { this.promptOff = false; this.closeWorkPrompt(); return ob; }
    if (!this.workPromptUI || !this.workPromptUI.length) { if (!this.promptOff && !busy && !this.switching) this.showWorkPrompt(c, ob); }
    return ob;
  },

  // Tapping the work-site marker: the prompt if there is work, otherwise a line saying so.
  tapWorksite(c) {
    const ob = this.workObligation(c);
    if (ob) { this.promptOff = false; this.showWorkPrompt(c, ob); return; }
    const w = this.workOf(c), next = nextShift(w, this.totalMinutes());
    floatText(this, c.x, c.headTopY() - 40, `Nothing for you here right now${next ? `. Next shift ${label({ day: next.day, minute: next.start % 1440 })}` : ''}`, 20);
    this.sfx.nope();
  },

  // Walk to the work site and start (the chip and the crates both do this).
  startShiftNow(c) {
    const prop = this.props.find(p => p.def.hardActions && p.def.hardActions.includes('work'));
    if (prop && this.canWork(c).ok && !c.current) this.queueAction(c, 'work', prop);
  },
};
