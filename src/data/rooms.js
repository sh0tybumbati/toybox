// Room types. A room is one screen (960px) wide; buildings (data/buildings.js) line rooms up
// side by side to make a floor. Homes and parks have no endless supply: what they hold is
// furniture (a wall shelf, a picnic table…) that starts with a few `stock` items, which you can
// carry off, put back, or move around in furniture mode. Only the shops and the function rooms
// keep `shelves`: a shelf item is an endless supply — grabbing one leaves a fresh copy behind.
// `y` is the top surface of the board. All coordinates here are local to the room (0..960); the
// world places the room at its offset.
//   Indoor rooms are `style` ({ wall, floor } ids from data/decor.js) + `windows` + optional
//   fixed `decor(g)` art, so players can repaint them. Outdoor rooms (`outdoor: true`) paint
//   themselves with `draw(g)`. To add a room type: add an entry here.
import { W, H } from '../config.js';
import { paintAlley, paintOutdoor } from './decor.js';

export const ROOMS = {
  kitchen: {
    label: '🍳 Kitchen',
    buildable: true,
    style: { wall: 'mintTiles', floor: 'checker' },
    shelves: [],
    // Props stand on `y` (their bottom edge); `x` is their centre. `stock` fills a storage piece's slots.
    props: [
      { type: 'shelf', x: 165, y: 309, stock: ['apple', 'banana', 'cookie', 'pizza'] },
      { type: 'shelf', x: 795, y: 309, stock: ['burger', 'taco', 'donut'] },
      { type: 'fridge', x: 372, y: 434 },
      { type: 'oven', x: 590, y: 434 },
      { type: 'pantry', x: 200, y: 520 },
      { type: 'table', x: 745, y: 540 },
      { type: 'chair', x: 590, y: 540 },
      { type: 'lightswitch', x: 890, y: 168 },
    ],
    windows: [{ x: 690, y: 70, w: 140, h: 120 }],      // painted dark at night
    decor(g) {
      g.fillStyle(0xf2a65a, 1).fillRoundedRect(350, 60, 260, 110, 8);      // wall cabinet
      g.lineStyle(4, 0xc77c2e, 1).strokeRoundedRect(350, 60, 260, 110, 8).lineBetween(480, 60, 480, 170);
      g.fillStyle(0xffffff, 1).fillCircle(465, 115, 6).fillCircle(495, 115, 6);
      g.fillStyle(0xffffff, 1).fillCircle(170, 120, 40);                   // clock
      g.lineStyle(6, 0x555555, 1).strokeCircle(170, 120, 40)
        .lineBetween(170, 120, 170, 96).lineBetween(170, 120, 188, 128);
    },
  },
  bedroom: {
    label: '🛏️ Bedroom',
    buildable: true,
    style: { wall: 'cream', floor: 'honey' },
    shelves: [],
    props: [
      { type: 'shelf', x: 165, y: 309, stock: ['teddy', 'ball', 'car', 'box'] },
      { type: 'shelf', x: 795, y: 309, stock: ['cap', 'crown', 'shades'] },
      { type: 'wardrobe', x: 372, y: 434 },
      { type: 'chest', x: 590, y: 434 },
      { type: 'bed', x: 480, y: 540 },
      { type: 'lightswitch', x: 890, y: 168 },
    ],
    windows: [{ x: 90, y: 70, w: 190, h: 150 }],
    decor(g) {
      g.fillStyle(0xff8fa3, 1).fillRoundedRect(680, 80, 160, 100, 8);      // picture frame
      g.fillStyle(0xfff3a0, 1).fillCircle(760, 130, 26);
    },
  },
  // The lobby of a multi-floor building: the elevator lives here.
  hall: {
    label: '🛗 Lobby',
    buildable: true,
    bin: false,
    style: { wall: 'panel', floor: 'carpet' },
    shelves: [],
    props: [
      { type: 'lightswitch', x: 760, y: 168 },
    ],
    windows: [],
    decor(g) {
      g.fillStyle(0xa89ad6, 1).fillRect(150, 470, 660, 90);                // runner
      g.lineStyle(4, 0xffe9a8, 1).strokeRect(150, 470, 660, 90);
      for (const x of [130, 830]) {                                         // wall lamps
        g.fillStyle(0xffe9a8, 1).fillCircle(x, 170, 22);
        g.fillStyle(0xfff6d6, 0.6).fillCircle(x, 170, 36);
      }
      g.fillStyle(0xffffff, 1).fillRoundedRect(60, 80, 120, 70, 8);        // framed art
      g.fillStyle(0x6ec6ff, 1).fillRoundedRect(70, 90, 100, 50, 6);
      g.fillStyle(0xffd166, 1).fillCircle(120, 112, 14);
    },
  },
  living: {
    label: '🛋️ Living room',
    buildable: true,
    style: { wall: 'sage', floor: 'warm' },
    shelves: [],
    props: [
      { type: 'shelf', x: 165, y: 309, stock: ['puzzle', 'guitar', 'backpack'] },
      { type: 'shelf', x: 795, y: 309, stock: ['ball', 'duck', 'kite'] },
      { type: 'bookcase', x: 372, y: 434 },
      { type: 'armchair', x: 640, y: 530 },
      { type: 'lightswitch', x: 890, y: 168 },
    ],
    windows: [{ x: 90, y: 70, w: 190, h: 150 }],
    decor(g) {
      g.fillStyle(0xe58f8f, 1).fillEllipse(560, 520, 420, 70);             // rug
      g.fillStyle(0xf0b0b0, 1).fillEllipse(560, 520, 330, 48);
      g.fillStyle(0x6f9be0, 1).fillRoundedRect(450, 330, 220, 70, 18);     // sofa
      g.fillStyle(0x5584cc, 1).fillRoundedRect(440, 350, 30, 80, 12).fillRoundedRect(650, 350, 30, 80, 12);
      g.fillStyle(0x7fabee, 1).fillRoundedRect(470, 372, 180, 50, 12);
      g.fillStyle(0xffe066, 1).fillRoundedRect(335, 90, 150, 90, 8);       // picture
      g.fillStyle(0xff8fa3, 1).fillCircle(410, 135, 28);
    },
  },
  park: {
    label: '🌳 Park',
    outdoor: true,
    openSky: true,                                      // stars + moon at night, no window
    shelves: [],
    props: [
      { type: 'tree', x: 90, y: 480 },
      { type: 'bench', x: 260, y: 484 },
      { type: 'lamppost', x: 430, y: 434 },
      { type: 'picnictable', x: 620, y: 490, stock: ['apple', 'banana', 'cookie', 'milk'] },
      { type: 'sandbox', x: 840, y: 490, stock: ['ball', 'duck'] },
      { type: 'petbasket', x: 380, y: 540 },
    ],
    draw(g) { paintOutdoor(g, 'park'); },
  },
  playground: {
    label: '🛝 Playground',
    outdoor: true,
    openSky: true,
    shelves: [],
    props: [
      { type: 'swing', x: 140, y: 490 },
      { type: 'slide', x: 390, y: 490 },
      { type: 'lamppost', x: 560, y: 434 },
      { type: 'seesaw', x: 710, y: 500 },
      { type: 'springhorse', x: 890, y: 500 },
    ],
    draw(g) { paintOutdoor(g, 'playground'); },
  },
  garden: {
    label: '🌻 Garden',
    outdoor: true,
    buildable: true,
    openSky: true,
    shelves: [],
    props: [{ type: 'tree', x: 90, y: 480 }, { type: 'bench', x: 700, y: 484 }],
    draw(g) { paintOutdoor(g, 'garden'); },
  },
  nursery: {
    label: '🪴 Garden Centre',
    style: { wall: 'mintTiles', floor: 'oak' },
    shelves: [],
    props: [
      { type: 'plant', x: 90, y: 434 }, { type: 'seedrack', x: 300, y: 470 }, { type: 'plant', x: 520, y: 434 },
      { type: 'plant', x: 640, y: 540 }, { type: 'cabinet', x: 800, y: 434 }, { type: 'plant', x: 900, y: 540 },
      { type: 'lightswitch', x: 890, y: 168 },
    ],
    windows: [{ x: 560, y: 60, w: 200, h: 110 }],
  },
  // A bathroom is its own small room (half a screen) so a shower never ends up in a kitchen or a bedroom.
  bathroom: {
    label: '🚿 Bathroom',
    buildable: true,
    bin: false,
    w: 480, minW: 480, maxW: 720,
    style: { wall: 'mintTiles', floor: 'checker' },
    shelves: [],
    props: [
      { type: 'basin', x: 150, y: 434 },
      { type: 'toilet', x: 470, y: 434 },
      { type: 'shower', x: 790, y: 540 },
      { type: 'lightswitch', x: 890, y: 168 },
    ],
    windows: [{ x: 300, y: 70, w: 200, h: 120 }],
    decor(g) {
      g.fillStyle(0xdbe9f6, 1).fillRoundedRect(110, 90, 100, 120, 10);     // a mirror over the basin
      g.lineStyle(5, 0x9ab4cc, 1).strokeRoundedRect(110, 90, 100, 120, 10);
      g.fillStyle(0xffffff, 0.7).fillRect(124, 104, 14, 70);
      g.fillStyle(0xf59ab4, 1).fillRoundedRect(380, 330, 150, 14, 6);      // a towel rail
      g.fillStyle(0xfff3a0, 1).fillRoundedRect(396, 344, 40, 70, 5);
    },
  },
  // A blank canvas for building from scratch.
  empty: {
    label: '⬜ Empty room',
    buildable: true,
    style: { wall: 'cream', floor: 'oak' },
    shelves: [],
    props: [{ type: 'lightswitch', x: 890, y: 168 }],
    windows: [{ x: 400, y: 70, w: 160, h: 130 }],
  },
  // ---- function rooms: each has a station that launches a mini-game (data/minigames.js) ----
  arcade: {
    label: '🕹️ Arcade',
    buildable: true,
    style: { wall: 'arcade', floor: 'carpet' },
    shelves: [
      { x: 15,  y: 295, items: ['popcorn', 'cocoa', 'donut', 'cupcake'] },
      { x: 645, y: 295, items: ['robot', 'puzzle', 'ball', 'car'] },
    ],
    props: [{ type: 'tv', x: 330, y: 470 }, { type: 'tv', x: 640, y: 470 }, { type: 'lightswitch', x: 890, y: 168 }],
    windows: [],
  },
  factory: {
    label: '🧵 Shirt factory',
    style: { wall: 'grey', floor: 'concrete' },
    shelves: [
      { x: 15,  y: 295, items: ['cap', 'tophat', 'sunhat', 'bow'] },
      { x: 645, y: 295, items: ['sneakers', 'boots', 'specs', 'shades'] },
    ],
    props: [{ type: 'sewing', x: 480, y: 480 }, { type: 'lightswitch', x: 890, y: 168 }],
    windows: [{ x: 400, y: 60, w: 160, h: 110 }],
    decor(g) {                                                           // a conveyor belt running across the wall
      g.fillStyle(0x6b7482, 1).fillRoundedRect(130, 340, 700, 26, 10);
      for (let x = 150; x < 820; x += 70) g.fillStyle(0x4a5368, 1).fillCircle(x, 353, 7);
      for (const [x, col] of [[220, 0x6aaee8], [420, 0xf59ab4], [650, 0xffd166]]) g.fillStyle(col, 1).fillRoundedRect(x, 318, 56, 30, 8);
    },
  },
  workshop: {
    label: '🧸 Toy workshop',
    style: { wall: 'cream', floor: 'warm' },
    shelves: [
      { x: 15,  y: 295, items: ['teddy', 'robot', 'duck', 'rocket'] },
      { x: 15,  y: 385, items: ['car', 'ball', 'puzzle', 'guitar'] },
      { x: 645, y: 295, items: ['kite', 'balloon', 'crystal', 'dino'] },
    ],
    props: [{ type: 'claytable', x: 480, y: 480 }, { type: 'lightswitch', x: 890, y: 168 }],
    windows: [{ x: 600, y: 60, w: 170, h: 130 }],
  },
  bank: {
    label: '🏦 Bank',
    style: { wall: 'sky', floor: 'checker' },
    shelves: [],
    props: [
      { type: 'plant', x: 70, y: 434 }, { type: 'bench', x: 190, y: 540 }, { type: 'desk', x: 790, y: 500 },
      { type: 'chair', x: 700, y: 540 }, { type: 'plant', x: 900, y: 434 }, { type: 'lightswitch', x: 890, y: 168 },
    ],
    windows: [{ x: 160, y: 60, w: 150, h: 110 }],
    decor(g) {
      g.fillStyle(0xf0c868, 1).fillRoundedRect(380, 200, 200, 46, 10);                 // a sign
      g.fillStyle(0x4a3426, 1).fillRect(410, 216, 140, 5).fillRect(430, 228, 100, 5);
      g.fillStyle(0x8a94a4, 1).fillCircle(790, 220, 84);                               // the vault door
      g.fillStyle(0xb9c2d0, 1).fillCircle(790, 220, 68);
      g.lineStyle(6, 0x6b7482, 1).strokeCircle(790, 220, 84).strokeCircle(790, 220, 46);
      g.fillStyle(0x4a5368, 1).fillCircle(790, 220, 14).fillRect(784, 150, 12, 26).fillRect(784, 264, 12, 26).fillRect(720, 214, 26, 12).fillRect(834, 214, 26, 12);
    },
  },
  council: {
    label: '🏛 Council Hall',
    style: { wall: 'sky', floor: 'checker' },
    shelves: [],
    props: [
      { type: 'plant', x: 70, y: 434 }, { type: 'bench', x: 160, y: 540 }, { type: 'desk', x: 600, y: 500 },
      { type: 'chair', x: 520, y: 540 }, { type: 'bookcase', x: 790, y: 434 }, { type: 'floorlamp', x: 920, y: 500 },
      { type: 'lightswitch', x: 890, y: 168 },
    ],
    windows: [{ x: 160, y: 60, w: 150, h: 110 }, { x: 640, y: 60, w: 150, h: 110 }],
    decor(g) {
      g.fillStyle(0xcf4a4a, 1).fillRoundedRect(400, 80, 70, 110, 6);                   // a banner and a notice board
      g.fillStyle(0xf0c868, 1).fillCircle(435, 135, 18);
      g.fillStyle(0x9a6f45, 1).fillRoundedRect(330, 210, 140, 70, 6);
      for (const [x, y] of [[344, 222], [394, 224], [434, 220], [352, 252], [408, 250]]) g.fillStyle(0xf5ecd8, 1).fillRect(x, y, 30, 22);
    },
  },
  college: {
    label: '🎓 College',
    style: { wall: 'sky', floor: 'oak' },
    shelves: [],
    props: [
      { type: 'bookcase', x: 110, y: 434 }, { type: 'bookcase', x: 850, y: 434 },
      { type: 'chair', x: 330, y: 545 }, { type: 'chair', x: 640, y: 545 }, { type: 'plant', x: 900, y: 540 },
      { type: 'lightswitch', x: 890, y: 168 },
    ],
    windows: [{ x: 160, y: 60, w: 150, h: 110 }],
    decor(g) {
      g.fillStyle(0x3f6a52, 1).fillRoundedRect(330, 130, 300, 120, 8);                 // a blackboard
      g.fillStyle(0xf5ecd8, 1).fillRect(356, 160, 160, 5).fillRect(356, 186, 220, 5).fillRect(356, 212, 120, 5);
    },
  },
  postoffice: {
    label: '📮 Post office',
    style: { wall: 'sky', floor: 'oak' },
    shelves: [
      { x: 15,  y: 295, items: ['box', 'box', 'backpack', 'puzzle'] },
      { x: 645, y: 295, items: ['teddy', 'ball', 'kite', 'cap'] },
    ],
    props: [{ type: 'mailbox', x: 330, y: 470 }, { type: 'mailbox', x: 640, y: 470 }, { type: 'lightswitch', x: 890, y: 168 }],
    windows: [{ x: 410, y: 60, w: 150, h: 110 }],
    decor(g) {
      g.fillStyle(0xf59ab4, 1).fillRoundedRect(420, 210, 120, 40, 8);                  // a sign
      g.fillStyle(0xffffff, 1).fillRoundedRect(436, 222, 88, 14, 5);
    },
  },
  market: {
    label: '🛒 Supermarket',
    style: { wall: 'mintTiles', floor: 'checker' },
    shelves: [
      { x: 15,  y: 295, items: ['flour', 'tomato', 'potato', 'corn'] },
      { x: 15,  y: 385, items: ['meat', 'rice', 'fish', 'chocolate'] },
      { x: 645, y: 295, items: ['egg', 'cheese', 'milk', 'bread'] },
      { x: 645, y: 385, items: ['jam', 'fries', 'popcorn', 'cocoa'] },
    ],
    props: [{ type: 'cart', x: 360, y: 470 }, { type: 'till', x: 600, y: 480 }, { type: 'lightswitch', x: 890, y: 168 }],
    windows: [],
  },
  ikea: {
    label: '🪑 Furniture store',
    style: { wall: 'blush', floor: 'oak' },
    shelves: [],
    props: [
      { type: 'sofa', x: 150, y: 490 }, { type: 'floorlamp', x: 290, y: 500 },
      { type: 'flatpack', x: 480, y: 500 },
      { type: 'dresser', x: 650, y: 500 }, { type: 'desk', x: 820, y: 500 },
      { type: 'lightswitch', x: 890, y: 168 },
    ],
    windows: [{ x: 380, y: 60, w: 200, h: 110 }],
  },
  shelter: {
    label: '🏠 Shelter',
    style: { wall: 'cream', floor: 'concrete' },
    shelves: [],
    props: [
      { type: 'cot', x: 130, y: 540 }, { type: 'cot', x: 310, y: 540 }, { type: 'cot', x: 490, y: 540 },
      { type: 'servery', x: 700, y: 500 }, { type: 'lightswitch', x: 890, y: 168 },
    ],
    windows: [{ x: 360, y: 60, w: 150, h: 110 }],
  },
  motel: {
    label: '🛏️ Motel room',
    style: { wall: 'sage', floor: 'concrete' },
    shelves: [],
    props: [
      { type: 'bed', x: 480, y: 540 }, { type: 'chair', x: 700, y: 540 }, { type: 'floorlamp', x: 840, y: 500 },
      { type: 'lightswitch', x: 890, y: 168 },
    ],
    windows: [{ x: 640, y: 60, w: 150, h: 110 }],
  },
  alley: {
    label: '🧱 Back alley',
    outdoor: true,
    shelves: [],
    margin: [0x5d5057, 0x3b3b44],
    props: [{ type: 'dumpster', x: 130, y: 540 }, { type: 'firebarrel', x: 360, y: 540 }, { type: 'dealer', x: 640, y: 540 }, { type: 'corner', x: 860, y: 520 }],
    draw(g) { paintAlley(g); },
  },
  pond: {
    label: '🎣 Fishing pond',
    outdoor: true,
    shelfStyle: 'stand',
    openSky: true,
    shelves: [
      { x: 15,  y: 295, items: ['apple', 'banana', 'cookie', 'milk'] },
      { x: 645, y: 295, items: ['fish', 'sushi', 'rice', 'cupcake'] },
    ],
    props: [{ type: 'dock', x: 480, y: 470 }],
    draw(g) { paintOutdoor(g, 'pond'); },
  },
  campsite: {
    label: '⛺ Campsite',
    outdoor: true,
    shelfStyle: 'stand',
    openSky: true,
    shelves: [
      { x: 15,  y: 295, items: ['cocoa', 'cookie', 'jam', 'sandwich'] },
      { x: 645, y: 295, items: ['pancakes', 'berry', 'apple', 'cheese'] },
    ],
    props: [{ type: 'campfire', x: 480, y: 500 }, { type: 'lamppost', x: 880, y: 434 }],
    draw(g) { paintOutdoor(g, 'campsite'); },
  },
  shop: {
    label: '🛍️ Shop',
    style: { wall: 'pinkStripes', floor: 'shop' },
    shelves: [
      { x: 15,  y: 295, items: ['dog', 'cat', 'panda', 'frog'] },
      { x: 15,  y: 385, items: ['unicorn', 'dino', 'fox', 'rabbit'] },
      { x: 645, y: 295, items: ['elephant', 'crystal', 'helmet', 'heels'] },
    ],
    props: [
      { type: 'register', x: 780, y: 434 },
      { type: 'lightswitch', x: 890, y: 168 },
    ],
    windows: [],
    decor(g) {
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

// Positions in the room types are for a 960px room; a stretched room spreads them out in proportion.
export const scaleX = (x, w) => Math.round(x * w / W / 10) * 10;

// A room's furniture as it starts out: its type's pieces (with their starting `stock`) plus `extra`
// (stairs, elevator…). The player moves/adds/removes it; saves hold the result.
export const defaultFurniture = (type, w = W, extra = []) =>
  [...(ROOMS[type].props || []), ...extra].map(p => ({ type: p.type, x: scaleX(p.x, w), y: p.y, items: (p.stock || []).map((k, s) => ({ s, k })) }));

// Shelves hug the left or right wall of a stretched room (the right-hand ones move with the right wall).
export const shelvesFor = (type, w = W) => (ROOMS[type].shelves || []).map(sh => ({ ...sh, x: sh.x < W / 2 ? sh.x : sh.x + (w - W) }));
