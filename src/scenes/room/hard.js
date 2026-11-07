// Room scene mixin — Hard mode, slice 1: the game clock, people's needs, their queue of actions and free will, and the
// HUD for them (docs/hardcore-mode.md). These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
// Nothing here runs in kid mode (`this.hard` is null).
import { W, FLOOR_BOTTOM, FLOOR_TOP } from '../../config.js';
import { ACTIONS, MAX_QUEUE, nutritionOf } from '../../data/hard/needs.js';
import { CATALOG } from '../../data/items.js';
import { advance, cleanClock, gameMinutes, isNight, label, SPEEDS } from '../../systems/hard/clock.js';
import { apply, cleanNeeds, newNeeds, status, tick, wantsToDo } from '../../systems/hard/needs.js';
import { floatText, puff, eat } from '../../systems/interactions.js';
import { freeSeat } from '../../systems/play.js';
import { clamp } from '../../util.js';
import { COLORS, TEXT, hitZone, inkButton, inkChip, inkPanel, pin } from '../../ui.js';
import { INK, inkFill, wobblyPoly, rectPoints } from '../../data/ink.js';

const TEXT_DEPTH = 10000;
const BAR_COLORS = { hunger: 0xe8913a, energy: 0x6aaee8, hygiene: 0x6fd0c0, mood: 0xf5c14a };
const NEED_ICONS = { hunger: '🍎', energy: '⚡', hygiene: '🚿', mood: '🙂' };
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
    if (mins > 0) {
      advance(this.clock, mins);
      if (isNight(this.clock) !== this.night) this.setNight(isNight(this.clock));
      for (const c of this.characters) {
        tick(c.needs, mins, { sleeping: c.sleeping ? 'bed' : c.collapsed ? 'floor' : false });
        this.checkCollapse(c);
        this.tickAction(c, mins);
        this.freeWill(c, mins);
      }
      this.dirty = true;
    }
    this.hudTimer = (this.hudTimer || 0) + dt;
    if (this.hudTimer > 0.25 || this.queueDirty) { this.hudTimer = 0; this.refreshHardHud(); }
  },

  // Out of energy: they drop where they stand and sleep on the floor until they have a little back.
  checkCollapse(c) {
    if (c.collapsed) {
      if (c.needs.energy >= 40) this.getUp(c);
      return;
    }
    if (c.needs.energy > 0 || c.sleeping || c.held || c.riding) return;
    this.cancelCurrent(c); c.queue = [];
    c.collapsed = true; c.goal = null; c.walking = false;
    c.preScale = c.scaleX;
    this.tweens.add({ targets: c, angle: -90, duration: 300, ease: 'Back.easeOut' });
    floatText(this, c.x, c.headTopY() - 30, '💤 Collapsed!', 24);
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
    this.queueDirty = true;
  },

  // Start the next queued action once the current one is done.
  startNext(c) {
    const next = c.queue.shift();
    if (!next) return;
    this.queueDirty = true;
    const { type, prop } = next;
    if (!prop || !prop.active || (type === 'sleep' && prop.sleeper)) { floatText(this, c.x, c.headTopY() - 20, '…', 24); return; }
    c.current = { type, prop, phase: 'walk', elapsed: 0, fed: false };
    c.idleMin = 0;
    if (c.sleeping) this.wakeUp(c, true);
    if (c.riding) this.dismount(c, true);
    const front = { x: prop.x, lane: clamp(prop.y + prop.def.h / 2 + 6, FLOOR_TOP, FLOOR_BOTTOM) };
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
      else if (type === 'wash') { puff(this, prop.x, prop.y - prop.def.h / 3, 0x8cc4f4, 6); this.sfx.whoosh(); }
    };
    const g = { x: clamp(front.x, 60, this.worldW - 60), lane: front.lane };
    if (Math.hypot(g.x - c.x, g.lane - c.lane) < 14) arrive();
    else { c.goal = g; c.onArrive = arrive; this.showWalkMarker(g.x, g.lane); }
  },

  // One step of the current action (game minutes `mins` passed).
  tickAction(c, mins) {
    if (c.held || c.collapsed || c.hugging) return;
    if (!c.current) { this.startNext(c); return; }
    const cur = c.current, def = ACTIONS[cur.type];
    if (cur.phase !== 'do') return;
    cur.elapsed += mins;
    if (def.perMin) apply(c.needs, Object.fromEntries(Object.entries(def.perMin).map(([k, v]) => [k, v * mins])));
    if (cur.type === 'eat' && !cur.fed) { cur.fed = true; this.eatFrom(c, cur.prop); }
    const rested = def.until && Object.entries(def.until).every(([k, v]) => c.needs[k] >= v);
    if (rested || cur.elapsed >= def.minutes) this.finishAction(c);
  },

  finishAction(c) {
    const cur = c.current;
    c.current = null; this.queueDirty = true;
    if (cur.type === 'sleep' && c.sleeping) this.wakeUp(c);
    if (cur.type === 'sit' && c.riding) this.dismount(c);
    this.sfx.ding();
  },

  // Take something to eat out of the fridge or pantry and eat it.
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
  // The actions that have somewhere to happen in this room.
  availableActions() {
    const has = a => this.props.some(p => p.active && p.def.hardActions && p.def.hardActions.includes(a));
    return {
      eat: has('eat'),
      sleep: this.props.some(p => p.active && p.def.behaviour === 'bed' && !p.sleeper),
      wash: has('wash'),
      sit: this.props.some(p => p.active && p.def.hardActions && p.def.hardActions.includes('sit') && freeSeat(p.def.ride, p.riders.map(r => r.riding))),
    };
  },

  // Nearest suitable piece of furniture for an action.
  propFor(action, c) {
    const ok = p => p.active && p.def.hardActions && p.def.hardActions.includes(action) && (action !== 'sleep' || !p.sleeper)
      && (action !== 'sit' || freeSeat(p.def.ride, p.riders.map(r => r.riding)));
    return this.props.filter(ok).sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0] || null;
  },

  // Someone with nothing to do looks after themselves.
  freeWill(c, mins) {
    if (!this.hard.autonomy || c.current || c.queue.length || c.goal || c.held || c.sleeping || c.riding || c.collapsed || c.hugging) { c.idleMin = 0; return; }
    c.idleMin += mins;
    if (c.idleMin < IDLE_BEFORE_FREE_WILL) return;
    const want = wantsToDo(c.needs, this.availableActions());
    c.idleMin = 0;
    if (want) this.queueAction(c, want, this.propFor(want, c));
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
    this.needLabels = ['hunger', 'energy', 'hygiene', 'mood'].map((k, i) => pin(this.add.text(402 + i * 128, 76, NEED_ICONS[k], { fontSize: '20px' }).setOrigin(0.5).setDepth(TEXT_DEPTH + 1)));
    this.nameChip = pin(this.add.text(402, 104, '', { fontSize: '16px', color: '#fff7e0', stroke: '#3a2a22', strokeThickness: 4 }).setDepth(TEXT_DEPTH));
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
    const c = this.selected || this.characters[0];
    if (!c || !c.needs) return;
    const g = this.needsGfx.clear();
    ['hunger', 'energy', 'hygiene', 'mood'].forEach((k, i) => {
      const x = 420 + i * 128, v = c.needs[k] / 100, w = 84;
      inkFill(g, wobblyPoly(rectPoints(x, 68, w, 16), { amp: 1, seed: 5 + i, step: 12 }), 0xf1e6cf, { w: 2.2, seed: 5 + i, heavy: 0 });
      if (v > 0.02) g.fillStyle(v < 0.25 ? 0xe5685c : BAR_COLORS[k], 1).fillRect(x + 2, 70, (w - 4) * v, 12);
    });
    const st = status(c.needs), flags = [st.starving && 'starving', st.hungry && !st.starving && 'hungry', st.exhausted && 'exhausted', st.tired && !st.exhausted && 'tired', st.dirty && 'dirty'].filter(Boolean);
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
      add(inkPanel(this, x, 124, q.now ? 50 : 44, q.now ? 50 : 44, { fill: q.now ? 0xfff0b8 : 0xf8eed8, radius: 22, shadow: false, weight: q.now ? 3.6 : 2.8, seed: 70 + i, depth: TEXT_DEPTH }));
      add(this.add.text(x, 124, def.icon, { fontSize: q.now ? '28px' : '24px' }).setOrigin(0.5).setDepth(TEXT_DEPTH + 1));
      if (!q.collapsed) add(hitZone(this, x, 124, 52, 52, () => { if (q.now) this.cancelCurrent(c); else this.cancelQueued(c, i - (c.current ? 1 : 0)); this.queueDirty = true; }, TEXT_DEPTH + 2));
    });
  },
};
