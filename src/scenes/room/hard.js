// Room scene mixin — Hard mode, slice 1: the game clock, people's needs, their queue of actions and free will, and the
// HUD for them (docs/hardcore-mode.md). These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
// Nothing here runs in kid mode (`this.hard` is null).
import { W, FLOOR_BOTTOM, FLOOR_TOP } from '../../config.js';
import { ACTIONS, MAX_QUEUE, nutritionOf } from '../../data/hard/needs.js';
import { ROOMS } from '../../data/rooms.js';
import { sectionAt } from '../../systems/world.js';
import { roughHour, scavengeFind } from '../../systems/hard/street.js';
import { SEASON_DAYS, dayInSeason, weatherAt, weatherLabel } from '../../systems/hard/weather.js';
import { CATALOG } from '../../data/items.js';
import { advance, cleanClock, gameMinutes, hourOf, isNight, label, nextOpen, openNow, pad, SPEEDS } from '../../systems/hard/clock.js';
import { apply, cleanNeeds, newNeeds, status, tick, wantsToDo } from '../../systems/hard/needs.js';
import { floatText, puff, eat } from '../../systems/interactions.js';
import { freeSeat } from '../../systems/play.js';
import { clamp } from '../../util.js';
import { COLORS, TEXT, hitZone, inkButton, inkChip, inkPanel, pin } from '../../ui.js';
import { INK, inkFill, wobblyPoly, rectPoints } from '../../data/ink.js';

const TEXT_DEPTH = 10000;
const BAR_COLORS = { hunger: 0xe8913a, energy: 0x6aaee8, hygiene: 0x6fd0c0, warmth: 0xf08060, mood: 0xf5c14a };
const NEED_ICONS = { hunger: '🍎', energy: '⚡', hygiene: '🚿', warmth: '🔥', mood: '🙂' };
const NEED_KEYS = ['hunger', 'energy', 'hygiene', 'warmth', 'mood'];
const IDLE_BEFORE_FREE_WILL = 10;                      // game minutes standing around before someone decides for themselves

export const hardMethods = {
  // --- setup ---------------------------------------------------------------------------------
  // Before anything is built: the clock decides whether it is night.
  initHardClock() {
    this.clock = cleanClock(this.hard.clock);
    this.speed = 1;                                    // index into SPEEDS
    this.night = isNight(this.clock);
  },

  // A person in a hard-mode game has needs, an action queue and a current action.
  initPerson(c) {
    c.needs = this.hard.needs[c.id] ? cleanNeeds(this.hard.needs[c.id]) : newNeeds();
    c.queue = []; c.current = null; c.idleMin = 0; c.collapsed = false;
  },

  // What goes into the save.
  hardSave() {
    return { ...this.hard, cash: this.cash, clock: { day: this.clock.day, minute: this.clock.minute }, needs: Object.fromEntries(this.characters.map(c => [c.id, { ...c.needs }])) };
  },

  // --- every frame -----------------------------------------------------------------------------
  tickHard(dt) {
    const mins = gameMinutes(dt, this.speed);
    if (mins > 0) this.stepGame(mins);
    this.hudTimer = (this.hudTimer || 0) + dt;
    if (this.hudTimer > 0.25 || this.queueDirty) { this.hudTimer = 0; this.refreshHardHud(); }
    this.drawWeather(dt);
  },

  // `mins` game minutes pass: the clock, the weather on everyone, needs, actions, free will.
  stepGame(mins) {
    advance(this.clock, mins);
    if (isNight(this.clock) !== this.night) this.setNight(isNight(this.clock));
    const toggles = this.hard.setup.toggles;
    for (const c of this.characters) {
      tick(c.needs, mins, { sleeping: c.sleeping ? 'bed' : c.rough ? 'bench' : c.collapsed ? 'floor' : false, env: toggles.survival ? this.envFor(c) : undefined });
      if (c.rough) this.roughRisks(c, mins);
      this.checkCollapse(c);
      this.tickAction(c, mins);
      this.freeWill(c, mins);
    }
    this.dirty = true;
  },

  // Time passes while the room is paused (a mini-game took an hour): catch everything up in small steps.
  passTime(minutes) {
    for (let left = minutes; left > 0; left -= 10) this.stepGame(Math.min(10, left));
    this.queueDirty = true;
  },

  // --- weather and warmth -----------------------------------------------------------------------
  weatherNow() { return weatherAt(this.clock.day, this.clock.minute); },

  // Is this person outdoors (in an open-air room)? And what is it like out there?
  isOutdoors(c) { const s = this.zone && sectionAt(this.zone, c.x).section; return Boolean(s && ROOMS[s.type] && ROOMS[s.type].outdoor); },
  envFor(c) { const w = this.weatherNow(); return { outdoors: this.isOutdoors(c), temp: w.temp, kind: w.kind }; },

  // Rain and snow fall (and the light dulls) in the open-air rooms only.
  drawWeather(dt) {
    const w = this.weatherNow(), out = this.zone && this.zone.sections.some(s => ROOMS[s.type] && ROOMS[s.type].outdoor), falling = out && (w.kind === 'rain' || w.kind === 'snow');
    if (!this.fxGfx) { this.fxGfx = this.add.graphics().setDepth(7900).setScrollFactor(0); this.flakes = Array.from({ length: 90 }, (_, i) => ({ x: (i * 97) % W, y: (i * 53) % 600, v: 0.7 + (i % 5) * 0.15 })); this.dullRect = this.add.rectangle(0, 0, W, 600, 0x8c96aa).setOrigin(0).setDepth(7800).setScrollFactor(0).setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(0); }
    this.dullRect.setAlpha(out && w.kind !== 'clear' ? (w.kind === 'cloudy' ? 0.16 : 0.3) : 0);
    const g = this.fxGfx.clear();
    if (!falling) return;
    const snow = w.kind === 'snow';
    g.lineStyle(snow ? 4 : 2, snow ? 0xffffff : 0x9fc4ec, snow ? 0.9 : 0.7);
    for (const f of this.flakes) {
      f.y += (snow ? 70 : 520) * f.v * dt; f.x += (snow ? Math.sin(f.y / 40) * 20 : -60) * dt;
      if (f.y > 600) { f.y = -10; f.x = Math.random() * W; }
      if (f.x < -10) f.x = W + 10;
      if (snow) g.fillStyle(0xffffff, 0.9).fillCircle(f.x, f.y, 3); else g.lineBetween(f.x, f.y, f.x - 4, f.y + 16);
    }
  },

  // Asleep outside: sometimes a patrol moves you on, sometimes someone goes through your pockets.
  roughRisks(c, mins) {
    c.roughAcc = (c.roughAcc || 0) + mins;
    while (c.roughAcc >= 60 && c.rough) {
      c.roughAcc -= 60;
      for (const e of roughHour({ hour: hourOf(this.clock), cash: this.cash, publicPlace: this.isOutdoors(c), toggles: this.hard.setup.toggles })) {
        if (e.type === 'moveOn') { this.stopRough(c); apply(c.needs, { mood: -8 }); floatText(this, c.x, c.headTopY() - 30, '👮 "Move along."', 24); this.cancelCurrent(c); }
        if (e.type === 'theft') { this.cash = Math.max(0, this.cash - e.amount); this.updateNav(); floatText(this, c.x, c.headTopY() - 30, `Robbed! −$${e.amount}`, 24); apply(c.needs, { mood: -10 }); }
      }
    }
  },

  // Lying on a bench, asleep.
  startRough(c, prop) {
    c.rough = prop; c.goal = null; c.walking = false; c.roughAcc = 0;
    c.x = prop.x; c.lane = clamp(prop.y + prop.def.h / 2 - 2, FLOOR_TOP, FLOOR_BOTTOM);
    this.tweens.add({ targets: c, angle: -90, duration: 300, ease: 'Back.easeOut' });
    this.queueDirty = true;
  },
  stopRough(c) {
    if (!c.rough) return;
    c.rough = null;
    this.tweens.add({ targets: c, angle: 0, duration: 260, ease: 'Back.easeOut' });
  },

  // Out of energy: they drop where they stand and sleep on the floor until they have a little back.
  checkCollapse(c) {
    if (c.collapsed) {
      const total = this.clock.day * 1440 + this.clock.minute;
      if (c.needs.energy >= 40 && c.needs.warmth >= 20) this.getUp(c);
      else if (c.collapsedFor === 'cold' && total - c.collapsedAt > 90) { apply(c.needs, { warmth: 15 }); this.getUp(c); }      // someone helps, or the shivering wakes them
      return;
    }
    if ((c.needs.energy > 0 && c.needs.warmth > 0) || c.sleeping || c.held || c.riding || c.rough) return;
    c.collapsedFor = c.needs.warmth <= 0 && c.needs.energy > 0 ? 'cold' : 'tired';
    c.collapsedAt = this.clock.day * 1440 + this.clock.minute;
    this.cancelCurrent(c); c.queue = [];
    c.collapsed = true; c.goal = null; c.walking = false;
    c.preScale = c.scaleX;
    this.tweens.add({ targets: c, angle: -90, duration: 300, ease: 'Back.easeOut' });
    floatText(this, c.x, c.headTopY() - 30, c.collapsedFor === 'cold' ? '🥶 Frozen!' : '💤 Collapsed!', 24);
    this.queueDirty = true;
  },

  getUp(c) {
    c.collapsed = false;
    this.tweens.add({ targets: c, angle: 0, duration: 260, ease: 'Back.easeOut' });
    this.queueDirty = true;
  },

  // --- orders -----------------------------------------------------------------------------------
  queueAction(c, type, prop) {
    if (!c || c.queue.length >= MAX_QUEUE || c.collapsed) return false;
    c.queue.push({ type, prop });
    c.idleMin = 0;
    this.queueDirty = true;
    return true;
  },

  cancelQueued(c, index) { c.queue.splice(index, 1); this.queueDirty = true; },

  clearActions() {
    for (const c of this.characters) { this.cancelCurrent(c); c.queue = []; }
    this.closeActionMenu();
    this.queueDirty = true;
  },

  // Stop what they are doing (get out of bed, off the seat, stop walking to it).
  cancelCurrent(c) {
    if (c.current) { c.current = null; c.onArrive = null; c.goal = null; }
    if (c.sleeping) this.wakeUp(c);
    if (c.riding) this.dismount(c);
    this.stopRough(c);
    this.queueDirty = true;
  },

  // Where to stand to use a piece of furniture: just in front of it.
  frontOf(prop) { return { x: prop.x, lane: clamp(prop.y + prop.def.h / 2 + 6, FLOOR_TOP, FLOOR_BOTTOM) }; },

  // Is this furniture usable right now (opening hours)? If not, say when it opens.
  openCheck(prop, c) {
    if (openNow(prop.def.hours, this.clock.minute)) return true;
    floatText(this, c.x, c.headTopY() - 20, `Closed until ${pad(nextOpen(prop.def.hours, this.clock.minute))}:00`, 22);
    return false;
  },

  // Start the next queued action once the current one is done.
  startNext(c) {
    const next = c.queue.shift();
    if (!next) return;
    this.queueDirty = true;
    const { type, prop } = next;
    if (!prop || !prop.active || (type === 'sleep' && prop.sleeper)) { floatText(this, c.x, c.headTopY() - 20, '…', 24); return; }
    if (!this.openCheck(prop, c)) return;
    c.current = { type, prop, phase: 'walk', elapsed: 0, fed: false };
    c.idleMin = 0;
    if (c.sleeping) this.wakeUp(c, true);
    if (c.riding) this.dismount(c, true);
    this.stopRough(c);
    const front = this.frontOf(prop);
    if (type === 'sleep') front.x = clamp(prop.x - 50, 60, this.worldW - 60);
    let seat = null;
    if (type === 'sit') {
      seat = freeSeat(prop.def.ride, prop.riders.map(r => r.riding));
      if (!seat) { c.current = null; floatText(this, c.x, c.headTopY() - 20, 'Taken!', 22); return; }
      front.x = prop.x + prop.def.ride.parts[seat.part].seats[seat.seat].x;
    }
    const arrive = () => {
      if (!c.current || c.current.prop !== prop) return;
      c.current.phase = 'do';
      if (type === 'sleep') this.startSleep(c, prop);
      else if (type === 'sit') this.mount(c, prop, seat);
      else if (type === 'rough') this.startRough(c, prop);
      else if (type === 'wash') { puff(this, prop.x, prop.y - prop.def.h / 3, 0x8cc4f4, 6); this.sfx.whoosh(); }
      else if (type === 'scavenge') { prop.boing(0.7); this.sfx.creak ? this.sfx.creak() : this.sfx.pop(); }
      else if (type === 'beg') { c.current.waiting = true; this.openGame('beg', prop); }
    };
    const g = { x: clamp(front.x, 60, this.worldW - 60), lane: front.lane };
    if (Math.hypot(g.x - c.x, g.lane - c.lane) < 14) arrive();
    else { c.goal = g; c.onArrive = arrive; this.showWalkMarker(g.x, g.lane); }
  },

  // One step of the current action (game minutes `mins` passed).
  tickAction(c, mins) {
    if (c.held || c.collapsed || c.hugging) return;
    if (!c.current) { if (!c.rough) this.startNext(c); return; }
    const cur = c.current, def = ACTIONS[cur.type];
    if (cur.phase !== 'do' || cur.waiting) return;
    cur.elapsed += mins;
    if (def.perMin) apply(c.needs, Object.fromEntries(Object.entries(def.perMin).map(([k, v]) => [k, v * mins])));
    if ((cur.type === 'eat' || cur.type === 'queue') && !cur.fed) { cur.fed = true; this.eatFrom(c, cur.prop); }
    if (cur.type === 'labour' && !openNow(cur.prop.def.hours, this.clock.minute) && cur.elapsed < 10) { this.cancelCurrent(c); return; }
    const rested = def.until && Object.entries(def.until).every(([k, v]) => c.needs[k] >= v);
    if (rested || cur.elapsed >= def.minutes) this.finishAction(c);
  },

  finishAction(c) {
    const cur = c.current, def = ACTIONS[cur.type];
    c.current = null; this.queueDirty = true;
    if (cur.type === 'sleep' && c.sleeping) this.wakeUp(c);
    if (cur.type === 'sit' && c.riding) this.dismount(c);
    if (cur.type === 'rough') this.stopRough(c);
    if (def.pay) { this.cash += def.pay; this.updateNav(); floatText(this, c.x, c.headTopY() - 30, `+$${def.pay}`, 26); this.sfx.coin(); }
    if (cur.type === 'scavenge') this.scavengeResult(c);
    this.sfx.ding();
  },

  // What was in the bin.
  scavengeResult(c) {
    const f = scavengeFind();
    if (f.kind === 'food') { apply(c.needs, { hunger: f.nutrition }); floatText(this, c.x, c.headTopY() - 30, `Scraps +${f.nutrition}`, 22); }
    else if (f.kind === 'cash') { this.cash += f.amount; this.updateNav(); floatText(this, c.x, c.headTopY() - 30, `Found $${f.amount}`, 24); this.sfx.coin(); }
    else floatText(this, c.x, c.headTopY() - 30, 'Nothing.', 22);
  },

  // The begging mini-game ended: what you collected, and an hour passed.
  hardGameResult(id, result) {
    const c = this.characters.find(x => x.current && x.current.waiting) || this.selected || this.characters[0];
    if (c && c.current && c.current.waiting) { c.current = null; this.queueDirty = true; }
    if (!result) return;
    if (result.cash) { this.cash += result.cash; this.updateNav(); if (c) floatText(this, c.x, c.headTopY() - 30, `+$${result.cash}`, 26); }
    if (result.minutes) this.passTime(result.minutes);
  },

  // Take something to eat out of the fridge, pantry or meal line and eat it.
  eatFrom(c, prop) {
    const pool = (prop.def.pool || []).filter(k => CATALOG[k] && CATALOG[k].kind === 'food');
    const key = pool.length ? pool[Math.floor(Math.random() * pool.length)] : 'bread';
    const item = this.createItem(key, c.x, c.lane);
    eat(this, item, c);
    prop.boing(0.5);
  },

  // Called from eating (interactions.eat): hunger goes up by how filling the food is.
  hardFed(c, key) {
    if (!c.needs) return;
    apply(c.needs, { hunger: nutritionOf(key) });
    floatText(this, c.x, c.headTopY() - 30, `+${nutritionOf(key)}`, 20);
    this.queueDirty = true;
  },

  // --- free will ----------------------------------------------------------------------------------
  usable(p, action) {
    return p.active && p.def.hardActions && p.def.hardActions.includes(action) && openNow(p.def.hours, this.clock.minute)
      && (action !== 'sleep' || !p.sleeper) && (action !== 'sit' || freeSeat(p.def.ride, p.riders.map(r => r.riding)))
      && (action !== 'rough' || freeSeat(p.def.ride, p.riders.map(r => r.riding)));
  },

  // Nearest suitable piece of furniture for an action (null if none here).
  propFor(action, c) {
    return this.props.filter(p => this.usable(p, action)).sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0] || null;
  },

  // What would this person do about `want` here: { action, prop } or null. A hungry person with no fridge joins the meal line,
  // and as a last resort searches a bin; a tired one without a bed finds a bench.
  resolveWant(want, c) {
    const tries = { eat: ['eat', 'queue', c.needs.hunger < 15 ? 'scavenge' : null], sleep: ['sleep', 'rough'], wash: ['wash'], sit: ['sit'] }[want] || [];
    for (const action of tries) { const prop = action && this.propFor(action, c); if (prop) return { action, prop }; }
    return null;
  },

  // The actions that have somewhere to happen in this room (for the "what do I want to do" choice).
  availableActions(c) {
    return Object.fromEntries(['eat', 'sleep', 'wash', 'sit'].map(w => [w, Boolean(this.resolveWant(w, c))]));
  },

  // Someone with nothing to do looks after themselves.
  freeWill(c, mins) {
    if (!this.hard.autonomy || c.current || c.queue.length || c.goal || c.held || c.sleeping || c.riding || c.collapsed || c.rough || c.hugging) { c.idleMin = 0; return; }
    c.idleMin += mins;
    if (c.idleMin < IDLE_BEFORE_FREE_WILL) return;
    const want = wantsToDo(c.needs, this.availableActions(c));
    c.idleMin = 0;
    const r = want && this.resolveWant(want, c);
    if (r) this.queueAction(c, r.action, r.prop);
  },

  // --- the action menu (tap a piece of furniture) ----------------------------------------------------
  openActionMenu(prop) {
    this.closeActionMenu();
    const c = this.selected || this.characters[0];
    if (!c) return;
    const actions = prop.def.hardActions, ui = (this.actionMenu = []);
    const x = clamp(prop.x - this.cameras.main.scrollX, 100, W - 100), y = clamp(prop.y - prop.def.h / 2 - 34, 130, 520);
    const add = o => { pin(o); ui.push(o); return o; };
    add(this.add.rectangle(0, 0, W, 600, 0x000000, 0.001).setOrigin(0).setDepth(9400).setInteractive().on('pointerdown', () => this.closeActionMenu()));
    actions.forEach((a, i) => {
      const def = ACTIONS[a], bx = x + (i - (actions.length - 1) / 2) * 122;
      add(inkButton(this, bx, y, `${def.icon} ${def.label}`, { w: 112, h: 44, size: 20, fill: COLORS.green, depth: 9500, seed: 80 + i, onTap: () => { this.queueAction(c, a, prop); this.closeActionMenu(); this.sfx.pop(); } }));
    });
    this.sfx.click();
  },

  closeActionMenu() { (this.actionMenu || []).forEach(o => o.destroy()); this.actionMenu = []; },

  // --- the hard-mode HUD: clock + speed, needs, and the queue --------------------------------------
  createHardHud() {
    this.clockChip = pin(inkChip(this, 110, 76, label(this.clock), { size: 21, depth: TEXT_DEPTH }));
    this.speedButtons = SPEEDS.map((s, i) => pin(inkButton(this, 235 + i * 44, 76, ['⏸', '▶', '⏩', '⏭'][i], { w: 40, h: 36, size: 18, fill: COLORS.grey, depth: TEXT_DEPTH, seed: 90 + i, onTap: () => this.setSpeed(i) })));
    this.needsGfx = pin(this.add.graphics().setDepth(TEXT_DEPTH));
    this.needLabels = NEED_KEYS.map((k, i) => pin(this.add.text(392 + i * 104, 76, NEED_ICONS[k], { fontSize: '20px' }).setOrigin(0.5).setDepth(TEXT_DEPTH + 1)));
    this.nameChip = pin(this.add.text(380, 100, '', { fontSize: '16px', color: '#fff7e0', stroke: '#3a2a22', strokeThickness: 4 }).setDepth(TEXT_DEPTH));
    this.weatherChip = pin(inkChip(this, 110, 112, '', { size: 18, depth: TEXT_DEPTH, h: 32 }));
    this.queueUI = [];
    this.setSpeed(1);
    this.queueDirty = true;
  },

  setSpeed(i) {
    this.speed = i;
    this.speedButtons.forEach((b, n) => b.setAlpha(n === i ? 1 : 0.55).setScale(n === i ? 1.08 : 0.94));
    this.sfx.click();
  },

  refreshHardHud() {
    this.clockChip.setLabel(label(this.clock));
    const w = this.weatherNow();
    this.weatherChip.setLabel(`${weatherLabel(w)} · ${w.season} ${dayInSeason(this.clock.day)}`);
    const c = this.selected || this.characters[0];
    if (!c || !c.needs) return;
    const g = this.needsGfx.clear();
    NEED_KEYS.forEach((k, i) => {
      const x = 410 + i * 104, v = c.needs[k] / 100, bw = 74;
      inkFill(g, wobblyPoly(rectPoints(x, 68, bw, 16), { amp: 1, seed: 5 + i, step: 12 }), 0xf1e6cf, { w: 2.2, seed: 5 + i, heavy: 0 });
      if (v > 0.02) g.fillStyle(v < 0.25 ? 0xe5685c : BAR_COLORS[k], 1).fillRect(x + 2, 70, (bw - 4) * v, 12);
    });
    const st = status(c.needs), flags = [st.starving && 'starving', st.hungry && !st.starving && 'hungry', st.exhausted && 'exhausted', st.tired && !st.exhausted && 'tired', st.freezing && 'freezing', st.cold && !st.freezing && 'cold', st.dirty && 'dirty'].filter(Boolean);
    this.nameChip.setText(`${c.name}${flags.length ? ' · ' + flags.join(', ') : ''}`);
    if (this.queueDirty) this.drawQueue(c);
  },

  // The queue: the current action first, then what's waiting. Tap one to cancel it.
  drawQueue(c) {
    this.queueDirty = false;
    this.queueUI.forEach(o => o.destroy());
    this.queueUI = [];
    const add = o => { pin(o); this.queueUI.push(o); return o; };
    const items = [...(c.current ? [{ ...c.current, now: true }] : []), ...c.queue.map(q => ({ ...q, now: false }))];
    if (c.collapsed) items.unshift({ type: 'sleep', now: true, collapsed: true });
    items.slice(0, MAX_QUEUE + 1).forEach((q, i) => {
      const x = 52 + i * 56, def = ACTIONS[q.type];
      add(inkPanel(this, x, 156, q.now ? 50 : 44, q.now ? 50 : 44, { fill: q.now ? 0xfff0b8 : 0xf8eed8, radius: 22, shadow: false, weight: q.now ? 3.6 : 2.8, seed: 70 + i, depth: TEXT_DEPTH }));
      add(this.add.text(x, 156, def.icon, { fontSize: q.now ? '28px' : '24px' }).setOrigin(0.5).setDepth(TEXT_DEPTH + 1));
      if (!q.collapsed) add(hitZone(this, x, 156, 52, 52, () => { if (q.now) this.cancelCurrent(c); else this.cancelQueued(c, i - (c.current ? 1 : 0)); this.queueDirty = true; }, TEXT_DEPTH + 2));
    });
  },
};
