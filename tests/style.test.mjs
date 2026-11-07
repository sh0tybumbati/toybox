import test from 'node:test';
import assert from 'node:assert/strict';
import { shade, tonal, sunbeamShapes, TONE } from '../src/data/style.js';
import { WALL_H } from '../src/data/decor.js';
import { H } from '../src/config.js';

test('tonal lines: the same hue, darker; channels stay in range', () => {
  assert.equal(shade(0xffffff, 0.5), 0x808080);
  assert.equal(shade(0xff8000, 2), 0xffff00, 'clamped at 255');
  assert.equal(shade(0x000000, 0.7), 0);
  const fill = 0xfdeee6, line = tonal(fill);
  for (const s of [16, 8, 0]) assert.ok(((line >> s) & 255) < ((fill >> s) & 255));
  assert.equal(line, shade(fill, TONE));
});

test('a sunbeam slants down-right from its window, wall first and then floor, inside the room', () => {
  const win = { x: 580, y: 64, w: 210, h: 166 };
  const [wall, floor] = sunbeamShapes(win, 960, WALL_H, H);
  assert.equal(wall[0].y, win.y + win.h - 4, 'starts at the window sill');
  assert.ok(wall[2].y === WALL_H && wall[2].x > wall[1].x, 'reaches the floor line, shifted right');
  assert.ok(floor[0].y === WALL_H && floor[2].y === H, 'continues across the floor');
  for (const p of [...wall, ...floor]) assert.ok(p.x >= 0 && p.x <= 960 && p.y <= H, JSON.stringify(p));
  const narrow = sunbeamShapes({ x: 500, y: 70, w: 160, h: 130 }, 720, WALL_H, H).flat();
  assert.ok(narrow.every(p => p.x <= 720), 'clipped to a narrow room');
});
