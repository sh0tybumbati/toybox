// Room scene mixin — Hard mode, slice 1: the game clock, people's needs, their queue of actions and free will, and the
// HUD for them (docs/hardcore-mode.md). These methods are mixed into RoomScene (see ../RoomScene.js), so `this` is the scene.
// Nothing here runs in kid mode (`this.hard` is null).
import { W, FLOOR_BOTTOM, FLOOR_TOP, UI_FONT } from '../../config.js';
import { ACTIONS, MAX_QUEUE, PAPER_PRICE, PHONE_PRICE, nutritionOf } from '../../data/hard/needs.js';
import { ROOMS } from '../../data/rooms.js';
import { sectionAt } from '../../systems/world.js';
import { roughHour, scavengeFind } from '../../systems/hard/street.js';
import { SEASON_DAYS, dayInSeason, weatherAt, weatherLabel } from '../../systems/hard/weather.js';
import { CATALOG } from '../../data/items.js';
import { advance, cleanClock, gameMinutes, hourOf, isNight, label, nextOpen, openNow, pad, SPEEDS, timeLabel } from '../../systems/hard/clock.js';
import { apply, cleanNeeds, newNeeds, status, tick, wantsToDo } from '../../systems/hard/needs.js';
import { floatText, puff, eat } from '../../systems/interactions.js';
import { freeSeat } from '../../systems/play.js';
import { clamp } from '../../util.js';
import { LARDER_CAP, PACK_MAX, PACKS, SHOP_HOURS, hardPriceOf } from '../../data/hard/food.js';
import { carriedBy, foodCap, slotsOf, tierOf } from '../../systems/hard/pack.js';
import { addFood, expire, store, takeBest, cleanFood } from '../../systems/hard/pantry.js';
import { deliverIfDue, inStock, newShop, totalStock } from '../../systems/hard/stock.js';
import { SHOP_ITEMS } from '../../systems/save.js';
import { SHELF_STEP } from '../../config.js';
import { HOUSING } from '../../data/hard/housing.js';
import { creditDaily, foreclose, onLate, activeCard } from '../../systems/hard/credit.js';
import { letDaily } from '../../systems/hard/landlord.js';
import { SALE_RATE, SCORE_EVENTS } from '../../data/hard/credit.js';
import { newHome, overdue, rent, tickBills, totalDue, unseen } from '../../systems/hard/bills.js';
import { SHIFT_DRAIN, SHIFT_MINUTES } from '../../data/hard/gigs.js';
import { payFor, pickGig, standing, travelMinutes } from '../../systems/hard/gig.js';
import { SLOTS } from '../../data/buildings.js';
import { decayHeat } from '../../systems/hard/alley.js';
import { give, harvestOf, powerToday, stage, tickBeds } from '../../systems/hard/garden.js';
import { hasPlants, officerFor, raidChance, stopChance } from '../../systems/hard/police.js';
import { RECOVER_HEAT } from '../../data/hard/police.js';
import { customersDaily } from '../../systems/hard/customers.js';
import { WITHDRAWAL, drain, habitDaily, newHabit, use as useHabit, useEffect, label as habitLabel } from '../../systems/hard/habit.js';
import { CROPS, PLOTS, POWER_DAY } from '../../data/hard/plants.js';
import { shelvesFor } from '../../data/rooms.js';
import { CARD, COLORS, PAPER, TEXT, hitZone, inkButton, inkChip, inkDisc, inkMeter, inkPanel, pin } from '../../ui.js';
import { ensureSpriteTexture, spriteImage } from '../../systems/itemTextures.js';
import { INK } from '../../data/ink.js';

const TEXT_DEPTH = 10000;
const BAR_COLORS = { hunger: 0xe8913a, energy: 0x6aaee8, hygiene: 0x6fd0c0, warmth: 0xf08060, mood: 0xf5c14a };
const NEED_ICONS = { hunger: 'need-hunger', energy: 'need-energy', hygiene: 'need-hygiene', warmth: 'need-warmth', mood: 'need-mood' };
const QUEUE_Y = 274;
const pinTo = (layer, o) => { layer.add(o); return o; };
const NEED_KEYS = ['hunger', 'energy', 'hygiene', 'warmth', 'mood'];
const HOME_ROOMS = ['kitchen', 'living', 'bedroom', 'motel', 'garden'];            // rooms that belong to whoever lives there
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
    c.bag = cleanFood(this.hard.bags && this.hard.bags[c.id], PACK_MAX);          // food you carry
  },

  // What goes into the save.
  hardSave() {
    return { ...this.hard, cash: this.wallet, clock: { day: this.clock.day, minute: this.clock.minute }, needs: Object.fromEntries(this.characters.map(c => [c.id, { ...c.needs }])), bags: Object.fromEntries(this.characters.map(c => [c.id, c.bag])) };
  },

  // --- every frame -----------------------------------------------------------------------------
  tickHard(dt) {
    const mins = gameMinutes(dt, this.speed);
    if (mins > 0) this.stepGame(mins);
    if (this.policeEvent) this.policeLaunch();
    this.hudTimer = (this.hudTimer || 0) + dt;
    if (this.hudTimer > 0.25 || this.queueDirty) { this.hudTimer = 0; this.refreshHardHud(); this.refreshBeds(); }
    this.drawWeather(dt);
  },

  totalMinutes() { return Math.floor(this.clock.day * 1440 + this.clock.minute); },

  // Once an hour: food goes off, vans arrive, shops open and close.
  hourly(total) {
    const gone = expire(this.hard.larder, total);
    if (gone.spoiled.length) { this.hard.larder = gone.kept; this.notice(`The ${gone.spoiled[0]} in the fridge went off`); }
    for (const c of this.characters) {
      const e = expire(c.bag, total);
      if (e.spoiled.length) { c.bag = e.kept; floatText(this, c.x, c.headTopY() - 30, `🤢 ${e.spoiled[0]} went off`, 20); }
    }
    for (const [slot, shop] of Object.entries(this.hard.shops)) {
      if (deliverIfDue(shop, total)) { if (this.zone && this.zone.sections.some(s => s.type === 'market' && s.id.startsWith(`${slot}.`))) { this.fillShelves(Number(slot)); this.notice('🚚 The delivery van has arrived'); } }
    }
    this.refreshPrices();
    this.policeHourly(total);
    this.queueDirty = true;
  },

  // Once a day: bills arrive, go late, or cost you your home.
  daily(day) {
    for (const e of tickBills(this.hard, day)) {
      if (e.type === 'issued') this.notice('📬 Bills have come in the mail');
      if (e.type === 'late') {
        this.notice('⚠️ A bill is late: 10% added');
        for (const f of onLate(this.hard, e.bill)) if (f.type === 'foreclose') this.repossess(f.loan);
      }
      if (e.type === 'evicted') { this.hard.credit.score = Math.max(300, this.hard.credit.score + SCORE_EVENTS.evicted); this.notice('🔒 Evicted! The locks have been changed'); this.sfx.nope(); }
    }
    for (const e of creditDaily(this.hard, day)) if (e.type === 'statement') this.notice('🏦 The bank has sent statements');
    this.landlordDaily(day);
    this.hard.heat = decayHeat(this.hard.heat, 1);                       // attention fades
    const sky = weatherAt(day, 600).kind;
    this.hard.power = (this.hard.power || 0) + powerToday(this.hard.beds, POWER_DAY);          // grow lamps run up the power bill
    this.hard.beds = tickBeds(this.hard.beds, sky === 'rain' || sky === 'snow');          // the gardens grow (rain waters them)
    this.refreshBeds();
    this.hard.custs = customersDaily(this.hard.custs, day);              // those who go without come down
    for (const c of this.characters) {                                   // a day without: the hook eases, but a real habit makes it miserable
      const h = this.hard.hooks[c.id];
      if (!h) continue;
      const r = habitDaily(h, this.totalMinutes());
      if (r.habit.hook > 0) this.hard.hooks[c.id] = r.habit; else delete this.hard.hooks[c.id];
      if (r.withdrawal) { apply(c.needs, WITHDRAWAL); floatText(this, c.x, c.headTopY() - 40, '🥀 Rough day without it', 22); }
    }
    if (!this.serving) this.policeDaily(day);
    this.updateNav();
    this.queueDirty = true;
  },

  // --- the police ---------------------------------------------------------------------------
  policeRng() { return Math.random(); },

  // Every hour spent outdoors with heat on you: a patrol may stop you.
  policeHourly(total) {
    if (this.policeEvent || this.policeBusy || this.serving) return;
    const c = this.selected || this.characters[0];
    if (!c || c.sleeping || !this.zone) return;
    const sec = sectionAt(this.zone, c.x).section;
    if (!sec || !ROOMS[sec.type].outdoor) return;
    const p = stopChance(this.hard.heat, { record: this.hard.record, carrying: this.hard.goods.some(g => g.at === 'carry'), night: this.night });
    if (p > 0 && this.policeRng() < p) this.policeEvent = { kind: 'stop', officer: officerFor(total) };
  },

  // Once a night: with enough heat and something at home to find, a raid.
  policeDaily(day) {
    if (this.policeEvent || this.policeBusy) return;
    const h = this.hard, stash = h.goods.some(g => g.at === 'home') || hasPlants(h.beds, h.raw);
    if (this.policeRng() < raidChance(h.heat, { record: h.record, stash })) this.policeEvent = { kind: 'raid', officer: officerFor(day) };
  },

  // Launch a waiting police event as soon as the room is running (not mid-fade, not behind another window).
  policeLaunch() {
    if (!this.policeEvent || this.policeBusy || this.switching || this.decor) return;
    this.policeBusy = true;
    const event = this.policeEvent;
    this.policeEvent = null;
    this.characters.forEach(c => { c.goal = null; });
    this.scene.pause();
    this.scene.launch('Police', { room: this, event });
  },

  policeDone() { this.policeBusy = false; this.queueDirty = true; },

  // Time inside: the days pass (bills arrive, plants dry out, the gig lapses), you come out with a record and a fine to pay.
  serveSentence(days, fine) {
    const h = this.hard;
    this.serving = true;
    if (!h.record) h.credit.score = Math.max(300, h.credit.score + SCORE_EVENTS.arrested);
    h.record = true; h.gig = null;
    this.cash -= Math.min(this.cash, fine); h.debt += Math.max(0, fine - this.cash);
    for (let i = 0; i < days; i++) { this.clock.day += 1; this.lastDay = this.clock.day; this.daily(this.clock.day); }
    this.clock.minute = 8 * 60;
    this.lastHour = Math.floor(this.totalMinutes() / 60);
    this.hourly(this.totalMinutes());
    this.serving = false;
    for (const c of this.characters) { c.needs.hunger = 60; c.needs.energy = 70; c.needs.hygiene = 50; c.needs.warmth = 70; c.needs.mood = 35; c.current = null; c.queue = []; }
    h.heat = RECOVER_HEAT;
    const park = this.city.findIndex(b => b && b.name === 'The Park');
    if (park >= 0) this.goToZone(`${park}.0`);
    this.notice(`⛓️ Out after ${days} day${days === 1 ? '' : 's'}`);
    this.updateNav(); this.dirty = true;
  },

  // Using a unit of product yourself (from the stash at the bench): a lift now, a hook that grows.
  useProduct(c, index) {
    const p = this.hard.goods[index];
    if (!p) return false;
    const e = useEffect(p);
    apply(c.needs, e.needs);
    this.hard.hooks[c.id] = useHabit(this.hard.hooks[c.id] || newHabit(), p, this.totalMinutes());
    this.hard.goods = p.units > 1 ? this.hard.goods.map((g, i) => (i === index ? { ...g, units: g.units - 1 } : g)) : this.hard.goods.filter((_, i) => i !== index);
    floatText(this, c.x, c.headTopY() - 30, '✨ That hit the spot', 22);
    this.dirty = true;
    return true;
  },

  // Garden beds: each is identified by its lot and where it stands; the drawing follows the plant.
  bedKey(prop) { return `${this.zoneSlot()}:${Math.round(prop.x)}`; },
  refreshBeds() {
    if (!this.zone) return;
    for (const p of this.props) {
      if (!p.def.plot || !p.active) continue;
      let key = this.bedKey(p);
      if (p.bedKey && p.bedKey !== key && this.hard.beds[p.bedKey]) { this.hard.beds[key] = this.hard.beds[p.bedKey]; delete this.hard.beds[p.bedKey]; }      // it was moved: the plant goes with it
      p.bedKey = key;
      const b = this.hard.beds[key];
      if (b) {                                           // sun and rain outdoors; indoors it needs a lamp in the same room
        const sec = sectionAt(this.zone, p.x).section, outdoor = Boolean(sec && ROOMS[sec.type].outdoor), open = PLOTS[p.type].open;
        const lamp = this.props.some(q => q.type === 'growlamp' && q.active && sectionAt(this.zone, q.x).section === sec);
        b.out = outdoor; b.lit = CROPS[b.crop].dark ? !outdoor && lamp : (outdoor && open) || lamp;       // the dark plant wants a lamp and a roof
      }
      p.setState(`${stage(b)}:${b ? b.crop : ''}`);
    }
  },

  // The crop comes home: into the bag, then the larder, and anything that does not fit is left to rot.
  harvestBed(key, c) {
    const bed = this.hard.beds[key];
    if (!bed || stage(bed) !== 'ready') return;
    const { item, count } = harvestOf(bed), now = this.totalMinutes();
    if (CROPS[item].dark) {                              // not food: it goes in the stash, for the bench
      this.hard.raw = give(this.hard.raw, item, count);
      delete this.hard.beds[key];
      floatText(this, c.x, c.headTopY() - 30, `+${count} ${CROPS[item].label}`, 22);
      return;
    }
    let kept = 0;
    for (let i = 0; i < count; i++) {
      const inBag = addFood(c.bag, item, now, this.bagCap(c));
      if (inBag) { c.bag = inBag; kept++; continue; }
      const inLarder = addFood(this.hard.larder, item, now, LARDER_CAP);
      if (inLarder) { this.hard.larder = inLarder; kept++; }
    }
    delete this.hard.beds[key];
    floatText(this, c.x, c.headTopY() - 30, `+${kept} ${item}${kept < count ? ' (no room for the rest)' : ''}`, 22);
  },

  // The lot we are standing in, and whether a piece of furniture belongs to a home that isn't ours.
  zoneSlot() { return Number(this.zoneKey.split('.')[0]); },
  isLocked(prop, type) {
    if (type === 'rent') return false;
    const s = this.zone && sectionAt(this.zone, prop.x).section;
    const b = this.city[this.zoneSlot()];
    return Boolean(s && HOME_ROOMS.includes(s.type) && !(this.hard.home && this.hard.home.slot === this.zoneSlot()) && !(b && b.owned));
  },

  // The labour board gives you today's gig: somewhere in town, to reach by a deadline.
  takeGig(c) {
    const total = this.totalMinutes();
    if (this.hard.gig && standing(this.hard.gig, total) !== 'gone') return;
    const gig = pickGig(this.clock.day, total);
    this.hard.gig = gig;
    this.sfx.ding();
    floatText(this, c.x, c.headTopY() - 40, `${gig.title} at ${gig.siteName}`, 24);
    this.queueDirty = true;
  },

  // A newspaper from the stand ($80): the classified ads.
  buyPaper(c) {
    if (this.cash < PAPER_PRICE) { floatText(this, c.x, c.headTopY() - 30, `A paper is $${PAPER_PRICE}`, 22); this.sfx.nope(); c.current = null; return; }
    this.cash -= PAPER_PRICE; this.updateNav(); this.sfx.coin();
    c.current.waiting = true; this.scene.pause(); this.scene.launch('Device', { room: this, kind: 'paper' });
  },

  // A phone from the kiosk: cash, once.
  buyPhone(c) {
    if (this.hard.phone) floatText(this, c.x, c.headTopY() - 30, 'You already have a phone', 22);
    else if (this.cash < PHONE_PRICE) { floatText(this, c.x, c.headTopY() - 30, `A phone is $${PHONE_PRICE}`, 22); this.sfx.nope(); }
    else { this.cash -= PHONE_PRICE; this.hard.phone = true; this.updateNav(); this.sfx.ding(); floatText(this, c.x, c.headTopY() - 30, '📱 Got a phone!', 24); }
    this.queueDirty = true;
  },

  openPhone() {
    if (this.switching || this.decor || !this.hard.phone) return;
    this.scene.pause();
    this.scene.launch('Device', { room: this, kind: 'phone' });
  },

  // The bills window closed: whoever was reading them is done.
  billsClosed() {
    for (const c of this.characters) if (c.current && c.current.waiting && ['mail', 'pay', 'use', 'news', 'deal', 'tend', 'buyseeds', 'mix', 'sell', 'bank', 'buypack'].includes(c.current.type)) { c.current = null; this.queueDirty = true; }
  },

  // At the motel front desk: pay the first week and the room is yours.
  rentRoom(c, prop) {
    const slot = this.zoneSlot(), r = rent('motel', slot, this.cash, this.clock.day);
    if (!r) { floatText(this, c.x, c.headTopY() - 30, `You need $${HOUSING.motel.bills.reduce((n, [, a]) => n + a, 0)} for the first week`, 22); this.sfx.nope(); return; }
    if (this.hard.home && this.hard.home.slot !== slot) { this.hard.debt += totalDue(this.hard.bills); this.hard.bills = []; }          // the old place is given up
    this.cash = r.cash; this.hard.home = r.home; this.hard.lockedOut = null;
    this.updateNav(); this.sfx.ding();
    floatText(this, c.x, c.headTopY() - 30, `🔑 Room rented: $${r.cost}`, 24);
    this.queueDirty = true;
  },

  // Your rentals: applicants turn up, rent comes in (or does not), repairs are asked for, tenants leave. One summary notice a day.
  landlordDaily(day) {
    const rng = this.landRng || Math.random;
    let rent = 0, late = 0, news = [];
    this.city.forEach((b, slot) => {
      if (!b || !b.owned || !b.let) return;
      for (const e of letDaily(b.let, day, rng)) {
        if (e.type === 'rent') rent += e.amount;
        else if (e.type === 'late') late++;
        else if (e.type === 'applicant') news.push(`${e.name} applied for ${b.name}`);
        else if (e.type === 'repair') news.push(`${b.name}: ${e.what.toLowerCase()}`);
        else if (e.type === 'left') { if (e.refund) this.wallet = Math.max(0, this.wallet - e.refund); news.push(`${e.name} left ${b.name}${e.runner ? ' without a word' : ''}`); }
        else if (e.type === 'notice') news.push(`${e.name} gave notice at ${b.name}`);
      }
    });
    if (rent) { this.wallet += rent; this.sfx.coin(); this.notice(`🏘 Rent in: $${rent.toLocaleString('en-US')}`); }
    if (late) this.notice(`🏘 ${late} tenant${late > 1 ? 's' : ''} missed the rent`);
    if (news.length) this.notice(`🏘 ${news.slice(0, 2).join(' · ')}${news.length > 2 ? ` · +${news.length - 2} more` : ''}`);
    if (rent || late || news.length) { this.dirty = true; this.updateNav(); }
  },

  // The bank takes a house after missed payments: it goes back on the market, what it sold for pays the loan, the rest is debt or yours.
  repossess(loan) {
    const h = this.hard, r = foreclose(h, loan), b = this.city[r.slot];
    if (b) { delete b.owned; delete b.let; b.forSale = Math.round(loan.value / SALE_RATE); }
    this.wallet += r.surplus; h.debt += r.shortfall;
    if (h.home && h.home.slot === r.slot) { h.home = null; h.lockedOut = r.slot; h.bills = h.bills.filter(x => !['rent', 'utilities'].includes(x.kind)); }
    this.sfx.nope(); this.notice('🏦 The bank has taken a house'); this.dirty = true;
  },

  // Tap your money: pay with cash or with your card.
  togglePay() {
    const cr = this.hard.credit;
    if (!cr.cards.length) { this.notice('You need a card: ask at the bank'); this.sfx.nope(); return; }
    cr.pay = cr.pay === 'card' ? 'cash' : 'card';
    this.updateNav(); this.sfx.click(); this.dirty = true;
  },

  // Move into a house you own: no rent, only the power and water. The old place is given up (what was owed on it becomes debt).
  moveIn(slot) {
    const h = this.hard;
    if (h.home && h.home.slot === slot) return;
    if (h.home) { h.debt += totalDue(h.bills); h.bills = []; }
    h.home = newHome('owned', slot, this.clock.day + HOUSING.owned.cycle); h.lockedOut = null;
    this.updateNav(); this.dirty = true;
  },

  notice(text) { const c = this.selected || this.characters[0]; if (c) floatText(this, c.x, c.headTopY() - 50, text, 22); },

  // A shop's stock (made the first time we need it: full shelves, the first van due next Monday).
  shopFor(slot) {
    if (!this.hard.shops[slot]) this.hard.shops[slot] = newShop(SHOP_ITEMS, this.totalMinutes());
    return this.hard.shops[slot];
  },

  // After a delivery, put the missing items back on the shelves of this room.
  fillShelves(slot) {
    for (const sec of this.zone.sections.filter(s => s.type === 'market' && s.id.startsWith(`${slot}.`))) {
      let n = 0;
      for (const sh of shelvesFor(sec.type, sec.w)) sh.items.forEach((key, i) => {
        const pos = { x: sec.offset + sh.x + SHELF_STEP / 2 + i * SHELF_STEP, y: sh.y };
        const there = this.bodies.some(b => b.onShelf && !b.dead && b.shop === slot && Math.abs(b.shelfPos.x - pos.x) < 4 && Math.abs(b.shelfPos.y - pos.y) < 4);
        if (!there && inStock(this.shopFor(slot), key)) this.spawnShelfItem(key, pos, { pop: true, delay: n++ * 50, price: hardPriceOf(key), shop: slot });
      });
    }
  },

  // `mins` game minutes pass: the clock, the weather on everyone, needs, actions, free will.
  stepGame(mins) {
    advance(this.clock, mins);
    if (isNight(this.clock) !== this.night) this.setNight(isNight(this.clock));
    const toggles = this.hard.setup.toggles, total = this.totalMinutes(), hour = Math.floor(total / 60);
    if (hour !== this.lastHour) { this.lastHour = hour; this.hourly(total); }
    const today = Math.floor(total / 1440);
    if (today !== this.lastDay) { this.lastDay = today; this.daily(today); }
    for (const c of this.characters) {
      tick(c.needs, mins, { sleeping: c.sleeping ? 'bed' : c.rough ? 'bench' : c.collapsed ? 'floor' : false, env: toggles.survival ? this.envFor(c) : undefined });
      if (c.rough) this.roughRisks(c, mins);
      this.checkCollapse(c);
      const d = drain(this.hard.hooks[c.id] ? this.hard.hooks[c.id].hook : 0);      // a habit wears you down
      if (d) apply(c.needs, Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v * mins])));
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
      for (const e of roughHour({ hour: hourOf(this.clock), cash: this.wallet, publicPlace: this.isOutdoors(c), toggles: this.hard.setup.toggles })) {
        if (e.type === 'moveOn') { this.stopRough(c); apply(c.needs, { mood: -8 }); floatText(this, c.x, c.headTopY() - 30, '👮 "Move along."', 24); this.cancelCurrent(c); }
        if (e.type === 'theft') { this.wallet = Math.max(0, this.wallet - e.amount); const lost = e.phone && this.hard.phone; if (lost) this.hard.phone = false; this.updateNav(); floatText(this, c.x, c.headTopY() - 30, `Robbed! −$${e.amount}${lost ? ' and your phone' : ''}`, 24); apply(c.needs, { mood: -10 }); }
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

  // Can `c` do `action` at `prop` right now? { ok, why }. The menu greys out what can't be done and says why.
  canDo(action, prop, c) {
    const hours = prop.def.hours;
    if (!openNow(hours, this.clock.minute)) return { ok: false, why: `Closed until ${pad(nextOpen(hours, this.clock.minute))}:00` };
    if (this.isLocked(prop, action)) return { ok: false, why: 'Not your home' };
    if (action === 'eat' && !this.hard.larder.length && !c.bag.length) return { ok: false, why: 'Nothing to eat: buy food at the shop' };
    if (action === 'store' && !c.bag.length) return { ok: false, why: 'Nothing in your bag' };
    if (action === 'store' && this.hard.larder.length >= LARDER_CAP) return { ok: false, why: 'The larder is full' };
    if (action === 'sell' && !this.hard.goods.some(g => g.at === 'carry')) return { ok: false, why: 'Nothing on you to sell: carry a batch from the bench' };
    if (action === 'mix' && !Object.values(this.hard.raw).some(n => n > 0)) return { ok: false, why: 'Nothing to mix: grow something first' };
    if (action === 'buyseeds' && !openNow(hours, this.clock.minute)) return { ok: false, why: 'Closed' };
    if (action === 'sleep' && prop.sleeper) return { ok: false, why: 'Someone is in it' };
    if ((action === 'sit' || action === 'rough') && !freeSeat(prop.def.ride, prop.riders.map(r => r.riding))) return { ok: false, why: 'Taken' };
    if (action === 'labour' && this.hard.gig && standing(this.hard.gig, this.totalMinutes()) !== 'gone') return { ok: false, why: `You already have a gig at ${this.hard.gig.siteName}` };
    if (action === 'work') {
      const gig = this.hard.gig;
      if (!gig) return { ok: false, why: 'No work: ask at the labour board (06:00-09:00)' };
      if (standing(gig, this.totalMinutes()) === 'gone') return { ok: false, why: 'They found someone else' };
      const here = this.zone && this.zone.sections.some(s => s.type === gig.site);
      if (!here) return { ok: false, why: `Your gig is at ${gig.siteName}` };
    }
    if (action === 'pay' && !this.hard.bills.length) return { ok: false, why: 'No bills to pay' };
    if (action === 'news' && this.cash < PAPER_PRICE) return { ok: false, why: `A paper is $${PAPER_PRICE}` };
    if (action === 'buyphone' && this.hard.phone) return { ok: false, why: 'You have a phone' };
    if (action === 'buyphone' && this.cash < PHONE_PRICE) return { ok: false, why: `A phone is $${PHONE_PRICE}` };
    if (action === 'rent' && this.cash < HOUSING.motel.bills.reduce((n, [, a]) => n + a, 0)) return { ok: false, why: 'You need $3,200 for the first week' };
    return { ok: true, why: '' };
  },

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
    if (type === 'eat' && !prop) {                                  // a snack from the bag, right where you stand
      if (!c.bag.length) { floatText(this, c.x, c.headTopY() - 20, 'The bag is empty', 22); return; }
      c.current = { type, prop: null, phase: 'do', elapsed: 0, fed: false }; c.idleMin = 0; return;
    }
    if (!prop || !prop.active || (type === 'sleep' && prop.sleeper)) { floatText(this, c.x, c.headTopY() - 20, '…', 24); return; }
    const can = this.canDo(type, prop, c);
    if (!can.ok) { floatText(this, c.x, c.headTopY() - 30, can.why, 24); this.sfx.nope(); return; }
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
      else if (type === 'mail' || type === 'pay') { c.current.waiting = true; this.scene.pause(); this.scene.launch('Bills', { room: this, canPay: type === 'pay' }); }
      else if (type === 'rent') this.rentRoom(c, prop);
      else if (type === 'work') { c.current.waiting = true; c.current.arrived = this.totalMinutes(); const gig = this.hard.gig; if (standing(gig, c.current.arrived) === 'late') floatText(this, c.x, c.headTopY() - 40, 'You are late: pay cut', 22); this.openGame('stack', prop, { crate: gig.crate, title: gig.title }); }
      else if (type === 'deal') { c.current.waiting = true; this.scene.pause(); this.scene.launch('Deal', { room: this, who: c }); }
      else if (type === 'out') { c.current = null; this.queueDirty = true; this.openMap(); }
      else if (type === 'tend') { c.current.waiting = true; this.scene.pause(); this.scene.launch('Bed', { room: this, key: this.bedKey(prop), who: c, type: prop.type }); }
      else if (type === 'buypack') { c.current.waiting = true; this.openBag(c, true); }
      else if (type === 'bank') { c.current.waiting = true; this.scene.pause(); this.scene.launch('Bank', { room: this }); }
      else if (type === 'sell') { c.current.waiting = true; this.scene.pause(); this.scene.launch('Sell', { room: this, who: c }); }
      else if (type === 'mix') { c.current.waiting = true; this.scene.pause(); this.scene.launch('Lab', { room: this }); }
      else if (type === 'buyseeds') { c.current.waiting = true; this.scene.pause(); this.scene.launch('Nursery', { room: this }); }
      else if (type === 'use') { c.current.waiting = true; this.scene.pause(); this.scene.launch('Device', { room: this, kind: 'computer' }); }
      else if (type === 'news') this.buyPaper(c);
      else if (type === 'buyphone') this.buyPhone(c);
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
    if (cur.type === 'store' && !cur.fed) { cur.fed = true; this.putAway(c, cur.prop); }
    if (cur.type === 'labour' && !cur.fed) { cur.fed = true; this.takeGig(c); }
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
    const arrived = c && c.current && c.current.arrived;
    if (c && c.current && c.current.waiting) { c.current = null; this.queueDirty = true; }
    if (!result) return;
    if (id === 'stack' && this.hard.gig) {                                // the shift is done: paid by how well and how punctually
      const pay = payFor(this.hard.gig, arrived ?? this.totalMinutes(), result.performance);
      this.hard.gig = null;
      this.cash += pay; this.updateNav();
      if (c) { apply(c.needs, Object.fromEntries(Object.entries(SHIFT_DRAIN).map(([k, v]) => [k, v * SHIFT_MINUTES]))); floatText(this, c.x, c.headTopY() - 30, `+$${pay}`, 28); }
      this.sfx.coin();
      this.passTime(SHIFT_MINUTES);
      return;
    }
    if (result.cash) { this.cash += result.cash; this.updateNav(); if (c) floatText(this, c.x, c.headTopY() - 30, `+$${result.cash}`, 26); }
    if (result.minutes) this.passTime(result.minutes);
  },

  // Eat something: from the meal line (free), the fridge/pantry (the household's larder) or the bag you carry, oldest food first.
  eatFrom(c, prop) {
    let key;
    if (prop && prop.def.hardActions.includes('queue')) {            // the shelter's meal line (free)
      const pool = prop.def.pool.filter(k => CATALOG[k] && CATALOG[k].kind === 'food');
      key = pool[Math.floor(Math.random() * pool.length)] || 'bread';
    } else {
      const total = this.totalMinutes(), fromBag = !prop || !this.hard.larder.length;
      const list = expire(fromBag ? c.bag : this.hard.larder, total).kept, best = takeBest(list);
      if (!best) { floatText(this, c.x, c.headTopY() - 30, 'Nothing to eat', 24); if (c.current) c.current.elapsed = 999; return; }
      key = best.item.k;
      if (fromBag) c.bag = best.rest; else this.hard.larder = best.rest;
    }
    const item = this.createItem(key, c.x, c.lane);
    eat(this, item, c);
    if (prop) prop.boing(0.5);
    this.queueDirty = true;
  },

  // Put the food you carry into the fridge or pantry (a fridge keeps it twice as long).
  putAway(c, prop) {
    const r = store(c.bag, this.hard.larder, this.totalMinutes(), LARDER_CAP, prop.type === 'fridge');
    c.bag = r.from; this.hard.larder = r.to;
    floatText(this, c.x, c.headTopY() - 30, r.moved ? `Put away ${r.moved}` : c.bag.length ? 'No room!' : 'Nothing to put away', 22);
    prop.boing(0.5); this.queueDirty = true;
  },

  // Room in this person's bag for food: the size of the bag they own, less the product batches they carry.
  bagCap(c) { return foodCap(this.hard.packs, this.hard.goods, c.id); },

  openBag(c, shop = false) {
    if (this.switching) return;
    this.scene.pause(); this.scene.launch('Pack', { room: this, who: c || this.selected || this.characters[0], shop });
  },

  // A food item dropped on a person goes in their bag. Returns true if it was taken.
  addToBag(c, item) {
    const next = addFood(c.bag, item.key, this.totalMinutes(), this.bagCap(c));
    if (!next) { floatText(this, c.x, c.headTopY() - 30, 'The bag is full', 22); this.sfx.nope(); return false; }
    c.bag = next;
    this.discard(item, { x: c.x, y: c.y, scale: 0.2, duration: 200 });
    this.sfx.pop(); floatText(this, c.x, c.headTopY() - 30, `🎒 ${c.bag.length + carriedBy(this.hard.goods, c.id)}/${slotsOf(this.hard.packs, c.id)}`, 22);
    this.queueDirty = true;
    return true;
  },

  // Called from eating (interactions.eat): hunger goes up by how filling the food is.
  hardFed(c, key) {
    if (!c.needs) return;
    apply(c.needs, { hunger: nutritionOf(key) });
    floatText(this, c.x, c.headTopY() - 30, `+${nutritionOf(key)}`, 20);
    this.queueDirty = true;
  },

  // --- free will ----------------------------------------------------------------------------------
  usable(p, action, c) {
    return p.active && p.def.hardActions && p.def.hardActions.includes(action) && openNow(p.def.hours, this.clock.minute)
      && !this.isLocked(p, action) && (action !== 'eat' || this.hard.larder.length > 0 || (c && c.bag.length > 0)) && (action !== 'store' || !c || c.bag.length > 0)
      && (action !== 'sleep' || !p.sleeper) && (action !== 'sit' || freeSeat(p.def.ride, p.riders.map(r => r.riding)))
      && (action !== 'rough' || freeSeat(p.def.ride, p.riders.map(r => r.riding)));
  },

  // Nearest suitable piece of furniture for an action (null if none here).
  propFor(action, c) {
    return this.props.filter(p => this.usable(p, action, c)).sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0] || null;
  },

  // What would this person do about `want` here: { action, prop } or null. A hungry person with no fridge joins the meal line,
  // and as a last resort searches a bin; a tired one without a bed finds a bench.
  resolveWant(want, c) {
    if (want === 'eat' && c.bag.length) return { action: 'eat', prop: null };                    // there is food in the bag
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
    if (!want && c.bag.length && c.needs.hunger > 55) { const p = this.propFor('store', c); if (p) { this.queueAction(c, 'store', p); return; } }       // home with the shopping: put it away
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
    const hint = add(this.add.text(x, y + 38, '', { fontSize: '17px', color: '#fff7e0', stroke: '#3a2a22', strokeThickness: 4 }).setOrigin(0.5).setDepth(9500));
    actions.forEach((a, i) => {
      const def = ACTIONS[a], bx = x + (i - (actions.length - 1) / 2) * 122, can = this.canDo(a, prop, c);
      add(inkButton(this, bx, y, `${def.icon} ${def.label}`, { w: 116, h: 44, size: 19, fill: can.ok ? COLORS.green : COLORS.grey, depth: 9500, seed: 80 + i, onTap: () => {
        if (!can.ok) { hint.setText(can.why); this.sfx.nope(); return; }          // greyed out: say why instead of doing nothing
        this.queueAction(c, a, prop); this.closeActionMenu(); this.sfx.pop();
      } }));
    });
    this.sfx.click();
  },

  closeActionMenu() { (this.actionMenu || []).forEach(o => o.destroy()); this.actionMenu = []; },

  // --- the hard-mode HUD: clock + speed, needs, and the queue --------------------------------------
  createHardHud() {
    const X = 14, Y = 70, CW = 330, CH = 172, D = TEXT_DEPTH, add = o => { this.hudL.add(o); return o; }, R = o => { this.hudR.add(o); return o; };
    this.cardRect = { x: X, y: Y, w: CW, h: CH };
    add(inkPanel(this, X + CW / 2, Y + CH / 2, CW, CH, { fill: CARD, depth: D - 2, seed: 61, radius: 24 }));
    // who you are: a face in a ring that follows the mood, the name, a mood pill and the cash
    this.moodRing = add(this.add.graphics().setDepth(D - 1));
    this.moodFace = add(spriteImage(this, 'need-mood', X + 40, Y + 40, 40).setDepth(D));
    this.nameText = add(this.add.text(X + 78, Y + 12, '', { fontSize: '25px', color: TEXT, fontStyle: 'bold' }).setDepth(D));
    this.moodPill = null; this.moodShown = '';
    this.coinText = add(inkChip(this, X + CW - 70, Y + 34, '', { size: 21, depth: D, h: 38, fill: PAPER, seed: 63 }));
    this.coinText.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.togglePay());
    add(this.add.graphics().setDepth(D - 1)).lineStyle(2, 0xcdbfa6, 1).beginPath().moveTo(X + 16, Y + 76).lineTo(X + CW - 16, Y + 76).strokePath();
    // the five needs: a drawn icon over a little meter
    this.needsGfx = add(this.add.graphics().setDepth(D));
    this.needIcons = NEED_KEYS.map((k, i) => add(spriteImage(this, NEED_ICONS[k], X + 40 + i * 62, Y + 92, 24).setDepth(D)));
    // pockets: the bag, the larder and the heat, and a snack button
    this.pocketText = add(this.add.text(X + 18, Y + CH - 33, '', { fontSize: '17px', color: TEXT, fontFamily: UI_FONT, fontStyle: 'bold' }).setDepth(D));
    add(hitZone(this, X + 110, Y + CH - 24, 210, 34, () => this.openBag(), D + 1));                            // tap your pockets to see the bag
    this.bagButton = add(inkButton(this, X + CW - 66, Y + CH - 26, '🍎 Snack', { w: 104, h: 32, size: 16, fill: COLORS.gold, depth: D, seed: 95, onTap: () => { const c = this.selected || this.characters[0]; if (c && !this.queueAction(c, 'eat', null)) this.sfx.nope(); } }));
    // the clock, the weather and the speed, top right
    const RX = W - 14 - 302, RY = 70;
    R(inkPanel(this, RX + 151, RY + 38, 302, 76, { fill: CARD, depth: D - 2, seed: 64, radius: 22 }));
    this.clockText = R(this.add.text(RX + 18, RY + 10, '', { fontSize: '22px', color: TEXT, fontFamily: UI_FONT, fontStyle: 'bold' }).setDepth(D));
    this.weatherText = R(this.add.text(RX + 18, RY + 42, '', { fontSize: '15px', color: '#7a6a58', fontFamily: UI_FONT, fontStyle: 'bold' }).setDepth(D));
    this.speedButtons = SPEEDS.map((s, i) => R(inkButton(this, RX + 160 + i * 38, RY + 38, ['⏸', '▶', '⏩', '⏭'][i], { w: 34, h: 34, size: 15, fill: PAPER, depth: D, seed: 90 + i, onTap: () => this.setSpeed(i) })));
    this.alertChips = [];
    this.shopChip = R(inkChip(this, W - 150, 178, '', { size: 15, depth: D, h: 30, fill: CARD })).setVisible(false);
    this.billChip = R(inkChip(this, W - 150, 216, '', { size: 15, depth: D, h: 30, fill: 0xffe3d4 })).setVisible(false);
    this.gigChip = R(inkChip(this, W - 150, 254, '', { size: 14, depth: D, h: 30, fill: 0xe3f2d0 })).setVisible(false);
    this.phoneBtn = R(inkDisc(this, W - 36 - 4 * 56, 32, 'icon-phone', { onTap: () => this.openPhone(), seed: 49 }));
    this.progressGfx = add(this.add.graphics().setDepth(D + 1));
    this.queueUI = [];
    this.setSpeed(1);
    this.queueDirty = true;
    this.updateNav();
  },

  setSpeed(i) {
    this.speed = i;
    this.speedButtons.forEach((b, n) => b.setFill(n === i ? COLORS.gold : PAPER));
    this.sfx.click();
  },

  refreshHardHud() {
    const { x: X, y: Y, w: CW } = this.cardRect, RX = W - 14 - 302;
    this.clockText.setText(label(this.clock));
    this.phoneBtn.setVisible(this.hard.phone);
    const w = this.weatherNow();
    this.weatherText.setText(`${weatherLabel(w)} · ${w.season} ${dayInSeason(this.clock.day)}`);
    const c = this.selected || this.characters[0];
    if (!c || !c.needs) return;
    this.coinText.x = X + CW - 16 - this.coinText.width / 2;
    const g = this.needsGfx.clear(), avg = NEED_KEYS.reduce((n, k) => n + c.needs[k], 0) / NEED_KEYS.length;
    NEED_KEYS.forEach((k, i) => inkMeter(g, X + 40 + i * 62 - 25, Y + 108, 50, 14, c.needs[k] / 100, BAR_COLORS[k], 5 + i));
    const st = status(c.needs), hook = this.hard.hooks[c.id] ? this.hard.hooks[c.id].hook : 0;
    const flags = [st.starving ? 'Starving' : st.hungry && 'Hungry', st.exhausted ? 'Exhausted' : st.tired && 'Tired', st.freezing ? 'Freezing' : st.cold && 'Cold', st.dirty && 'Dirty', habitLabel(hook) && habitLabel(hook)[0].toUpperCase() + habitLabel(hook).slice(1)].filter(Boolean);
    const mood = avg >= 78 ? ['Feeling great', 'laugh', 0x78c363, 0xd9f0c8] : avg >= 52 ? ['Feeling okay', 'need-mood', 0xf0c040, 0xfff0b8] : avg >= 30 ? ['Feeling low', 'sour', 0xf2ae44, 0xffddb0] : ['Feeling awful', 'yuck', 0xe5685c, 0xf8c8c0];
    const shown = flags.length ? flags.slice(0, 2).join(' · ') : mood[0];
    this.nameText.setText(c.name);
    if (this.moodShown !== shown) { this.moodShown = shown; if (this.moodPill) this.moodPill.destroy(); this.moodPill = pinTo(this.hudL, inkChip(this, X + 78, Y + 54, shown, { size: 15, depth: TEXT_DEPTH, h: 26, seed: 62, fill: flags.length ? 0xf8c8c0 : mood[3] })); this.moodPill.x = X + 78 + this.moodPill.width / 2; }
    this.moodFace.setTexture(ensureSpriteTexture(this, mood[1]));
    this.moodRing.clear().fillStyle(0x4a382c, 0.92).fillCircle(X + 42, Y + 45, 29).fillStyle(mood[2], 1).fillCircle(X + 40, Y + 40, 29).lineStyle(3, INK, 1).strokeCircle(X + 40, Y + 40, 29).fillStyle(0xfff6dc, 1).fillCircle(X + 40, Y + 40, 23);
    this.pocketText.setText(`🎒 ${c.bag.length + carriedBy(this.hard.goods, c.id)}/${slotsOf(this.hard.packs, c.id)}   🧊 ${this.hard.larder.length}${this.hard.heat ? `   🚨 ${this.hard.heat}` : ''}`);
    const gig = this.hard.gig, nowT = this.totalMinutes();
    this.gigChip.setVisible(Boolean(gig) && standing(gig, nowT) !== 'gone');
    if (gig) this.gigChip.setLabel(`🧱 ${gig.title} · ${gig.siteName} by ${timeLabel({ minute: gig.due % 1440 })}${standing(gig, nowT) === 'late' ? ' · LATE' : ''}`);
    const due = this.hard.bills, late = overdue(due, this.clock.day).length;
    this.billChip.setVisible(due.length > 0 && due.every(b => b.seen)).setLabel(`📬 ${due.length} bill${due.length > 1 ? 's' : ''} · $${totalDue(due).toLocaleString('en-US')}${late ? ' · LATE' : ''}`);
    this.props.filter(p => p.def.behaviour === 'mail').forEach(p => p.setState(unseen(due).length > 0));         // the flag goes up when there is post
    const market = this.zone && this.zone.sections.find(s => s.type === 'market');
    this.shopChip.setVisible(Boolean(market));
    if (market) {
      const shop = this.shopFor(Number(market.id.split('.')[0])), total = this.totalMinutes();
      this.shopChip.setLabel(`${openNow(SHOP_HOURS, this.clock.minute) ? 'Open' : 'Closed'} · ${totalStock(shop)} in stock · van due ${label({ day: Math.floor(shop.due / 1440), minute: shop.due % 1440 })}${total > shop.due ? ' (late)' : ''}`);
    }
    for (const chip of [this.shopChip, this.billChip, this.gigChip]) chip.x = W - 14 - chip.width / 2;
    if (this.queueDirty) this.drawQueue(c);
    const pg = this.progressGfx.clear(), QY = QUEUE_Y + 29;               // how far through the current action
    if (c.current && c.current.phase === 'do') {
      const def = ACTIONS[c.current.type], done = def.until ? Math.min(1, Math.max(...Object.entries(def.until).map(([k, v]) => c.needs[k] / v))) : Math.min(1, c.current.elapsed / def.minutes);
      inkMeter(pg, 26, QY, 52, 10, done, 0x78c363, 3, 0);
    } else if (c.current) inkMeter(pg, 26, QY, 52, 10, 1, 0xf5c14a, 3, 0);               // on the way
  },

  // The queue: the current action first, then what's waiting. Tap one to cancel it.
  drawQueue(c) {
    this.queueDirty = false;
    this.queueUI.forEach(o => o.destroy());
    this.queueUI = [];
    const add = o => { this.hudL.add(o); this.queueUI.push(o); return o; };
    const items = [...(c.current ? [{ ...c.current, now: true }] : []), ...c.queue.map(q => ({ ...q, now: false }))];
    if (c.collapsed) items.unshift({ type: 'sleep', now: true, collapsed: true });
    items.slice(0, MAX_QUEUE + 1).forEach((q, i) => {
      const x = 52 + i * 58, def = ACTIONS[q.type];
      add(inkPanel(this, x, QUEUE_Y, q.now ? 52 : 46, q.now ? 52 : 46, { fill: q.now ? 0xfff0b8 : CARD, radius: 23, weight: q.now ? 3.6 : 2.8, seed: 70 + i, depth: TEXT_DEPTH, sheen: false }));
      add(this.add.text(x, QUEUE_Y, def.icon, { fontSize: q.now ? '28px' : '24px' }).setOrigin(0.5).setDepth(TEXT_DEPTH + 1));
      if (!q.collapsed) add(hitZone(this, x, QUEUE_Y, 52, 52, () => { if (q.now) this.cancelCurrent(c); else this.cancelQueued(c, i - (c.current ? 1 : 0)); this.queueDirty = true; }, TEXT_DEPTH + 2));
    });
  },
};
