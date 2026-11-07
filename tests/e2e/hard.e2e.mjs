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

  await step('the bank swaps kid-mode coins and cash at 1 coin = 100 cash, both ways', async () => {
    await g.room('r.openBank();');
    await wait(900);
    assert.equal(await g.ev(`${S('Bank')}.kid.coins`), 7, 'the kid world has its 7 coins');
    await g.ev(`${S('Bank')}.swap('toCash', 5)`);
    await wait(500);
    assert.equal(await g.room('return r.cash;'), 60500);
    assert.equal(await g.ev(`${S('Bank')}.kid.coins`), 2);
    await g.ev(`${S('Bank')}.swap('toCash', 5)`);                                        // can't: only 2 left
    await wait(300);
    assert.equal(await g.room('return r.cash;'), 60500);
    await g.ev(`${S('Bank')}.swap('toCoins', 1)`);
    await wait(500);
    assert.equal(await g.room('return r.cash;'), 60400);
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
    assert.equal(back.hard, true); assert.equal(back.cash, 60400); assert.equal(back.home, 'Flat');
  });

  await step('no errors were logged during the run', async () => { assert.deepEqual(g.errors, []); });
} finally {
  await g.close();
}

const ok = results.filter(r => r.ok).length;
console.log(`${ok}/${results.length} e2e hard-mode steps passed`);
process.exit(ok === results.length ? 0 : 1);
