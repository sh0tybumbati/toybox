// Rooms. Shelf items are an endless supply — grabbing one leaves a fresh copy
// behind. `y` is the top surface of the board. To add a room: add an entry here
// (with a `draw` that paints its walls and floor onto a Graphics) and list it in
// ROOM_ORDER.
import { W, H } from '../config.js';

export const ROOMS = {
  kitchen: {
    label: '🍳 Kitchen',
    map: { x: 190, y: 250, emoji: '🍳' },
    shelves: [
      { x: 15,  y: 295, items: ['apple', 'banana', 'cookie', 'pizza'] },
      { x: 15,  y: 385, items: ['donut', 'melon', 'carrot', 'cupcake'] },
      { x: 645, y: 295, items: ['burger', 'taco', 'icecream', 'grapes'] },
      { x: 645, y: 385, items: ['lemon', 'pepper', 'berry', 'broccoli'] },
    ],
    // Props stand on `y` (their bottom edge); `x` is their centre.
    props: [
      { type: 'fridge', x: 372, y: 434 },
      { type: 'oven', x: 590, y: 434 },
      { type: 'pantry', x: 200, y: 520 },
      { type: 'lightswitch', x: 890, y: 168 },
    ],
    window: { x: 690, y: 70, w: 140, h: 120 },        // painted dark at night
    draw(g) {
      g.fillStyle(0xcdeee6, 1).fillRect(0, 0, W, 430);                     // tiled wall
      g.lineStyle(2, 0xb6dcd3, 1);
      for (let x = 0; x < W; x += 60) g.lineBetween(x, 0, x, 430);
      for (let y = 0; y < 430; y += 60) g.lineBetween(0, y, W, y);
      for (let row = 0; row < 3; row++) {                                  // checkered floor
        for (let col = 0; col < 16; col++) {
          g.fillStyle((row + col) % 2 ? 0xf1e4d0 : 0xe0cfb5, 1).fillRect(col * 60, 430 + row * 57, 60, 57);
        }
      }
      g.fillStyle(0xa8c9c0, 1).fillRect(0, 430, W, 8);
      g.fillStyle(0xf2a65a, 1).fillRoundedRect(350, 60, 260, 110, 8);      // wall cabinet
      g.lineStyle(4, 0xc77c2e, 1).strokeRoundedRect(350, 60, 260, 110, 8).lineBetween(480, 60, 480, 170);
      g.fillStyle(0xffffff, 1).fillCircle(465, 115, 6).fillCircle(495, 115, 6);
      g.fillStyle(0x9bd8ff, 1).fillRoundedRect(690, 70, 140, 120, 10);     // window
      g.lineStyle(8, 0xffffff, 1).strokeRoundedRect(690, 70, 140, 120, 10)
        .lineBetween(760, 70, 760, 190).lineBetween(690, 130, 830, 130);
      g.fillStyle(0xffffff, 1).fillCircle(170, 120, 40);                   // clock
      g.lineStyle(6, 0x555555, 1).strokeCircle(170, 120, 40)
        .lineBetween(170, 120, 170, 96).lineBetween(170, 120, 188, 128);
    },
  },
  bedroom: {
    label: '🛏️ Bedroom',
    map: { x: 190, y: 430, emoji: '🛏️' },
    shelves: [
      { x: 15,  y: 295, items: ['teddy', 'ball', 'car', 'balloon'] },
      { x: 15,  y: 385, items: ['duck', 'guitar', 'rocket', 'puzzle'] },
      { x: 645, y: 295, items: ['cap', 'tophat', 'crown', 'bow'] },
      { x: 645, y: 385, items: ['shades', 'specs', 'sneakers', 'boots'] },
    ],
    props: [
      { type: 'wardrobe', x: 372, y: 434 },
      { type: 'chest', x: 590, y: 434 },
      { type: 'lightswitch', x: 890, y: 168 },
    ],
    window: { x: 90, y: 70, w: 190, h: 150 },
    draw(g) {
      g.fillStyle(0xffe8b0, 1).fillRect(0, 0, W, 430);                     // wall
      g.fillStyle(0xc98f5a, 1).fillRect(0, 430, W, H - 430);               // floor
      g.fillStyle(0xb07a48, 1).fillRect(0, 430, W, 8);                     // skirting
      g.fillStyle(0x9bd8ff, 1).fillRoundedRect(90, 70, 190, 150, 10);      // window
      g.lineStyle(8, 0xffffff, 1).strokeRoundedRect(90, 70, 190, 150, 10);
      g.lineBetween(185, 70, 185, 220).lineBetween(90, 145, 280, 145);
      g.fillStyle(0xff8fa3, 1).fillRoundedRect(680, 80, 160, 100, 8);      // picture frame
      g.fillStyle(0xfff3a0, 1).fillCircle(760, 130, 26);
    },
  },
  park: {
    label: '🌳 Park',
    map: { x: 520, y: 180, emoji: '🌳' },
    shelfStyle: 'stand',                               // market stands instead of wall shelves
    openSky: true,                                      // stars + moon at night, no window
    shelves: [
      { x: 15,  y: 295, items: ['ball', 'kite', 'balloon', 'duck'] },
      { x: 15,  y: 385, items: ['apple', 'banana', 'cookie', 'milk'] },
      { x: 645, y: 295, items: ['car', 'teddy', 'rocket', 'puzzle'] },
      { x: 645, y: 385, items: ['berry', 'grapes', 'cheese', 'cupcake'] },
    ],
    props: [
      { type: 'basket', x: 372, y: 434 },
      { type: 'lamppost', x: 590, y: 434 },
    ],
    draw(g) {
      g.fillStyle(0x9ad8ff, 1).fillRect(0, 0, W, 430);                     // sky
      g.fillStyle(0xbfe9ff, 1).fillRect(0, 250, W, 180);
      g.fillStyle(0xffe066, 1).fillCircle(840, 100, 46);                   // sun
      g.fillStyle(0xfff3a0, 0.5).fillCircle(840, 100, 64);
      g.fillStyle(0xffffff, 0.9);
      [[220, 110, 90, 34], [270, 98, 70, 30], [520, 150, 110, 38], [570, 140, 70, 30]]
        .forEach(([x, y, w, h]) => g.fillEllipse(x, y, w, h));              // clouds
      g.fillStyle(0x8bd17c, 1).fillEllipse(220, 440, 560, 170).fillEllipse(760, 450, 640, 210);   // hills
      for (let i = 0; i < 16; i++) {                                       // grass stripes
        g.fillStyle(i % 2 ? 0x6fbf5a : 0x66b552, 1).fillRect(i * 60, 430, 60, 170);
      }
      for (const tx of [335, 640]) {                                       // trees
        g.fillStyle(0x8a5e3b, 1).fillRect(tx - 12, 250, 24, 182);
        g.fillStyle(0x3e9a4a, 1).fillCircle(tx, 225, 64).fillCircle(tx - 40, 255, 42).fillCircle(tx + 40, 255, 42);
      }
      g.fillStyle(0xff8fa3, 1);                                            // flowers
      for (let i = 0; i < 18; i++) g.fillCircle(30 + ((i * 97) % 900), 455 + ((i * 53) % 120), 4);
    },
  },
  shop: {
    label: '🛍️ Shop',
    map: { x: 770, y: 400, emoji: '🛍️' },
    shelves: [
      { x: 15,  y: 295, items: ['dog', 'cat', 'panda', 'frog'] },
      { x: 15,  y: 385, items: ['unicorn', 'dino', 'fox', 'rabbit'] },
      { x: 645, y: 295, items: ['elephant', 'crystal', 'helmet', 'heels'] },
    ],
    props: [
      { type: 'register', x: 780, y: 434 },
      { type: 'lightswitch', x: 890, y: 168 },
    ],
    window: null,
    draw(g) {
      g.fillStyle(0xffe3ec, 1).fillRect(0, 0, W, 430);                     // striped wall
      g.fillStyle(0xffd0dc, 1);
      for (let x = 0; x < W; x += 80) g.fillRect(x, 0, 40, 430);
      g.fillStyle(0xcfae86, 1).fillRect(0, 430, W, H - 430);               // wooden floor
      g.lineStyle(2, 0xb8936b, 1);
      for (let y = 460; y < H; y += 30) g.lineBetween(0, y, W, y);
      g.fillStyle(0xb8936b, 1).fillRect(0, 430, W, 8);
      g.fillStyle(0xd6708a, 0.6).fillEllipse(480, 520, 400, 80);           // rug
      for (let i = 0; i < 12; i++) {                                       // awning
        g.fillStyle(i % 2 ? 0xffffff : 0xe5484d, 1).fillRect(i * 80, 56, 80, 34);
        g.fillStyle(i % 2 ? 0xffffff : 0xe5484d, 1).fillCircle(i * 80 + 40, 90, 40);
      }
      for (let i = 0; i < 12; i++) {                                       // bunting
        g.fillStyle([0xffd166, 0x6ec6ff, 0xff6b8b, 0x7bd88f][i % 4], 1)
          .fillTriangle(i * 80 + 10, 150, i * 80 + 70, 150, i * 80 + 40, 190);
      }
    },
  },
};

export const ROOM_ORDER = ['kitchen', 'bedroom', 'park', 'shop'];   // order used by saves and the map
export const START_ROOM = 'bedroom';

// A room's furniture as it starts out (the player moves/adds/removes it; saves hold the result).
export const defaultFurniture = key => (ROOMS[key].props || []).map(p => ({ type: p.type, x: p.x, y: p.y, items: [] }));
