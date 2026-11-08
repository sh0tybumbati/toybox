// End-to-end: the hidden way into adult (hard) mode, its separate save, the bank, and the way back to kid mode.
// Run with `npm run e2e` (it follows the smoke test).
import assert from 'node:assert/strict';
import { launch, findChrome, wait } from './harness.mjs';

if (!findChrome()) { console.log('e2e hard: no Chromium/Chrome found — skipping'); process.exit(0); }

const results = [];
async function step(name, fn) {
  const t = Date.now();
  try { await fn(); results.push({ name, ok: true }); console.log(`  ✔ ${name} (${Date.now() - t}ms)`); }
  catch (e) { results.push({ name, ok: false }); console.log(`  ✖ ${name}\n      ${String(e.message).split('\n').join('\n      ')}`); }
}

const g = await launch();
console.log('e2e hard mode:');
let window_cash = 0;
const S = name => `__toybox.scene.getScene('${name}')`;
const active = name => g.ev(`__toybox.scene.isActive('${name}')`);
const pinIn = async digits => { for (const d of digits) await g.ev(`${S('Pin')}.press('${d}')`); await wait(500); };

try {
  await g.open();
  await g.clearSave();
  await g.open();
  await g.room("r.tipsSeen = new Set(['grab','dress','walk','map','eat','cook','book','furniture','shop','build','play','decorate','box']); r.coins = 7; r.save();");
  await wait(2200);

  await step('the hidden switch: settings, seven taps on the version, the adult gate, a PIN, then the setup', async () => {
    await g.room('r.openSettings();');
    await wait(500);
    assert.ok(await active('Settings'), 'settings opened');
    for (let i = 0; i < 6; i++) await g.ev(`${S('Settings')}.tapVersion()`);
    assert.ok(!(await active('AdultGate')), 'six taps are not enough');
    await g.ev(`${S('Settings')}.tapVersion()`);
    await wait(500);
    assert.ok(await active('AdultGate'), 'the seventh tap opens the gate');
    await g.ev(`${S('AdultGate')}.proceed()`);
    await wait(700);
    assert.ok(await active('Pin'), 'a PIN is asked for');
    await pinIn('1234');
    assert.ok(await g.ev(`${S('Pin')}.first === '1234'`), 'asked to confirm it');
    await pinIn('1234');
    await wait(500);
    assert.ok(await active('HardSetup'), 'the setup screen opens once the PIN is set');
  });

  await step('starting an adult game: its own world, adults only, cash instead of coins, the creator opens', async () => {
    await g.ev(`(s => { s.setup.scenario = 'flat'; s.setup.failure = 'true'; s.setup.toggles.violence = false; s.start(); })(${S('HardSetup')})`);
    await wait(1500);
    await g.open();
    await wait(2500);
    const s = await g.room("return { hard: Boolean(r.hard), cash: r.cash, mode: r.mode, ages: r.characters.map(c => c.look.age), home: r.city[0] && r.city[0].name, zone: r.zoneKey, failure: r.hard && r.hard.setup.failure, violence: r.hard && r.hard.setup.toggles.violence, chip: r.coinText.list ? '' : '' };");
    assert.equal(s.hard, true); assert.equal(s.mode, 'hard'); assert.equal(s.cash, 60000);
    assert.deepEqual(s.ages, ['adult']); assert.equal(s.home, 'Flat'); assert.equal(s.zone, '0.0');
    assert.equal(s.failure, 'true'); assert.equal(s.violence, false);
    assert.ok(await active('Creator'), 'a new game starts by making your person');
    const ages = await g.ev(`${S('Creator')}.room.hard && true`);
    assert.ok(ages, 'the creator knows it is hard mode');
    await g.ev(`(c => { c.scene.resume('Room'); c.scene.stop(); })(${S('Creator')})`);
    await wait(300);
  });

  await step('the clock and needs: time passes at three speeds, needs decay, nobody hungry stays hungry, you can queue orders', async () => {
    const t0 = await g.room('return { day: r.clock.day, minute: r.clock.minute, hunger: r.characters[0].needs.hunger, speed: r.speed };');
    assert.equal(t0.speed, 1);
    await g.room('r.setSpeed(0);');
    const frozen = await g.room('return r.clock.minute;');
    await wait(1200);
    assert.equal(await g.room('return r.clock.minute;'), frozen, 'paused');
    await g.room('r.setSpeed(3);');
    await wait(2000);
    const fast = await g.room('return { m: r.clock.day * 1440 + r.clock.minute, h: r.characters[0].needs.hunger };');
    assert.ok(fast.m - (t0.day * 1440 + t0.minute) > 8, `time moved (${fast.m - (t0.day * 1440 + t0.minute)} game minutes in 2s at speed 3)`);
    assert.ok(fast.h < t0.hunger, 'and hunger fell');
    // a hungry person with food in the fridge looks after themselves
    await g.room("r.hard.larder = [{ k: 'bread', exp: 999999999 }, { k: 'rice', exp: 999999999 }];");
    await g.room("r.characters.forEach(c => { c.needs.hunger = 8; c.needs.energy = 90; c.needs.hygiene = 90; c.needs.mood = 90; });");
    const fed = await (async () => { for (let i = 0; i < 60; i++) { if (await g.room('return r.characters[0].needs.hunger > 30;')) return true; await wait(500); } return false; })();
    assert.ok(fed, 'free will: the hungry person went and ate');
    // orders: queue a sit on the chair and see it in the queue
    await g.room("r.hard.autonomy = false; r.setSpeed(1); const c = r.characters[0]; r.cancelCurrent(c); c.queue = []; c.needs.mood = 90; const chair = r.props.find(p => p.type === 'chair' || p.type === 'armchair' || p.type === 'sofa' || p.type === 'bench'); window.__seat = chair ? chair.type : null; if (chair) r.queueAction(c, 'sit', chair);");
    if (await g.room('return Boolean(window.__seat);')) {
      assert.equal(await g.room('return r.characters[0].queue.length + (r.characters[0].current ? 1 : 0);'), 1, 'the order is queued');
    }
    await g.room('r.setSpeed(3);');
    await wait(3000);
    await g.room('r.setSpeed(1); r.hard.autonomy = true;');
  });

  await step('night follows the clock and the kid tips are off', async () => {
    await g.room('r.clock.minute = 21 * 60;');
    await wait(1200);
    assert.equal(await g.room('return r.night;'), true, 'night at 21:00');
    await g.room('r.clock.minute = 9 * 60;');
    await wait(1200);
    assert.equal(await g.room('return r.night;'), false, 'day at 09:00');
    assert.equal(await g.room('return r.tipShown ? 1 : 0;'), 0);
  });

  await step('shopping: cash prices, finite stock, a bag, the fridge and spoilage, shops open 7 to 22, a delivery van that may run late', async () => {
    await g.room("r.hard.autonomy = false; r.setSpeed(1); r.hard.larder = []; r.characters[0].bag = []; r.clock.day = 10; r.clock.minute = 10 * 60; r.goToZone('2.0');");
    await wait(2200);
    const shopSlot = 2;
    await g.room("r.cash = 1000; const shop = r.shopFor(2); shop.stock.bread = 2; shop.stock.rice = 6;");
    const prices = await g.room("const b = r.bodies.find(i => i.onShelf && i.key === 'bread'); return b && [b.price, b.shop, b.input.draggable];");
    assert.ok(prices, 'bread is on the shelf'); assert.equal(prices[0], 60, 'bread costs $60'); assert.equal(prices[1], shopSlot); assert.equal(prices[2], true);
    // really drag a loaf off the shelf onto the person: paid, in the bag, one fewer in stock
    await g.room("const c = r.characters[0]; c.x = 480; c.lane = 520; c.goal = null; r.cameras.main.scrollX = 0;");
    await wait(300);
    const at = await g.room("const b = r.bodies.find(i => i.onShelf && i.key === 'bread'), s = r.cameras.main.scrollX; return [Math.round(b.x - s), Math.round(b.y)];");
    const body = await g.room("const c = r.characters[0], s = r.cameras.main.scrollX; return [Math.round(c.x - s), Math.round(c.y + 20)];");
    await g.drag(at[0], at[1], body[0], body[1], 800);
    await wait(500);
    assert.equal(await g.room('return r.cash;'), 940, 'paid');
    assert.equal(await g.room('return r.characters[0].bag.length;'), 1, 'the loaf is in the bag');
    assert.equal(await g.room('return r.shopFor(2).stock.bread;'), 1, 'one fewer in stock');
    // the last loaf: after it is taken there is none left to restock the shelf
    await g.room("r.shopFor(2).stock.bread = 0; r.bodies.filter(i => i.onShelf && i.key === 'bread').forEach(i => r.discard(i, { alpha: 0, duration: 10 }));");
    await wait(400);
    assert.equal(await g.room("return r.bodies.some(i => i.onShelf && !i.dead && i.key === 'bread');"), false, 'sold out: none on the shelf');
    // closed at night
    await g.room('r.clock.minute = 23 * 60; r.refreshPrices();');
    assert.equal(await g.room("const b = r.bodies.find(i => i.onShelf && !i.dead && i.price); return b.input.draggable;"), false, 'closed at 23:00');
    await g.room('r.clock.minute = 8 * 60; r.refreshPrices();');
    assert.equal(await g.room("const b = r.bodies.find(i => i.onShelf && !i.dead && i.price); return b.input.draggable;"), true, 'open at 08:00');
    // a snack from the bag fills you up
    await g.room("const c = r.characters[0]; c.needs.hunger = 20; r.queueAction(c, 'eat', null); r.passTime(30);");
    assert.ok(await g.room('return r.characters[0].needs.hunger > 40;'), 'the bread filled you up');
    assert.equal(await g.room('return r.characters[0].bag.length;'), 0);
    // food goes off: a burger keeps a day, rice for months; and a fridge stretches it
    await g.room("const c = r.characters[0]; c.bag = [{ k: 'burger', exp: r.totalMinutes() + 600 }, { k: 'rice', exp: r.totalMinutes() + 90 * 1440 }]; r.passTime(11 * 60);");
    assert.deepEqual(await g.room('return r.characters[0].bag.map(f => f.k);'), ['rice'], 'the burger went off');
    // the delivery van: due Monday 07:00; late some weeks, and the shelves stay empty until it comes
    await g.room("const sh = r.shopFor(2); r.clock.day = 14; r.clock.minute = 6 * 60; sh.stock.rice = 0; sh.due = 14 * 1440 + 7 * 60; sh.next = sh.due + 120; r.lastHour = -1; r.passTime(120);");
    assert.equal(await g.room('return r.shopFor(2).stock.rice;'), 0, 'Monday 07:00 came and went: the van is running late');
    await g.room('r.passTime(120);');
    assert.equal(await g.room('return r.shopFor(2).stock.rice;'), 6, 'then it arrived and the shelves are full again');
    assert.ok(await g.room('return r.shopFor(2).due > r.totalMinutes();'), 'the next one is booked');
    await g.room('r.hard.autonomy = true;');
  });

  await step('survival: the cold bites outdoors and warms indoors, bins, day labour (open 6-9) and a meal line (opens at set hours)', async () => {
    await g.room("r.hard.autonomy = false; r.setSpeed(1); r.characters.forEach(c => { c.needs.hunger = 90; c.needs.energy = 90; c.needs.hygiene = 90; c.needs.mood = 90; c.needs.warmth = 80; }); r.clock.day = 90; r.clock.minute = 3 * 60; r.goToZone('1.0');");
    await wait(2200);
    assert.deepEqual(await g.room('const w = r.weatherNow(); return [w.season, r.isOutdoors(r.characters[0])];'), ['Winter', true], 'a winter night in the park');
    const w0 = await g.room('return r.characters[0].needs.warmth;');
    await g.room('r.passTime(120);');
    const w1 = await g.room('return r.characters[0].needs.warmth;');
    assert.ok(w1 < w0 - 10, `the cold takes its toll outdoors (${w0} -> ${w1})`);
    await g.room("r.goToZone('0.0');");                                                                     // inside, at home
    await wait(1800);
    await g.room('r.characters.forEach(c => { c.needs.warmth = 20; }); r.passTime(120);');
    assert.ok(await g.room('return r.characters[0].needs.warmth > 35;'), 'and indoors it comes back');
    // day labour: the board is only open 6 to 9
    await g.room("r.goToZone('1.0');");
    await wait(1800);
    await g.room("const c = r.characters[0], b = r.props.find(p => p.type === 'labourboard'); window.__board = b; const f = r.frontOf(b); c.x = f.x; c.lane = f.lane; c.goal = null; r.clock.day = 10; r.clock.minute = 12 * 60;");
    const cash0 = await g.room('return r.cash;');
    await g.room("r.queueAction(r.characters[0], 'labour', window.__board); r.passTime(10);");
    assert.equal(await g.room('return r.characters[0].current ? 1 : 0;'), 0, 'no work at midday');
    await g.room("r.clock.minute = 7 * 60 + 30; r.queueAction(r.characters[0], 'labour', window.__board); r.passTime(30);");
    assert.equal(await g.room("return r.characters[0].current ? r.characters[0].current.type : null;"), 'labour', 'work at 07:30');
    await g.room('r.passTime(250);');
    assert.equal(await g.room('return r.cash;'), cash0 + 1200, 'paid for the day');
    // a bin
    await g.room("const c = r.characters[0], d = r.props.find(p => p.type === 'dumpster'); const f = r.frontOf(d); c.x = f.x; c.lane = f.lane; c.goal = null; r.queueAction(c, 'scavenge', d); r.passTime(30);");
    assert.equal(await g.room('return r.characters[0].current || r.characters[0].queue.length ? 1 : 0;'), 0, 'the search is over');
    // the meal line at the shelter opens at 07:00 and 18:00
    await g.room("r.goToZone('4.0');");
    await wait(1800);
    await g.room("const c = r.characters[0], m = r.props.find(p => p.type === 'servery'); window.__line = m; c.needs.hunger = 10; const f = r.frontOf(m); c.x = f.x; c.lane = f.lane; c.goal = null; r.clock.minute = 12 * 60; r.queueAction(c, 'queue', m); r.passTime(5);");
    assert.equal(await g.room('return r.characters[0].current ? 1 : 0;'), 0, 'closed at noon');
    await g.room("r.clock.minute = 18 * 60 + 5; r.queueAction(r.characters[0], 'queue', window.__line); r.passTime(30);");
    assert.ok(await g.room('return r.characters[0].needs.hunger > 25;'), 'a hot meal at 18:05');
  });

  await step('begging is a short mini-game that costs an hour; sleeping rough on a bench; the shelter cot opens in the evening', async () => {
    await g.room("r.goToZone('1.0');");
    await wait(1800);
    await g.room("const c = r.characters[0], b = r.props.find(p => p.type === 'begspot'); const f = r.frontOf(b); c.x = f.x; c.lane = f.lane; c.goal = null; r.clock.minute = 12 * 60; window.__t0 = r.clock.day * 1440 + r.clock.minute; r.queueAction(c, 'beg', b); r.passTime(10);");
    await wait(900);
    assert.ok(await active('Beg'), 'the begging game opened');
    const cash0 = await g.room('return r.cash;');
    await g.ev(`(b => { b.g.earned = 340; b.g.t = 999; })(${S('Beg')})`);
    await wait(900);
    await g.ev(`(b => b.finish({ cash: 340, minutes: 60 }))(${S('Beg')})`);
    await wait(700);
    assert.equal(await g.room('return r.cash;'), cash0 + 340);
    assert.ok(await g.room('return r.clock.day * 1440 + r.clock.minute - window.__t0 >= 60;'), 'an hour went by');
    // sleep on the bench
    await g.room("const c = r.characters[0], b = r.props.find(p => p.type === 'bench'); c.needs.energy = 20; const f = r.frontOf(b); c.x = f.x; c.lane = f.lane; c.goal = null; r.clock.day = 3; r.clock.minute = 22 * 60; r.hard.setup.toggles.police = false; r.hard.setup.toggles.survival = false; r.queueAction(c, 'rough', b); r.passTime(20);");
    assert.ok(await g.room('return Boolean(r.characters[0].rough);'), 'lying on the bench ' + JSON.stringify(await g.room("const c = r.characters[0]; return [c.x, c.lane, c.goal, c.current && c.current.type, c.current && c.current.phase, c.queue.length, c.collapsed, c.held, c.sleeping && 1, c.riding && 1, r.zoneKey, r.props.filter(p => p.type === 'bench').map(p => [p.x, p.y])];")));
    await g.room('r.passTime(240);');
    assert.ok(await g.room('return r.characters[0].needs.energy > 45;'), 'it is rest of a kind');
    await g.room('r.cancelCurrent(r.characters[0]); r.hard.setup.toggles.police = true; r.hard.setup.toggles.survival = true;');
    assert.ok(!(await g.room('return r.characters[0].rough;')));
    // the shelter's cots are for the night
    await g.room("r.goToZone('4.0');");
    await wait(1800);
    await g.room("const c = r.characters[0], cot = r.props.find(p => p.type === 'cot'); window.__cot = cot; c.needs.energy = 20; const f = r.frontOf(cot); c.x = cot.x - 50; c.lane = f.lane; c.goal = null; r.clock.minute = 13 * 60; r.queueAction(c, 'sleep', cot); r.passTime(5);");
    assert.equal(await g.room('return r.characters[0].sleeping ? 1 : 0;'), 0, 'no cots in the afternoon');
    await g.room("r.clock.minute = 21 * 60; r.queueAction(r.characters[0], 'sleep', window.__cot); r.passTime(20);");
    assert.ok(await g.room('return Boolean(r.characters[0].sleeping);'), 'a cot at 21:00');
    await g.room('r.passTime(480);');
    assert.ok(await g.room('return r.characters[0].needs.energy > 75;'), 'a night in a bed');
    await g.room('r.hard.autonomy = true;');
  });

  await step('the bank swaps kid-mode coins and cash at 1 coin = 100 cash, both ways', async () => {
    await g.room('r.openBank();');
    await wait(900);
    assert.equal(await g.ev(`${S('Bank')}.kid.coins`), 7, 'the kid world has its 7 coins');
    const cash0 = await g.room('return r.cash;');
    window_cash = cash0;
    await g.ev(`${S('Bank')}.swap('toCash', 5)`);
    await wait(500);
    assert.equal(await g.room('return r.cash;'), cash0 + 500);
    assert.equal(await g.ev(`${S('Bank')}.kid.coins`), 2);
    await g.ev(`${S('Bank')}.swap('toCash', 5)`);                                        // can't: only 2 left
    await wait(300);
    assert.equal(await g.room('return r.cash;'), cash0 + 500);
    await g.ev(`${S('Bank')}.swap('toCoins', 1)`);
    await wait(500);
    assert.equal(await g.room('return r.cash;'), cash0 + 400);
    assert.equal(await g.ev(`${S('Bank')}.kid.coins`), 3);
    await g.ev(`(c => { c.scene.resume('Room'); c.scene.stop(); })(${S('Bank')})`);
  });

  await step('back to kid mode needs the PIN; the kid world is just as it was, and the adult game is kept', async () => {
    await g.room('r.openSettings();');
    await wait(500);
    await g.ev(`${S('Settings')}.leaveHard()`);
    await wait(500);
    await pinIn('9999');
    assert.ok(await active('Pin'), 'a wrong PIN does not let you out');
    await pinIn('1234');
    await wait(1800);
    await g.open();
    await wait(2500);
    const kid = await g.room('return { hard: Boolean(r.hard), coins: r.coins, ages: r.characters.map(c => c.look.age) };');
    assert.equal(kid.hard, false); assert.equal(kid.coins, 3, 'the swapped coins are in the kid purse');
    assert.ok(kid.ages.includes('kid'), 'the kids are back');
    // and in again: the gate asks for the PIN, then the existing adult game loads (no new setup)
    await g.room('r.openSettings();');
    await wait(500);
    for (let i = 0; i < 7; i++) await g.ev(`${S('Settings')}.tapVersion()`);
    await wait(500);
    await g.ev(`${S('AdultGate')}.proceed()`);
    await wait(700);
    await pinIn('1234');
    await wait(1800);
    await g.open();
    await wait(2500);
    const back = await g.room('return { hard: Boolean(r.hard), cash: r.cash, home: r.city[0] && r.city[0].name };');
    assert.equal(back.hard, true); assert.equal(back.cash, window_cash + 400); assert.equal(back.home, 'Flat');
  });

  await step('no errors were logged during the run', async () => { assert.deepEqual(g.errors, []); });
} finally {
  await g.close();
}

const ok = results.filter(r => r.ok).length;
console.log(`${ok}/${results.length} e2e hard-mode steps passed`);
process.exit(ok === results.length ? 0 : 1);
