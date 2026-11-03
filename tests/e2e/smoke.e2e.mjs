// End-to-end smoke test: boots the real game in headless Chromium and plays it.
// Run with `npm run e2e` (needs Chromium/Chrome on the PATH, or CHROME=/path).
import assert from 'node:assert/strict';
import { launch, findChrome, wait } from './harness.mjs';

if (!findChrome()) { console.log('e2e: no Chromium/Chrome found — skipping'); process.exit(0); }

const results = [];
async function step(name, fn) {
  const t = Date.now();
  try { await fn(); results.push({ name, ok: true, ms: Date.now() - t }); console.log(`  ✔ ${name} (${Date.now() - t}ms)`); }
  catch (e) { results.push({ name, ok: false }); console.log(`  ✖ ${name}\n      ${String(e.message).split('\n').join('\n      ')}`); }
}

const g = await launch();
console.log('e2e smoke (mouse):');
const pos = (key) => g.room(`const i = r.bodies.find(b => b.key === '${key}' && b.onShelf); return i && [Math.round(i.x), Math.round(i.y)];`);
const state = () => g.room('return { room: r.roomKey, coins: r.coins, recipes: [...r.discovered], night: r.night, chars: r.characters.length, props: r.props.map(p => p.type), floor: r.bodies.filter(b => b.key && !b.onShelf && !b.worn && !b.storedIn && !b.dead).map(b => b.key) };');
const mouth = () => g.room('const c = r.characters[0]; return [Math.round(c.x), Math.round(c.y - 45 * c.scaleX)];');

try {
  await g.open();
  await g.clearSave();
  await g.open();

  await step('boots with a character, shelves and a clean console', async () => {
    const s = await g.room('return { chars: r.characters.length, shelf: r.bodies.filter(b => b.onShelf).length, room: r.roomKey };');
    assert.equal(s.chars, 1);
    assert.ok(s.shelf >= 12, `shelf items: ${s.shelf}`);
    assert.equal(s.room, 'bedroom');
    assert.deepEqual(g.errors, []);
  });

  await step('guided start: the first tip appears and advances when you do the thing', async () => {
    await wait(1800);
    assert.equal(await g.room('return r.tipShown && r.tipShown.id;'), 'grab');
    await g.shot('/tmp/toybox-e2e-tip.png');
    const [x, y] = await pos('teddy');
    await g.drag(x, y, 640, 540, 400);                              // grab a shelf item
    await wait(1900);
    assert.equal(await g.room('return r.tipShown && r.tipShown.id;'), 'dress');
    await g.room("r.tipsSeen = new Set(['grab','dress','map','eat','cook','book','furniture','shop']); r.refreshTip();");   // out of the way for the rest
    await wait(300);
    assert.equal(await g.room('return r.tipShown;'), null);
  });

  await step('feeding a character earns a coin', async () => {
    await g.room("r.coins = 0; r.lastEarned = {}; r.createItem('apple', 300, 520);");
    await wait(600);
    const [mx, my] = await mouth();
    await g.drag(300, 492, mx, my, 1200);
    const s = await state();
    assert.equal(s.coins, 1, 'coin for eating');
    assert.ok(!s.floor.includes('apple'), 'the apple was eaten');
  });

  await step('furniture mode: add a cabinet, store an item, take it out', async () => {
    await g.click(718, 30, 500);                                   // 🛋️
    assert.equal(await g.room('return r.editMode;'), true);
    await g.room("r.addFurniture('cabinet');");
    await wait(300);
    const at = await g.room("const p = r.props.find(p => p.type === 'cabinet'); return [Math.round(p.x), Math.round(p.y)];");
    await g.drag(at[0], at[1] - 60, 760, 380);                      // move it away from the shelves
    await g.click(590, 118, 500);                                   // Done
    assert.equal(await g.room('return r.editMode;'), false);
    const cab = await g.room("const p = r.props.find(p => p.type === 'cabinet'); return [Math.round(p.x), Math.round(p.y)];");
    await g.room("r.createItem('ball', 300, 520);");
    await wait(500);
    await g.drag(300, 492, cab[0], cab[1] - 20, 800);
    assert.equal(await g.room("return r.captureProps().find(p => p.type === 'cabinet').items.length;"), 1, 'ball stored');
    const ball = await g.room("const i = r.props.find(p => p.type === 'cabinet').stored.find(Boolean); return [Math.round(i.x), Math.round(i.y)];");
    await g.drag(ball[0], ball[1], 400, 540, 1500);
    assert.equal(await g.room("return r.captureProps().find(p => p.type === 'cabinet').items.length;"), 0, 'ball taken out');
  });

  await step('cooking: flour + egg + milk makes pancakes and discovers the recipe', async () => {
    await g.room("r.goToRoom('kitchen');");
    await wait(1500);
    await g.room("r.createItem('flour', 150, 520); r.createItem('egg', 240, 520); r.createItem('milk', 330, 520);");
    await wait(900);
    const oven = await g.room("const o = r.props.find(p => p.type === 'oven'); return [Math.round(o.x), Math.round(o.y)];");
    for (const x of [150, 240, 330]) await g.drag(x, 492, oven[0], oven[1], 300);
    await wait(5200);
    const s = await state();
    assert.ok(s.recipes.includes('pancakes'), 'recipe discovered');
    assert.ok(s.floor.includes('pancakes'), 'pancakes on the floor');
  });

  await step('shop: too few coins wiggles, enough coins unlocks', async () => {
    await g.room("r.goToRoom('shop'); r.coins = 3;");
    await wait(1500);
    const dog = await pos('dog');
    await g.click(dog[0], dog[1], 600);
    assert.equal(await g.room("return r.unlocked.has('dog');"), false);
    await g.room('r.coins = 20; r.updateNav();');
    await g.click(dog[0], dog[1], 600);
    assert.equal(await g.room("return r.unlocked.has('dog');"), true);
    assert.equal(await g.room('return r.coins;'), 14);
  });

  await step('night mode toggles from the switch', async () => {
    const sw = await g.room("const p = r.props.find(p => p.type === 'lightswitch'); return [Math.round(p.x), Math.round(p.y)];");
    await g.click(sw[0], sw[1], 700);
    assert.equal(await g.room('return r.night;'), true);
    await g.click(sw[0], sw[1], 500);
    assert.equal(await g.room('return r.night;'), false);
  });

  await step('everything survives a reload', async () => {
    await g.room("r.goToRoom('bedroom');");
    await wait(2500);                                              // autosave
    await g.open();
    const s = await state();
    assert.equal(s.room, 'bedroom');
    assert.ok(s.recipes.includes('pancakes'));
    assert.equal(await g.room("return r.unlocked.has('dog');"), true);
    assert.ok(s.props.includes('cabinet'), 'the cabinet is still there');
  });

  await step('no errors were logged during the run', async () => { assert.deepEqual(g.errors, []); });
} finally {
  await g.close();
}

// A second run with touch emulation: taps and finger drags.
const t = await launch({ touch: true });
console.log('e2e smoke (touch):');
try {
  await t.open();
  await t.clearSave();
  await t.open();

  await step('tapping a character with a finger pokes it', async () => {
    await t.tap(480, 400, 100);
    assert.ok(await t.room('return r.characters[0].pokedUntil > r.time.now;'), 'giggling');
  });

  await step('a finger can drag an item onto the mouth', async () => {
    await t.room("r.coins = 0; r.lastEarned = {}; r.createItem('banana', 300, 520);");
    await wait(600);
    const m = await t.room('const c = r.characters[0]; return [Math.round(c.x), Math.round(c.y - 45 * c.scaleX)];');
    await t.touchDrag(300, 492, m[0], m[1], 1200);
    assert.equal(await t.room('return r.coins;'), 1);
  });

  await step('HUD buttons are tappable: map opens and closes', async () => {
    await t.tap(70, 30, 700);
    assert.ok(await t.ev("__toybox.scene.isActive('Hub')"), 'map is open');
    await t.tap(910, 40, 700);                                     // ✖
    assert.ok(await t.ev("__toybox.scene.isActive('Room')"), 'back in the room');
  });

  await step('no errors during the touch run', async () => { assert.deepEqual(t.errors, []); });
} finally {
  await t.close();
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} e2e steps passed`);
process.exit(failed.length ? 1 : 0);
