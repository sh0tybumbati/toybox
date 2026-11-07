import test from 'node:test';
import assert from 'node:assert/strict';
import { TOY_BODIES, TOY_PARTS, TOY_FACES, MAX_PARTS, drawToy, sanitizeToy, registerToy, toyKey, defaultToy, newToyId } from '../src/data/toys.js';
import { CATALOG } from '../src/data/items.js';
import { ITEM_ART } from '../src/data/itemart.js';
import { InkPen } from '../src/data/inkpen.js';

const stub = () => { const calls = []; const g = new Proxy({}, { get: (_, n) => (...a) => { calls.push([n, ...a]); return g; } }); return { g, calls }; };

test('every body, part and face combination draws inside the box', () => {
  for (const body of Object.keys(TOY_BODIES)) for (const face of Object.keys(TOY_FACES)) {
    const { g, calls } = stub();
    drawToy(new InkPen(g, 2), { ...defaultToy(), body, face, parts: Object.keys(TOY_PARTS).slice(0, MAX_PARTS) });
    const pts = calls.filter(c => c[0] === 'fillPoints' || c[0] === 'strokePoints').flatMap(c => c[1]);
    assert.ok(pts.length > 20, `${body}/${face}`);
    for (const p of pts) assert.ok(p.x > -10 && p.x < 138 && p.y > -10 && p.y < 138, `${body}/${face}: ${p.x.toFixed(0)},${p.y.toFixed(0)}`);
  }
});

test('each part draws something and bodies stand near the ground', () => {
  for (const id of Object.keys(TOY_PARTS)) {
    const { g, calls } = stub();
    drawToy(new InkPen(g, 2), { ...defaultToy(), parts: [id] });
    assert.ok(calls.length > 12, id);
  }
  for (const [id, b] of Object.entries(TOY_BODIES)) assert.ok(b.dims.cy + b.dims.ry > 100 && b.dims.cy + b.dims.ry < 126, `${id} stands on the ground`);
});

test('sanitizeToy keeps good designs and rejects junk', () => {
  const good = { id: 'abc12', name: 'Wobble', body: 'lump', color: 0xff0000, partColor: 0x00ff00, parts: ['ears', 'tail', 'ears', 'nope'], face: 'grin' };
  assert.deepEqual(sanitizeToy(good), { ...good, parts: ['ears', 'tail'] });
  assert.equal(sanitizeToy({ ...good, id: 'BAD ID!' }), null);
  assert.equal(sanitizeToy({ ...good, body: 'cube' }), null);
  assert.equal(sanitizeToy(null), null);
  const odd = sanitizeToy({ ...good, color: 'red', face: 'angry', parts: Object.keys(TOY_PARTS), name: 'x'.repeat(40) });
  assert.equal(odd.face, 'smile'); assert.equal(odd.parts.length, MAX_PARTS); assert.equal(odd.name.length, 14); assert.equal(odd.color, 0xf59ab4);
});

test('a registered toy is a real toy item with art', () => {
  const key = registerToy({ id: 'tt9', ...defaultToy(), name: 'Test' });
  assert.equal(key, toyKey('tt9'));
  assert.equal(CATALOG[key].kind, 'toy');
  assert.equal(typeof ITEM_ART[key], 'function');
  const { g } = stub();
  assert.doesNotThrow(() => ITEM_ART[key](new InkPen(g, 1)));
  delete CATALOG[key]; delete ITEM_ART[key];
});

test('new ids never collide', () => {
  const ids = [];
  for (let i = 0; i < 200; i++) ids.push(newToyId(ids));
  assert.equal(new Set(ids).size, 200);
});
