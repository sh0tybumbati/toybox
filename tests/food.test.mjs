import test from 'node:test';
import assert from 'node:assert/strict';
import { HARD_PRICES, hardPriceOf, SHELF_LIFE, shelfLifeOf, BAG_CAP, LARDER_CAP, SHOP_HOURS, STOCK_START } from '../src/data/hard/food.js';
import { addFood, expire, takeBest, store, cleanFood } from '../src/systems/hard/pantry.js';
import { newShop, scheduleNext, delayFor, inStock, take, deliverIfDue, totalStock, cleanShop } from '../src/systems/hard/stock.js';
import { ROOMS } from '../src/data/rooms.js';
import { CATALOG } from '../src/data/items.js';
import { nutritionOf } from '../src/data/hard/needs.js';
import { PRICES } from '../src/systems/market.js';

const seeded = seed => { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

test('every shop item has a cash price, and food is cheap enough that a labour day feeds you with room to spare', () => {
  for (const sh of ROOMS.market.shelves) for (const k of sh.items) assert.ok(hardPriceOf(k) > 0, `${k} has a price`);
  for (const k of Object.keys(HARD_PRICES)) assert.ok(CATALOG[k] && PRICES[k], `${k} is a real shop item`);
  // hunger falls 5/h = 120/day: the cheapest way to cover it must cost well under a labour wage ($1200)
  const costPerHunger = Math.min(...Object.keys(HARD_PRICES).map(k => HARD_PRICES[k] / nutritionOf(k)));
  assert.ok(costPerHunger * 120 < 400, `a day of food costs ${Math.round(costPerHunger * 120)}`);
  assert.equal(hardPriceOf('teddy'), 0);
});

test('food keeps for its own time, and a fridge doubles it when you store it', () => {
  const now = 1000;
  let bag = addFood([], 'fish', now, BAG_CAP);
  bag = addFood(bag, 'rice', now, BAG_CAP);
  assert.deepEqual(bag.map(f => f.k), ['fish', 'rice'], 'the one that goes off first is first');
  assert.equal(bag[0].exp, now + 2 * 1440);
  const out = store(bag, [], now, LARDER_CAP, true);
  assert.equal(out.moved, 2); assert.equal(out.from.length, 0);
  assert.equal(out.to[0].exp, now + 2 * 1440 * 2, 'fish in the fridge lasts four days');
  assert.equal(store(bag, [], now, LARDER_CAP, false).to[0].exp, now + 2 * 1440);
  assert.equal(shelfLifeOf('unknownfood'), 4); assert.ok(SHELF_LIFE.rice > SHELF_LIFE.fish);
});

test('spoiled food is thrown out, you eat the oldest first, and bags and larders have limits', () => {
  const list = addFood(addFood([], 'burger', 0, 9), 'rice', 0, 9);
  const e = expire(list, 1500);
  assert.deepEqual(e.spoiled, ['burger']); assert.deepEqual(e.kept.map(f => f.k), ['rice']);
  assert.equal(takeBest(list).item.k, 'burger'); assert.equal(takeBest([]), null);
  let full = []; for (let i = 0; i < BAG_CAP; i++) full = addFood(full, 'bread', 0, BAG_CAP);
  assert.equal(addFood(full, 'bread', 0, BAG_CAP), null, 'the bag is full');
  assert.equal(store(full, Array(LARDER_CAP - 2).fill({ k: 'rice', exp: 99999 }), 0, LARDER_CAP).moved, 2, 'only what fits');
  assert.deepEqual(cleanFood([{ k: 'apple', exp: 5 }, { k: 3 }, null, { k: 'bread', exp: 'x' }], 10), [{ k: 'apple', exp: 5 }]);
});

test('the delivery van is due Monday 07:00; about on time most weeks, sometimes hours late, now and then a day or two', () => {
  assert.equal(scheduleNext(0, () => 0).due, 7 * 60, 'from Monday 00:00 it is due at 07:00 the same day');
  assert.equal(scheduleNext(6 * 60, () => 0).due, 7 * 60, 'Monday 06:00: it is due at 07:00 today');
  assert.equal(scheduleNext(7 * 60, () => 0).due, 7 * 1440 + 7 * 60, 'Monday 07:00 exactly: the next one is a week on');
  assert.equal(scheduleNext(3 * 1440, () => 0).due, 7 * 1440 + 7 * 60);
  const r = seeded(11), delays = Array.from({ length: 2000 }, () => delayFor(r));
  const share = f => delays.filter(f).length / delays.length;
  assert.ok(share(d => d <= 30) > 0.6, 'mostly about on time');
  assert.ok(share(d => d >= 60 && d <= 360) > 0.1, 'sometimes hours late');
  assert.ok(share(d => d >= 1440) > 0.03 && share(d => d >= 1440) < 0.15, 'now and then a day or two');
  assert.ok(Math.max(...delays) <= 2880 && Math.min(...delays) >= 0);
});

test('shops sell their stock down and the van refills it, and a late van keeps the shelves empty longer', () => {
  const shop = newShop(['bread', 'rice'], 0, () => 0);
  assert.equal(shop.stock.bread, STOCK_START); assert.equal(totalStock(shop), 2 * STOCK_START);
  for (let i = 0; i < STOCK_START; i++) assert.ok(take(shop, 'bread'));
  assert.ok(!inStock(shop, 'bread') && !take(shop, 'bread'));
  assert.equal(deliverIfDue(shop, shop.due - 1, () => 0), false, 'not yet');
  const late = newShop(['bread'], 0, () => 0.8);              // r=0.8 -> a few hours late
  take(late, 'bread');
  assert.equal(deliverIfDue(late, late.due, () => 0), false, 'due time passed but the van is late');
  assert.ok(late.next > late.due);
  assert.equal(deliverIfDue(late, late.next, () => 0), true);
  assert.equal(late.stock.bread, STOCK_START);
  assert.ok(late.due > late.next - 1440 * 3 && late.due >= 7 * 1440, 'and the next trip is booked a week on');
});

test('saved shops are repaired, and shops open 7 to 22', () => {
  assert.deepEqual(SHOP_HOURS, [[7, 22]]);
  const c = cleanShop({ stock: { bread: 500, rice: -3 }, due: 100, next: 50 }, ['bread', 'rice', 'egg']);
  assert.deepEqual(c.stock, { bread: 99, rice: 0, egg: STOCK_START });
  assert.ok(c.next >= c.due, 'a van cannot arrive before it is due');
  const ok = cleanShop({ stock: { bread: 2 }, due: 100, next: 130 }, ['bread']);
  assert.deepEqual(ok, { stock: { bread: 2 }, due: 100, next: 130 });
});
