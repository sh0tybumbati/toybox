import test from 'node:test';
import assert from 'node:assert/strict';
import { zoneInfo, allSections, sectionAt, floorsOf, entryZone, whyNotBuild, parseZone, reachableFloors, everyRoomTypeExists } from '../src/systems/world.js';
import { BLUEPRINTS, BUILDABLE, SLOTS, START_ZONE, starterCity, newBuilding, ROOM_W } from '../src/data/buildings.js';
import { ROOMS, defaultFurniture, shelvesFor } from '../src/data/rooms.js';
import { PROP_TYPES } from '../src/data/props.js';

test('every blueprint room exists, and the starter city is shaped like the map', () => {
  assert.ok(everyRoomTypeExists());
  const city = starterCity();
  assert.equal(city.length, SLOTS.length);
  assert.ok(zoneInfo(city, START_ZONE), 'the start zone exists');
  assert.ok(BUILDABLE.length >= 4 && BUILDABLE.includes('blank'));
  assert.notEqual(city[0], starterCity()[0], 'each city gets its own copies');
});

test('a zone is one wide panorama: rooms side by side, each as wide as it is', () => {
  const city = starterCity();
  city[0].floors[1].rooms[1].w = 1440;
  const z = zoneInfo(city, '0.1');
  assert.equal(z.name, 'Home');
  assert.equal(z.floorLabel, 'Floor 1');
  assert.deepEqual(z.sections.map(s => s.type), ['bedroom', 'bedroom']);
  assert.deepEqual(z.sections.map(s => s.offset), [0, 960]);
  assert.equal(z.width, 960 + 1440);
  assert.deepEqual(z.sections.map(s => s.id), ['0.2', '0.3']);
  assert.equal(zoneInfo(city, '0.7'), null);
  assert.equal(zoneInfo(city, '5.0'), null, 'empty lot');
  assert.equal(zoneInfo(city, 'nope'), null);
  assert.deepEqual(parseZone('3.2'), { slot: 3, floorId: 2 });
});

test('sectionAt finds the room a world x is in, with uneven widths (clamped at the ends)', () => {
  const city = starterCity();
  city[0].floors[0].rooms[0].w = 720;
  const z = zoneInfo(city, '0.0');
  assert.equal(sectionAt(z, 10).section.index, 0);
  assert.equal(sectionAt(z, 725).section.index, 1);
  assert.equal(sectionAt(z, 725).local, 5);
  assert.equal(sectionAt(z, 99999).section.index, 1);
  assert.equal(sectionAt(z, -50).section.index, 0);
});

test('floors list top first; entry is the ground floor', () => {
  const city = starterCity();
  assert.deepEqual(floorsOf(city, '0.0').map(f => f.label), ['Floor 1', 'Ground floor']);
  assert.equal(entryZone(city, 0), '0.0');
  assert.equal(entryZone(city, 7), null);
});

test('connectors: elevators reach any floor with an elevator; stairs and ladders only neighbours', () => {
  const b = newBuilding('apartments');
  const has = (...ids) => f => new Set(ids.includes(f.id) ? ['elevator'] : []);
  assert.deepEqual(reachableFloors(b, 0, 'elevator', has(0, 1, 2)), [1, 2]);
  assert.deepEqual(reachableFloors(b, 1, 'elevator', has(0, 2)), [0, 2], 'the elevator on this floor itself is the caller');
  const st = f => new Set(['stairs']);
  assert.deepEqual(reachableFloors(b, 0, 'stairs', st), [1]);
  assert.deepEqual(reachableFloors(b, 1, 'stairs', st), [0, 2]);
  assert.deepEqual(reachableFloors(b, 0, 'ladder', st), [], 'no ladder up there');
  assert.deepEqual(reachableFloors(b, 0, 'rocket', st), []);
});

test('section ids are unique across the whole city', () => {
  const city = starterCity(); city[3] = newBuilding('apartments'); city[4] = newBuilding('cottage');
  const ids = allSections(city).map(s => s.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('3.8'));
});

test('building: needs an empty lot, enough coins and respects unique buildings', () => {
  const city = starterCity();
  assert.equal(whyNotBuild(city, 5, 'cottage', 15), '');
  assert.equal(whyNotBuild(city, 5, 'cottage', 5), '10 more coins');
  assert.equal(whyNotBuild(city, 0, 'cottage', 99), 'lot is taken');
  assert.equal(whyNotBuild(city, 5, 'shop', 99), 'not for sale');
  assert.equal(whyNotBuild(city, 99, 'cottage', 99), 'no such lot');
  assert.equal(whyNotBuild(city, 5, 'castle', 99), 'not for sale');
});

test('every room type has the pieces a room needs; connectors are furniture', () => {
  for (const [id, r] of Object.entries(ROOMS)) {
    assert.ok(r.label && Array.isArray(r.shelves) && Array.isArray(r.props), id);
    assert.ok(r.outdoor ? typeof r.draw === 'function' : r.style, id);
    for (const p of r.props) assert.ok(PROP_TYPES[p.type], `${id}: ${p.type}`);
  }
  for (const k of ['elevator', 'stairs', 'ladder']) assert.equal(PROP_TYPES[k].connector, k);
  const home = BLUEPRINTS.home.floors.flatMap(f => f.rooms).filter(r => r.extra && r.extra.some(p => p.type === 'stairs'));
  assert.equal(home.length, 2, 'home has stairs on both floors');
});

test('stretching a room spreads its furniture out and keeps shelves on their walls', () => {
  const narrow = defaultFurniture('kitchen', 720), wide = defaultFurniture('kitchen', 1920);
  const fridge = t => t.find(p => p.type === 'fridge').x, oven = t => t.find(p => p.type === 'oven').x;
  assert.ok(oven(wide) - fridge(wide) > oven(narrow) - fridge(narrow));
  const sh = shelvesFor('shop', 1920);
  assert.equal(Math.min(...sh.map(s => s.x)), 15, 'left shelves stay left');
  assert.equal(Math.max(...sh.map(s => s.x)), 645 + 960, 'right shelves move with the right wall');
  assert.equal(ROOM_W.def, 960);
});

import { MINIGAMES } from '../src/data/minigames.js';

test('every station launches a registered mini-game, and every mini-game has a station', () => {
  const stations = Object.entries(PROP_TYPES).filter(([, d]) => d.behaviour === 'station');
  assert.ok(stations.length >= 5);
  for (const [id, d] of stations) assert.ok(MINIGAMES[d.game], `${id} -> ${d.game}`);
  const used = new Set(stations.map(([, d]) => d.game));
  for (const g of Object.keys(MINIGAMES)) assert.ok(used.has(g) || g === 'arcade' || g === 'beg', `${g} has a station`);          // (begging starts from a hard-mode action on the cardboard sign)
});

test('the function buildings are buildable and every room they use exists with its furniture', () => {
  for (const key of ['arcade', 'factory', 'workshop', 'postoffice', 'market', 'pond', 'campsite']) assert.ok(BUILDABLE.includes(key), key);
  for (const t of ['arcade', 'factory', 'workshop', 'postoffice', 'market', 'pond', 'campsite']) {
    const props = ROOMS[t].props.map(p => p.type);
    assert.ok(props.length >= 1, t);
    for (const p of props) assert.ok(PROP_TYPES[p], `${t}: ${p}`);
  }
});

import { whyNotDemolish, demolishRefund } from '../src/systems/world.js';

test('demolishing: there must be a building, and the last one stays', () => {
  const city = starterCity();
  assert.equal(whyNotDemolish(city, 5), 'nothing there');
  assert.equal(whyNotDemolish(city, 1), '');
  const lone = city.map((b, i) => (i === 0 ? b : null));
  assert.equal(whyNotDemolish(lone, 0), 'the last building stays');
});

test('the refund grows with the number of rooms but stays small', () => {
  assert.ok(demolishRefund(newBuilding('blank')) < demolishRefund(newBuilding('apartments')));
  const big = newBuilding('apartments');
  for (let i = 0; i < 5; i++) big.floors.push({ id: 10 + i, rooms: [...Array(5)].map((_, j) => ({ id: 100 + i * 10 + j, type: 'empty', w: 960 })) });
  assert.equal(demolishRefund(big), 30, 'capped');
});
