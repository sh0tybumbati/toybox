import test from 'node:test';
import assert from 'node:assert/strict';
import { BLUEPRINTS, newBuilding, roomDefW } from '../src/data/buildings.js';
import { ROOMS, defaultFurniture } from '../src/data/rooms.js';
import { addRoom, resizeRoom } from '../src/systems/builder.js';
import { ensureBathrooms, stripLooseShowers } from '../src/systems/layout.js';
import { migrate, sanitizeBuilding } from '../src/systems/save.js';
import { newHardSave } from '../src/data/hard/start.js';

test('a bathroom is a small room with its own shower, toilet and basin; nothing else has a shower', () => {
  assert.equal(roomDefW('bathroom'), 480);
  assert.deepEqual(defaultFurniture('bathroom', 480).map(p => p.type).sort(), ['basin', 'lightswitch', 'shower', 'toilet']);
  for (const [type, r] of Object.entries(ROOMS)) if (type !== 'bathroom') assert.ok(!(r.props || []).some(p => p.type === 'shower'), type);
  const b = newBuilding('blank'), room = addRoom(b, 0, 'bathroom');
  assert.equal(room.w, 480);
  assert.equal(resizeRoom(b, room.id, -3), 480, 'a bathroom does not shrink below half a screen');
  assert.equal(resizeRoom(b, room.id, 9), 720, 'nor stretch past three quarters');
});

test('every home blueprint has a bathroom, and the motel and shelter too', () => {
  for (const k of ['home', 'flat', 'cottage', 'apartments', 'motel', 'shelter']) assert.ok(BLUEPRINTS[k].floors.some(f => f.rooms.some(r => r.type === 'bathroom')), k);
  assert.equal(BLUEPRINTS.motel.floors[0].rooms[0].type, 'hall', 'the motel has a lobby for its desk');
});

test('ensureBathrooms adds one where a bedroom is and strips loose showers', () => {
  const b = newBuilding('blank');
  b.floors[0].rooms[0].extra = [{ type: 'shower', x: 860, y: 540 }, { type: 'mailbox', x: 250, y: 540 }];
  assert.equal(stripLooseShowers(b), 1);
  assert.deepEqual(b.floors[0].rooms[0].extra.map(p => p.type), ['mailbox']);
  assert.equal(ensureBathrooms(b).length, 1);
  assert.equal(ensureBathrooms(b).length, 0, 'only once');
});

test('v14 adult saves: showers leave the kitchen, the motel gets a lobby, the garden centre loses its bin', () => {
  const save = newHardSave({ scenario: 'flat' });
  const old = JSON.parse(JSON.stringify(save)); old.v = 14;
  const flat = old.city[0], motelAt = old.city.findIndex(b => b && b.name === 'Motel'), nur = old.city.findIndex(b => b && b.name === 'Garden Centre');
  flat.floors[0].rooms = flat.floors[0].rooms.filter(r => r.type !== 'bathroom'); flat.floors[0].rooms[0].extra.push({ type: 'shower', x: 860, y: 540 });
  old.city[motelAt].floors[0].rooms = [{ id: 0, type: 'motel', w: 960 }];
  old.city[nur].floors[0].rooms[0].extra = [{ type: 'dumpster', x: 700, y: 540 }];
  old.furniture = { [`${nur}.0`]: [{ type: 'dumpster', x: 700, y: 540, items: [] }] };
  const d = migrate(old);
  assert.equal(d.v, 15);
  assert.ok(d.city[0].floors[0].rooms.some(r => r.type === 'bathroom'));
  assert.ok(!d.city[0].floors[0].rooms.some(r => r.type !== 'bathroom' && (r.extra || []).some(p => p.type === 'shower')));
  assert.deepEqual(d.city[motelAt].floors[0].rooms.map(r => r.type), ['hall', 'motel', 'bathroom']);
  assert.equal(d.furniture[`${nur}.0`], undefined, 'the garden centre is laid out afresh');
  assert.ok(sanitizeBuilding(d.city[motelAt]));
});
