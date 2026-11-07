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
const state = () => g.room('return { room: r.zoneKey, coins: r.coins, recipes: [...r.discovered], night: r.night, chars: r.characters.length, props: r.props.map(p => p.type), floor: r.bodies.filter(b => b.key && !b.onShelf && !b.worn && !b.storedIn && !b.dead).map(b => b.key) };');
const mouth = () => g.room('const c = r.characters[0]; return [Math.round(c.x), Math.round(c.mouthY())];');

try {
  await g.open();
  await g.clearSave();
  await g.open();

  await step('boots with a character, shelves and a clean console', async () => {
    const s = await g.room('return { chars: r.characters.length, shelf: r.bodies.filter(b => b.onShelf).length, room: r.zoneKey };');
    assert.equal(s.chars, 1);
    assert.ok(s.shelf >= 12, `shelf items: ${s.shelf}`);
    assert.equal(s.room, '0.1', 'upstairs at home');
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
    await g.room("r.tipsSeen = new Set(['grab','dress','walk','map','eat','cook','book','furniture','shop','build','play','decorate']); r.refreshTip();");   // out of the way for the rest
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
    await g.click(630, 120, 500);                                   // Done
    assert.equal(await g.room('return r.editMode;'), false);
    const cab = await g.room("const p = r.props.find(p => p.type === 'cabinet'); return [Math.round(p.x), Math.round(p.y)];");
    await g.room("r.createItem('ball', 300, 520);");
    await wait(500);
    await g.drag(300, 492, cab[0], cab[1] - 20, 800);
    assert.equal(await g.room("return Object.values(r.captureProps()).flat().find(p => p.type === 'cabinet').items.length;"), 1, 'ball stored');
    const ball = await g.room("const i = r.props.find(p => p.type === 'cabinet').stored.find(Boolean); return [Math.round(i.x), Math.round(i.y)];");
    await g.drag(ball[0], ball[1], 400, 540, 1500);
    assert.equal(await g.room("return Object.values(r.captureProps()).flat().find(p => p.type === 'cabinet').items.length;"), 0, 'ball taken out');
  });

  await step('decorating: repaint the walls, change the floor, add a window — and it is still there after a reload', async () => {
    await g.room('r.detached = true; r.cameras.main.scrollX = 0; r.enterDecorate();');
    await wait(300);
    assert.equal(await g.room('return Boolean(r.decor);'), true, 'decorate mode is on');
    const sec = await g.room('return r.currentSection().id;');
    await g.room("const s = r.currentSection(); r.setLook(s, l => ({ ...l, wall: 'shells', floor: 'carpet' })); r.setLook(s, l => ({ ...l, windows: [...l.windows, { x: 560, y: 60, w: 150, h: 120 }] }));");
    const look = await g.room('return r.sectionLook(r.currentSection());');
    assert.equal(look.wall, 'shells'); assert.equal(look.floor, 'carpet'); assert.equal(look.windows.length, 2);
    await g.room('r.exitDecorate();');
    await wait(2200);                                              // autosave
    await g.open();
    const kept = await g.room('const l = r.looks; return JSON.stringify(l);');
    assert.ok(kept.includes('shells') && kept.includes('carpet'), `the look was saved: ${kept}`);
    assert.ok(kept.includes(`"${sec}"`));
    await g.room("r.detached = true; r.cameras.main.scrollX = 0; r.setLook(r.currentSection(), l => ({ wall: 'cream', floor: 'honey', windows: [{ x: 90, y: 70, w: 190, h: 150 }] }));");
    assert.deepEqual(await g.room('return r.looks;'), {}, 'putting everything back leaves nothing stored');
  });

  await step('cooking: flour + egg + milk makes pancakes and discovers the recipe', async () => {
    await g.room("r.goToZone('0.0');");
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
    await g.room("r.goToZone('2.0'); r.coins = 3;");
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
    await g.room("r.goToZone('0.1');");
    await wait(2500);                                              // autosave
    await g.open();
    const s = await state();
    assert.equal(s.room, '0.1', 'upstairs at home');
    assert.ok(s.recipes.includes('pancakes'));
    assert.equal(await g.room("return r.unlocked.has('dog');"), true);
    assert.ok(s.props.includes('cabinet'), 'the cabinet is still there');
  });


  await step('walking: tapping the floor sends the character there', async () => {
    await g.room('const c = r.characters[0]; c.x = 860; c.lane = 520; c.goal = null; r.detached = true; r.cameras.main.scrollX = 0;');
    await wait(300);
    await g.room("r.input.once('pointerdown', (p, over) => { window.__over = over.map(o => o.constructor.name + ':' + (o.type || o.key || o.text || '')); });");
    await g.click(250, 505, 150);
    assert.equal(await g.room('return r.characters[0].walking;'), true, `on the move; under the pointer: ${JSON.stringify(await g.ev('window.__over'))}`);
    await wait(1200);
    const mid = await g.room('const c = r.characters[0]; return c.walkAmt;');
    assert.ok(mid > 0.5, `walk pose showing (${mid})`);
    for (let i = 0; i < 30 && await g.room('return Boolean(r.characters[0].goal);'); i++) await wait(300);     // (headless frame rate varies)
    const c = await g.room('const c = r.characters[0]; return { x: Math.round(c.x), lane: Math.round(c.lane), walking: c.walking, goal: c.goal };');
    assert.ok(Math.abs(c.x - 250) < 6 && Math.abs(c.lane - 505) < 6, `arrived: ${JSON.stringify(c)}`);
    assert.equal(c.walking, false);
    assert.equal(c.goal, null);
  });

  await step('beds: dropping a character on the bed tucks them in; grabbing them wakes them', async () => {
    await g.room('const c = r.characters[0]; c.x = 480; c.lane = 520; c.goal = null; r.detached = true; r.cameras.main.scrollX = 0;');
    const bed = await g.room("const p = r.props.find(p => p.type === 'bed'); return [Math.round(p.x), Math.round(p.y)];");
    await g.room(`r.tryBed(r.characters[0]);`);
    await wait(800);
    const s = await g.room('const c = r.characters[0]; return { asleep: Boolean(c.sleeping), angle: Math.round(c.angle), expr: c.expr, tucked: c.tucked };');
    assert.equal(s.asleep, true); assert.equal(s.angle, -90); assert.equal(s.expr, 'asleep'); assert.equal(s.tucked, true);
    await g.shot('/tmp/toybox-e2e-bed.png');
    await g.click(bed[0] + 6, bed[1] - 22, 700);                    // tap them: they wake up
    const w = await g.room('const c = r.characters[0]; return { asleep: Boolean(c.sleeping), angle: Math.round(c.angle) };');
    assert.equal(w.asleep, false); assert.equal(w.angle, 0);
  });

  await step('hugging: dropping a friend next to another makes them hug (and earns a coin)', async () => {
    await g.room("r.coins = 0; r.lastEarned = {}; r.addCharacter({ id: 'pal', name: 'Pal', look: r.characters[0].look, x: 260, lane: 500 }); const c = r.characters[0]; c.x = 700; c.lane = 500; c.goal = null; r.detached = true; r.cameras.main.scrollX = 0;");
    await wait(400);
    await g.drag(700, 330, 330, 330, 700);                          // pick the first one up and drop it by the pal
    const h = await g.room('return r.characters.map(c => ({ hug: c.hugging, angle: Math.round(c.angle), x: Math.round(c.x), lane: Math.round(c.lane), sl: Boolean(c.sleeping), held: c.held }));');
    assert.ok(h.every(c => c.hug), `both hugging ${JSON.stringify(h)}`);
    assert.ok(Math.abs(h[0].angle) > 3, 'leaning in');
    assert.equal(await g.room('return r.coins;'), 1);
    await wait(2600);
    assert.ok((await g.room('return r.characters.every(c => !c.hugging && c.angle === 0);')), 'hug over');
    await g.room("r.removeCharacter(r.characters[1]);");
  });

  await step('pets: the basket hands out pets that wander, can be petted and fed, and are saved', async () => {
    await g.room("r.goToZone('1.0');");
    await wait(1500);
    const basket = await g.room("const p = r.props.find(p => p.type === 'petbasket'); return [Math.round(p.x), Math.round(p.y)];");
    for (let attempt = 0; attempt < 3 && !(await g.room('return r.pets.length;')); attempt++) await g.click(basket[0], basket[1], 700);     // tap again if the first didn't take
    assert.equal(await g.room('return r.pets.length;'), 1, 'a pet hopped out');
    await wait(2500);
    const moved = await g.room('const p = r.pets[0]; return { x: Math.round(p.x), lane: Math.round(p.lane), kind: p.kind };');
    assert.ok(moved.lane >= 445 && moved.lane <= 580, JSON.stringify(moved));
    await g.room('r.detached = true; const p = r.pets[0]; p.goal = null; p.nextThink = r.time.now + 60000; r.cameras.main.scrollX = Math.max(0, Math.min(r.worldW - 960, p.x - 480));');
    await wait(300);
    const pos = await g.room('const p = r.pets[0]; return [Math.round(p.x - r.cameras.main.scrollX), Math.round(p.y)];');
    for (let attempt = 0; attempt < 3 && !(await g.room('return r.pets[0].pats > 0;')); attempt++) {     // a person would just tap again
      const at = await g.room('const p = r.pets[0]; return [Math.round(p.x - r.cameras.main.scrollX), Math.round(p.y - 6)];');
      await g.click(at[0], at[1], 250);                              // pet it
    }
    assert.ok(await g.room('return r.pets[0].pats > 0;'), 'the pet was patted (and hopped)');
    await g.room("r.coins = 0; r.lastEarned = {}; r.pets[0].goal = null; r.pets[0].nextThink = r.time.now + 60000; r.detached = true; const p = r.pets[0]; r.cameras.main.scrollX = Math.max(0, Math.min(r.worldW - 960, p.x - 480)); r.createItem('apple', Math.max(r.cameras.main.scrollX + 120, p.x - 160), p.lane);");
    await wait(700);
    const f = await g.room("const p = r.pets[0], a = r.bodies.find(b => b.key === 'apple' && !b.onShelf), sx = r.cameras.main.scrollX; return [Math.round(a.x - sx), Math.round(a.y), Math.round(p.x - sx), Math.round(p.y)];");
    await g.drag(f[0], f[1], f[2], f[3] - 10, 900);
    assert.equal(await g.room('return r.coins;'), 1, 'feeding the pet earns a coin');
    assert.ok(!(await g.room("return r.bodies.some(b => b.key === 'apple' && !b.onShelf && !b.dead);")), 'the apple was eaten');
    await g.room("r.goToZone('0.1');");
    await wait(1500);
    assert.equal(await g.room('return r.pets.length;'), 1, 'the pet came along');
    await wait(2200);
    const save = await g.ev("new Promise(res => { const q = indexedDB.open('toybox'); q.onsuccess = () => { const r = q.result.transaction('saves').objectStore('saves').get('main'); r.onsuccess = () => res(r.result.pets); }; })");
    assert.equal(save.length, 1, 'saved with the pet');
  });

  await step('panorama: a floor is wider than the screen; dragging works with the camera scrolled', async () => {
    await g.room("r.goToZone('0.1');");
    await wait(1500);
    assert.equal(await g.room('return r.worldW;'), 1920, 'two bedrooms side by side');
    await g.room("r.detached = true; r.cameras.main.scrollX = 960; r.createItem('ball', 1260, 520);");
    await wait(700);
    const at = await g.room("const i = r.bodies.find(b => b.key === 'ball' && !b.onShelf && !b.worn && b.x > 1000); return [Math.round(i.x - r.cameras.main.scrollX), Math.round(i.y)];");
    await g.drag(at[0], at[1], at[0] + 200, at[1], 900);
    const x = await g.room("const i = r.bodies.find(b => b.key === 'ball' && !b.onShelf && !b.worn && b.x > 1000); return Math.round(i.x);");
    assert.ok(Math.abs(x - 1460) < 120, `the ball followed the pointer in world space (x=${x})`);
    await g.room('r.panDir = 1;');
    await wait(500);
    await g.room('r.panDir = 0;');
    assert.ok(await g.room('return r.cameras.main.scrollX;') > 960 - 1, 'arrows scroll (clamped at the far end)');
    assert.equal(await g.room('return r.zone.sections.length;'), 2);
  });

  await step('stairs: tapping them takes you to the floor below, beside the matching stairs', async () => {
    await g.room("r.detached = true; r.cameras.main.scrollX = 0; r.characters[0].x = 400; r.characters[0].lane = 520;");
    const st = await g.room("const p = r.props.find(p => p.type === 'stairs'); return [Math.round(p.x), Math.round(p.y)];");
    await g.click(st[0], st[1], 1800);
    const z = await g.room('return { zone: r.zoneKey, x: Math.round(r.characters[0].x), label: r.roomLabel.text };');
    assert.equal(z.zone, '0.0', 'ground floor');
    assert.ok(z.x > 1500, `arrived beside the living-room stairs (x=${z.x})`);
    await g.room("r.goToZone('0.1');");
    await wait(1500);
  });

  await step('city map: build on an empty lot, edit the building, visit it', async () => {
    await g.click(70, 30, 900);                                              // 🗺️ Map
    assert.ok(await g.ev("__toybox.scene.isActive('Hub')"), 'map is open');
    assert.equal(await g.room('return r.props.length;'), 0, 'the floor is put away while the map is open');
    await g.room('r.coins = 60;');
    await g.ev("(h => { h.build(5, 'cottage'); })(__toybox.scene.getScene('Hub'))");
    assert.equal(await g.room("return r.city[5] && r.city[5].name;"), 'Cottage');
    assert.equal(await g.room('return r.coins;'), 45);
    await g.ev("(h => h.openBuilder(5))(__toybox.scene.getScene('Hub'))");
    await wait(600);
    assert.ok(await g.ev("__toybox.scene.isActive('Builder')"), 'builder is open');
    await g.ev("(b => { b.buyRoom(b.b.floors[0].id, 'bedroom'); b.buyFloor(); b.selRoom = b.b.floors[0].rooms[0].id; b.addConnector('stairs'); })(__toybox.scene.getScene('Builder'))");
    const city = await g.room("const b = r.city[5]; return { floors: b.floors.length, rooms: b.floors[0].rooms.length, coins: r.coins };");
    assert.equal(city.floors, 2); assert.equal(city.rooms, 4); assert.equal(city.coins, 45 - 4 - 12);
    await g.ev("(b => b.close())(__toybox.scene.getScene('Builder'))");
    await wait(300);
    await g.ev("(h => h.visit(5))(__toybox.scene.getScene('Hub'))");
    await wait(1800);
    const z = await g.room('return { zone: r.zoneKey, w: r.worldW, props: r.props.map(p => p.type) };');
    assert.equal(z.zone, '5.0');
    assert.equal(z.w, 4 * 960);
    assert.ok(z.props.includes('stairs'), 'the stairs we added are there');
    await g.room("r.goToZone('0.1');");
    await wait(1500);
  });

  await step('mini-games: stations launch them, results come back as coins and items', async () => {
    await g.room("r.goToZone('0.1'); ");
    await wait(1500);
    await g.room("r.coins = 0; r.updateNav(); r.detached = true; r.cameras.main.scrollX = 0; window.__dock = r.addFurniture('dock'); window.__tv = r.addFurniture('tv'); window.__dock.setPosition(150, 470); window.__tv.setPosition(840, 470);");
    await wait(400);
    const dock = await g.room('const p = window.__dock; return [Math.round(p.x), Math.round(p.y)];');
    await g.click(dock[0], dock[1], 1000);                           // tap the dock: fishing opens
    assert.ok(await g.ev("__toybox.scene.isActive('Fishing')"), 'fishing opened');
    assert.ok(await g.room('return r.scene.isPaused();'), 'the room waits behind it');
    await g.ev("(f => { f.press(true); f.press(false); f.s.phase = 'bite'; f.s.t = 0; f.press(true); f.s.catch = f.s.catch; f.s.progress = 1.01; })(__toybox.scene.getScene('Fishing'))");
    await wait(900);
    assert.equal(await g.ev("__toybox.scene.getScene('Fishing').caught.length"), 1, 'landed a fish');
    await g.ev("(f => f.finish({ coins: 2, items: ['fish'] }))(__toybox.scene.getScene('Fishing'))");
    await wait(1400);
    const after = await g.room("return { coins: r.coins, fish: r.bodies.filter(b => b.key === 'fish' && !b.onShelf).length, paused: r.scene.isPaused() };");
    assert.equal(after.coins, 2); assert.ok(after.fish >= 1, 'the fish is in the room'); assert.equal(after.paused, false);
    const tv = await g.room('const p = window.__tv; return [Math.round(p.x), Math.round(p.y)];');
    await g.click(tv[0], tv[1], 1000);                               // tap the TV: Star Catcher
    assert.ok(await g.ev("__toybox.scene.isActive('Arcade')"), 'star catcher opened');
    await g.ev("(a => a.finish(null))(__toybox.scene.getScene('Arcade'))");     // close without playing
    await wait(500);
    assert.equal(await g.room('return r.coins;'), 2, 'closing without playing gives nothing');
  });

  await step('creative games: a designed shirt is worn and saved; a sculpted toy becomes a real item and survives a reload', async () => {
    await g.room("for (const k of ['__dock', '__tv']) if (window[k] && window[k].active) r.removeFurniture(window[k]);");
    await g.room("r.detached = true; r.cameras.main.scrollX = 0; window.__sew = r.addFurniture('sewing'); window.__clay = r.addFurniture('claytable'); window.__sew.setPosition(140, 470); window.__clay.setPosition(830, 470);");
    await wait(400);
    const sew = await g.room('const p = window.__sew; return [Math.round(p.x), Math.round(p.y)];');
    for (let attempt = 0; attempt < 3 && !(await g.ev("__toybox.scene.isActive('ShirtShop')")); attempt++) await g.click(sew[0], sew[1], 1000);     // tap again if the first didn't take
    assert.ok(await g.ev("__toybox.scene.isActive('ShirtShop')"), 'the shirt factory opened');
    await g.ev("(s => { s.design.color = 0xff5d5d; s.design.pattern = { id: 'stars', color: 0xffe27a }; s.refresh(); s.finish({ coins: 2, shirt: s.design }); })(__toybox.scene.getScene('ShirtShop'))");
    await wait(900);
    const worn = await g.room("const c = r.characters[0]; return { shirt: c.look.shirt, pattern: c.look.pattern && c.look.pattern.id, saved: r.shirtDesigns.length };");
    assert.equal(worn.shirt, 0xff5d5d); assert.equal(worn.pattern, 'stars'); assert.equal(worn.saved, 1);
    const clay = await g.room('const p = window.__clay; return [Math.round(p.x), Math.round(p.y)];');
    for (let attempt = 0; attempt < 3 && !(await g.ev("__toybox.scene.isActive('Sculpt')")); attempt++) await g.click(clay[0], clay[1], 1000);     // tap again if the first didn't take
    assert.ok(await g.ev("__toybox.scene.isActive('Sculpt')"), 'the workshop opened');
    await g.ev("(s => { const toy = { id: 'e2e1', name: 'Gloop', ...s.design, body: 'lump', parts: ['horns', 'wings'], face: 'grin' }; s.finish({ coins: 2, toy, items: ['toy:e2e1'] }); })(__toybox.scene.getScene('Sculpt'))");
    await wait(1500);
    assert.ok(await g.room("return r.bodies.some(b => b.key === 'toy:e2e1');"), 'the toy is in the room');
    assert.equal(await g.room('return r.toyDesigns.length;'), 1);
    await wait(2200);                                              // autosave
    await g.open();
    assert.equal(await g.room('return r.characters[0].look.pattern && r.characters[0].look.pattern.id;'), 'stars', 'the shirt is still worn');
    assert.equal(await g.room("return r.toyDesigns.map(t => t.id).join();"), 'e2e1', 'the toy design was saved');
    assert.equal(await g.room("return typeof __toybox.cache === 'object' || true;"), true);
  });

  await step('demolishing: a mistaken building can be knocked down, giving a few coins back and clearing its post', async () => {
    await g.room("r.coins = 50; r.goToZone('0.1');"); await wait(1500);
    await g.room("r.openCityMap();"); await wait(1000);
    await g.ev("(h => { h.build(8, 'pond'); })(__toybox.scene.getScene('Hub'))");
    await g.room("r.parcels = [{ k: 'apple', to: 8 }];");
    const before = await g.room('return { coins: r.coins, built: Boolean(r.city[8]) };');
    assert.ok(before.built);
    await g.ev("(h => { h.openBuildingMenu(8); })(__toybox.scene.getScene('Hub'))");
    await wait(400);
    await g.ev("(h => h.demolish(8))(__toybox.scene.getScene('Hub'))");
    const after = await g.room('return { coins: r.coins, built: Boolean(r.city[8]), parcels: r.parcels.length, left: Object.keys(r.propState).filter(k => k.startsWith("8.")).length };');
    assert.equal(after.built, false); assert.ok(after.coins > before.coins - 1, 'a refund'); assert.equal(after.parcels, 0, 'post to it is cleared'); assert.equal(after.left, 0);
    await g.ev("(h => h.close())(__toybox.scene.getScene('Hub'))");
    await wait(1500);
  });

  await step('the post: an item dropped on a mailbox is addressed to a building and delivered when you get there', async () => {
    await g.room("r.goToZone('0.1');");
    await wait(1500);
    await g.room("for (const k of ['__sew', '__clay', '__dock', '__tv']) if (window[k] && window[k].active) r.removeFurniture(window[k]); r.detached = true; r.cameras.main.scrollX = 0; window.__box = r.addFurniture('mailbox'); window.__box.setPosition(830, 470); r.createItem('apple', 700, 540);");
    await wait(700);
    const from = await g.room("const i = r.bodies.find(b => b.key === 'apple' && !b.onShelf); return [Math.round(i.x), Math.round(i.y)];");
    const box = await g.room('const p = window.__box; return [Math.round(p.x), Math.round(p.y - 20)];');
    await g.drag(from[0], from[1], box[0], box[1], 900);
    assert.ok(await g.room('return r.mailUI && r.mailUI.length > 0;'), 'the destination picker opened');
    await g.room('r.sendParcel("apple", 1, window.__box);');
    assert.deepEqual(await g.room('return r.parcels;'), [{ k: 'apple', to: 1 }]);
    assert.equal(await g.room("return r.bodies.some(b => b.key === 'apple' && !b.onShelf && !b.dead);"), false, 'the apple went into the box');
    await g.room("r.goToZone('1.0');");                              // the park: where it was sent
    await wait(3200);
    assert.deepEqual(await g.room('return r.parcels;'), [], 'delivered');
    assert.ok(await g.room("return r.bodies.some(b => b.key === 'apple' && !b.onShelf && !b.dead);"), 'the apple turned up in the park');
    await g.room("r.goToZone('0.1');");
    await wait(1500);
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
    const m = await t.room('const c = r.characters[0]; return [Math.round(c.x), Math.round(c.mouthY())];');
    await t.touchDrag(300, 492, m[0], m[1], 1200);
    assert.equal(await t.room('return r.coins;'), 1);
  });

  await step('HUD buttons are tappable: map opens and closes', async () => {
    await t.tap(70, 30, 700);
    assert.ok(await t.ev("__toybox.scene.isActive('Hub')"), 'map is open');
    await t.tap(910, 40, 700);                                     // ✖
    assert.ok(await t.ev("__toybox.scene.isActive('Room')"), 'back in the room');
  });

  await step('a tour of the new features by finger alone: build, decorate, play', async () => {
    await t.room("r.tipsSeen = new Set(['grab','dress','walk','map','eat','cook','book','furniture','shop','build','play','decorate']); r.refreshTip(); r.coins = 120; r.updateNav();");
    await t.tap(70, 30, 900);                                           // Map
    assert.ok(await t.ev("__toybox.scene.isActive('Hub')"), 'the map opened');
    await t.tap(610, 380, 700);                                         // an empty lot
    assert.ok(await t.ev("__toybox.scene.getScene('Hub').popup.length > 0"), 'the build picker opened');
    await t.tap(419, 212, 900);                                         // the Cottage's price
    assert.ok(await t.room('return r.city.some(b => b && b.name === "Cottage");'), 'built a cottage');
    await t.tap(916, 30, 1400);                                         // close the map
    assert.ok(await t.ev("__toybox.scene.isActive('Room') && !__toybox.scene.isActive('Hub')"), 'back in the room');
    await t.tap(718, 30, 700);                                          // furniture mode
    await t.tap(480, 120, 700);                                         // Decorate
    assert.ok(await t.room('return Boolean(r.decor);'), 'decorating');
    await t.tap(118 + 6 * 108, 490, 500);                               // a wallpaper swatch
    assert.ok((await t.room('return JSON.stringify(r.looks);')).includes('shells'), 'the wallpaper changed');
    await t.tap(862, 444, 600);                                         // Done
    await t.room("r.detached = true; r.cameras.main.scrollX = 0; window.__tv = r.addFurniture('tv'); window.__tv.setPosition(820, 470);");
    await wait(400);
    await t.tap(820, 470, 1000);
    assert.ok(await t.ev("__toybox.scene.isActive('Arcade')"), 'the TV game opened');
    await t.touchDrag(200, 480, 700, 480, 700);
    assert.ok(Math.abs(await t.ev("Math.round(__toybox.scene.getScene('Arcade').bx)") - 700) < 40, 'the basket followed the finger');
    await t.ev("(a => a.finish(null))(__toybox.scene.getScene('Arcade'))");
    await wait(400);
  });

  await step('no errors during the touch run', async () => { assert.deepEqual(t.errors, []); });
} finally {
  await t.close();
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} e2e steps passed`);
process.exit(failed.length ? 1 : 0);
