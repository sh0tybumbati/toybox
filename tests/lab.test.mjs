import test from 'node:test';
import assert from 'node:assert/strict';
import { mix, unitValue, batchValue, spend, cleanGoods } from '../src/systems/hard/lab.js';
import { CROPS, GEAR } from '../src/data/hard/plants.js';
import { offers, supplies } from '../src/systems/hard/alley.js';

test('an unmixed batch is plain: base potency and purity, one unit per plant', () => {
  const p = mix('nightbloom', 2);
  assert.deepEqual([p.name, p.potency, p.purity, p.units], ['Plain nightbloom', 6, 85, 2]);
});

test('additives trade quality for quantity, and the recipe is named', () => {
  const amber = mix('nightbloom', 1, ['amber']), mint = mix('nightbloom', 1, ['mint']), cut = mix('nightbloom', 2, ['cut']);
  assert.deepEqual([amber.name, amber.potency, amber.purity], ['Amberdust', 9, 80]);
  assert.deepEqual([mint.purity, mint.effects], [95, ['calm']]);
  assert.deepEqual([cut.units, cut.purity], [4, 55]);
  assert.equal(mix('nightbloom', 1, ['mint', 'amber']).name, 'Amber frost');
  assert.equal(mix('nightbloom', 1, ['amber', 'mint']).name, 'Amber frost', 'order does not matter');
});

test('illegal batches are refused', () => {
  assert.equal(mix('carrot', 1), null, 'food is not product');
  assert.equal(mix('nightbloom', 0), null); assert.equal(mix('nightbloom', 4), null);
  assert.equal(mix('nightbloom', 1, ['cut', 'cut']), null, 'no doubling up');
  assert.equal(mix('nightbloom', 1, ['cut', 'mint', 'amber']), null, 'two additives at most');
  assert.equal(mix('nightbloom', 1, ['nope']), null);
});

test('purer and stronger is worth more per unit, but cutting still pays per batch', () => {
  const plain = mix('nightbloom', 2), amber = mix('nightbloom', 2, ['amber']), cut = mix('nightbloom', 2, ['cut']);
  assert.ok(unitValue(amber) > unitValue(plain) && unitValue(cut) < unitValue(plain));
  assert.ok(batchValue(cut) > batchValue(plain), 'more units wins on the batch');
});

test('a slow, high-value crop: a plant pays well above its seed', () => {
  const c = CROPS.nightbloom;
  assert.ok(c.days >= 14 && c.dark);
  assert.ok(batchValue(mix('nightbloom', c.yield)) > c.seed * 3);
});

test('spending ingredients needs them all and never goes negative', () => {
  assert.equal(spend({ nightbloom: 1 }, { amber: 1 }, 'nightbloom', 2, []), null);
  assert.equal(spend({ nightbloom: 2 }, {}, 'nightbloom', 1, ['mint']), null);
  assert.deepEqual(spend({ nightbloom: 2 }, { mint: 1 }, 'nightbloom', 1, ['mint']), { raw: { nightbloom: 1 }, adds: { mint: 0 } });
});

test('saved product is cleaned', () => {
  assert.deepEqual(cleanGoods([{ crop: 'carrot', potency: 5, purity: 50, units: 1 }, { crop: 'nightbloom', potency: 6, purity: 85, units: 2, name: 'X', adds: ['mint', 'bad'] }]).map(g => [g.crop, g.adds.join()]), [['nightbloom', 'mint']]);
});

test('the alley sells the dark seeds, the additives and the bench; the garden centre does not', () => {
  const s = supplies(3);
  assert.ok(s.some(o => o.seed === 'nightbloom') && s.some(o => o.additive === 'mint') && s.some(o => o.gear === 'bench'));
  assert.equal(offers(3).some(o => o.seed), false);
  assert.equal(GEAR.bench.sold, 'alley');
});
