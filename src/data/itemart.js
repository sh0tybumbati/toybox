// Hand-inked art for every item (replaces emoji; art/reference/: wonky, flat matte colour, bold uneven
// outlines). Each drawing is a function of an InkPen, painted in a 128x128 box with the item standing on y≈118,
// so Item can use the same box for every item. Colours are flat; shapes are a few wobbly blobs — recognisable first.
export const ART_BOX = 128;

// --- little helpers ----------------------------------------------------------------------------
const e = (p, x, y, rx, ry, c) => p.fillStyle(c, 1).fillEllipse(x, y, rx * 2, ry * 2);
const c = (p, x, y, r, col) => p.fillStyle(col, 1).fillCircle(x, y, r);
const r = (p, x, y, w, h, col, rad = 0) => (rad ? p.fillStyle(col, 1).fillRoundedRect(x, y, w, h, rad) : p.fillStyle(col, 1).fillRect(x, y, w, h));
const t = (p, x1, y1, x2, y2, x3, y3, col) => p.fillStyle(col, 1).fillTriangle(x1, y1, x2, y2, x3, y3);
const poly = (p, pts, col) => p.fillStyle(col, 1).fillPoints(pts.map(([x, y]) => ({ x, y })), true);
const ln = (p, x1, y1, x2, y2, w = 3) => p.lineStyle(w, 0).lineBetween(x1, y1, x2, y2);
// tiny details (seeds, chips, eyes) get a thinner outline
const tiny = (p, fn) => { const w = p.weight; p.weight = 1.8; fn(); p.weight = w; };
const dots = (p, pts, col, rad = 3) => tiny(p, () => pts.forEach(([x, y]) => c(p, x, y, rad, col)));
const eyes = (p, x1, x2, y, rad = 3.4) => tiny(p, () => { c(p, x1, y, rad, 0x2a1f24); c(p, x2, y, rad, 0x2a1f24); });

const RED = 0xe0453d, ORANGE = 0xf0902f, YELLOW = 0xf7d24a, GREEN = 0x69b653, DKGREEN = 0x4a9548, BROWN = 0x9a6238, TAN = 0xe3b878, CREAM = 0xf8ecd0, WHITE = 0xfbf7ee, PINK = 0xf59ab4, BLUE = 0x6aaee8, PURPLE = 0x9b7fd1, GREY = 0xb0b8c4, DKGREY = 0x6b7482, CHOC = 0x6b4226;

// A plate under a dish.
const plate = (p, y = 98) => { e(p, 64, y, 46, 14, WHITE); e(p, 64, y - 2, 34, 9, 0xe9e2d2); };
// A round-bellied animal plush: used by the premium toys. opts = { body, belly, ears, snout, extra }
function plush(p, o) {
  e(p, 64, 92, 30, 26, o.body);                                    // tummy
  e(p, 64, 98, 18, 15, o.belly || CREAM);
  e(p, 36, 100, 11, 9, o.body); e(p, 92, 100, 11, 9, o.body);       // feet
  e(p, 36, 84, 9, 14, o.body); e(p, 92, 84, 9, 14, o.body);          // arms
  if (o.ears) o.ears(p);
  e(p, 64, 50, 32, 28, o.body);                                    // head
  if (o.extra) o.extra(p);
  e(p, 64, 60, 15, 11, o.belly || CREAM);                          // muzzle
  eyes(p, 51, 77, 46);
  tiny(p, () => e(p, 64, 56, 5, 3.4, o.nose || 0x2a1f24));
}

// Shared with data/spriteart.js (pets, bin, icons): the same helpers and palette.
export const H = { e, c, r, t, poly, ln, tiny, dots, eyes, plate, COLORS: { RED, ORANGE, YELLOW, GREEN, DKGREEN, BROWN, TAN, CREAM, WHITE, PINK, BLUE, PURPLE, GREY, DKGREY, CHOC } };

export const ITEM_ART = {
  // ---- fruit and veg ----
  apple: p => { e(p, 64, 72, 36, 36, RED); e(p, 50, 62, 8, 6, 0xf27a6e); ln(p, 64, 38, 66, 24, 4); tiny(p, () => e(p, 80, 28, 14, 7, GREEN)); },
  banana: p => { poly(p, [[20, 46], [34, 74], [60, 96], [92, 98], [106, 82], [100, 76], [84, 82], [62, 76], [42, 56], [30, 36]], YELLOW); r(p, 14, 28, 12, 14, BROWN, 3); tiny(p, () => ln(p, 40, 62, 62, 84, 2)); },
  cookie: p => { e(p, 64, 74, 42, 40, TAN); dots(p, [[48, 60], [74, 58], [58, 82], [84, 80], [66, 96], [44, 84]], CHOC, 5); },
  pizza: p => { poly(p, [[18, 36], [112, 34], [66, 112]], 0xf3c76a); poly(p, [[18, 36], [112, 34], [110, 46], [20, 48]], 0xd9923a); c(p, 52, 58, 9, RED); c(p, 80, 56, 9, RED); c(p, 66, 82, 9, RED); dots(p, [[66, 62], [92, 70]], DKGREEN, 4); },
  donut: p => { e(p, 64, 74, 44, 38, 0xe6a45e); e(p, 64, 68, 40, 32, PINK); e(p, 64, 70, 13, 10, 0xf7efe0); dots(p, [[38, 62], [54, 50], [78, 48], [92, 62], [86, 84], [44, 82]], YELLOW, 3); },
  melon: p => { poly(p, [[14, 56], [114, 56], [100, 100], [64, 112], [28, 100]], DKGREEN); poly(p, [[22, 58], [106, 58], [94, 92], [64, 102], [34, 92]], RED); dots(p, [[44, 72], [64, 80], [84, 72], [56, 90], [76, 90]], 0x2a1f24, 3); },
  carrot: p => { t(p, 44, 40, 86, 52, 30, 110, ORANGE); tiny(p, () => { ln(p, 52, 46, 62, 50, 2); ln(p, 44, 70, 56, 74, 2); }); poly(p, [[78, 40], [92, 14], [84, 38], [106, 22], [88, 46]], GREEN); },
  cupcake: p => { poly(p, [[30, 62], [98, 62], [86, 112], [42, 112]], PURPLE); tiny(p, () => { ln(p, 52, 66, 50, 108, 2); ln(p, 64, 66, 64, 110, 2); ln(p, 78, 66, 80, 108, 2); }); e(p, 64, 56, 38, 22, PINK); e(p, 64, 36, 26, 16, PINK); c(p, 64, 22, 8, RED); },
  burger: p => { poly(p, [[18, 54], [30, 30], [64, 20], [98, 30], [110, 54]], 0xe3a554); r(p, 14, 54, 100, 12, GREEN, 6); r(p, 18, 66, 92, 14, CHOC, 6); poly(p, [[16, 82], [112, 82], [100, 98], [28, 98]], YELLOW); r(p, 20, 94, 88, 16, 0xe3a554, 8); dots(p, [[48, 36], [68, 30], [84, 40]], CREAM, 3); },
  taco: p => { poly(p, [[14, 92], [24, 52], [64, 36], [104, 52], [114, 92]], YELLOW); poly(p, [[26, 58], [40, 42], [52, 54], [62, 40], [78, 54], [92, 44], [102, 60]], GREEN); poly(p, [[22, 94], [28, 66], [100, 66], [106, 94], [64, 104]], 0xf0c24d); dots(p, [[48, 70], [76, 72]], RED, 5); },
  icecream: p => { t(p, 36, 62, 92, 62, 64, 116, TAN); tiny(p, () => { ln(p, 46, 68, 62, 104, 2); ln(p, 82, 68, 66, 104, 2); }); e(p, 64, 54, 32, 22, PINK); e(p, 64, 36, 24, 18, CREAM); c(p, 64, 20, 6, RED); },
  grapes: p => { for (const [x, y] of [[44, 56], [66, 54], [88, 58], [52, 78], [76, 78], [64, 98]]) c(p, x, y, 15, PURPLE); ln(p, 66, 40, 70, 26, 4); tiny(p, () => e(p, 84, 28, 13, 7, GREEN)); },
  lemon: p => { poly(p, [[14, 72], [28, 52], [64, 44], [100, 52], [114, 72], [100, 94], [64, 100], [28, 92]], YELLOW); tiny(p, () => { e(p, 20, 72, 5, 4, YELLOW); e(p, 108, 72, 5, 4, YELLOW); e(p, 86, 36, 12, 6, GREEN); }); },
  pepper: p => { poly(p, [[46, 40], [86, 44], [92, 74], [70, 108], [52, 112], [64, 80]], RED); r(p, 40, 28, 40, 16, GREEN, 6); },
  berry: p => { poly(p, [[22, 46], [64, 38], [106, 46], [90, 88], [64, 112], [38, 88]], RED); dots(p, [[48, 60], [74, 58], [62, 76], [84, 74], [50, 82], [64, 94]], YELLOW, 2.6); poly(p, [[44, 40], [54, 28], [64, 38], [74, 26], [84, 40], [64, 46]], GREEN); },
  broccoli: p => { r(p, 52, 72, 24, 40, 0x9bcf6a, 8); for (const [x, y, rad] of [[40, 54, 20], [64, 40, 24], [90, 54, 20], [52, 70, 16], [78, 70, 16]]) c(p, x, y, rad, DKGREEN); },
  // ---- ingredients ----
  flour: p => { poly(p, [[26, 40], [102, 40], [112, 106], [16, 106]], CREAM); r(p, 36, 28, 56, 18, TAN, 6); e(p, 64, 74, 18, 14, 0xe3d3a8); tiny(p, () => ln(p, 54, 74, 74, 74, 2)); },
  tomato: p => { e(p, 64, 74, 40, 34, RED); poly(p, [[40, 42], [54, 38], [64, 30], [74, 38], [90, 42], [76, 50], [52, 50]], GREEN); },
  potato: p => { poly(p, [[18, 70], [36, 44], [76, 38], [104, 58], [108, 88], [76, 106], [36, 100]], 0xc79a62); dots(p, [[44, 64], [78, 56], [86, 84], [56, 88]], 0x8a6238, 3); },
  corn: p => { poly(p, [[44, 20], [76, 20], [84, 60], [76, 108], [44, 108], [34, 60]], YELLOW); dots(p, [[52, 36], [66, 36], [52, 56], [66, 56], [52, 76], [66, 76], [52, 94], [66, 94]], 0xe3a82f, 4); poly(p, [[40, 108], [14, 62], [38, 82]], GREEN); poly(p, [[80, 108], [110, 62], [86, 82]], GREEN); },
  meat: p => { poly(p, [[18, 66], [34, 40], [74, 34], [108, 54], [106, 88], [74, 108], [36, 100]], 0xd4584f); poly(p, [[38, 66], [56, 52], [86, 58], [88, 82], [64, 92], [44, 86]], 0xe98a80); c(p, 82, 66, 8, CREAM); },
  rice: p => { poly(p, [[18, 62], [110, 62], [96, 108], [32, 108]], BLUE); e(p, 64, 62, 46, 14, BLUE); e(p, 64, 54, 38, 20, WHITE); dots(p, [[48, 50], [64, 44], [80, 50], [58, 58], [74, 58]], 0xe6dfc9, 2.6); },
  fish: p => { poly(p, [[16, 66], [38, 46], [76, 42], [96, 66], [76, 90], [38, 86]], BLUE); poly(p, [[92, 66], [114, 42], [110, 66], [114, 90]], 0x4f8fcf); c(p, 36, 62, 4, 0x2a1f24); poly(p, [[52, 46], [62, 30], [72, 44]], 0x4f8fcf); tiny(p, () => ln(p, 52, 60, 52, 74, 2)); },
  chocolate: p => { r(p, 26, 28, 76, 88, CHOC, 6); tiny(p, () => { ln(p, 26, 58, 102, 58, 2); ln(p, 26, 88, 102, 88, 2); ln(p, 64, 28, 64, 116, 2); }); poly(p, [[26, 28], [102, 28], [102, 44], [26, 52]], 0xd9d2c0); },
  // ---- dishes ----
  fries: p => { for (const [x, y, a] of [[40, 22, 0], [54, 14, 1], [68, 18, 0], [82, 12, 1], [94, 24, 0]]) r(p, x, y, 10, 56, YELLOW, 3); poly(p, [[26, 54], [102, 54], [92, 112], [36, 112]], RED); e(p, 64, 80, 16, 14, YELLOW); },
  popcorn: p => { for (const [x, y] of [[40, 34], [60, 24], [82, 30], [98, 42], [50, 46], [74, 44]]) c(p, x, y, 14, CREAM); poly(p, [[28, 52], [100, 52], [92, 112], [36, 112]], RED); for (const x of [48, 66, 84]) tiny(p, () => ln(p, x, 54, x - 2, 110, 6)); },
  pancakes: p => { e(p, 64, 98, 42, 12, TAN); e(p, 64, 84, 40, 12, 0xe8b46a); e(p, 64, 70, 38, 12, TAN); e(p, 64, 56, 36, 12, 0xe8b46a); r(p, 54, 44, 22, 12, YELLOW, 4); poly(p, [[40, 52], [88, 52], [92, 62], [84, 70], [76, 62], [52, 62], [44, 68], [38, 60]], 0xa86a32); },
  spaghetti: p => { plate(p, 100); e(p, 64, 84, 32, 20, 0xf2d48a); e(p, 64, 74, 24, 14, 0xf6df9f); e(p, 64, 68, 14, 8, RED); c(p, 64, 62, 5, DKGREEN); tiny(p, () => { ln(p, 44, 80, 70, 70, 2); ln(p, 56, 90, 84, 78, 2); ln(p, 50, 72, 78, 84, 2); }); },
  ramen: p => { poly(p, [[16, 60], [112, 60], [98, 108], [30, 108]], RED); e(p, 64, 60, 48, 15, RED); e(p, 64, 58, 42, 11, 0xe9b455); tiny(p, () => { ln(p, 34, 56, 54, 64, 2); ln(p, 50, 52, 76, 62, 2); ln(p, 70, 54, 92, 60, 2); }); e(p, 82, 54, 11, 8, WHITE); c(p, 82, 54, 4, YELLOW); ln(p, 36, 28, 82, 52, 4); ln(p, 46, 26, 92, 48, 4); },
  curry: p => { plate(p, 100); e(p, 50, 82, 24, 18, WHITE); e(p, 80, 84, 26, 18, 0xc9822f); dots(p, [[76, 78], [88, 86], [72, 90]], ORANGE, 5); dots(p, [[44, 76], [56, 84]], 0xe6dfc9, 3); },
  salad: p => { poly(p, [[16, 60], [112, 60], [96, 104], [32, 104]], WHITE); e(p, 64, 60, 48, 13, WHITE); for (const [x, y, col] of [[44, 50, GREEN], [66, 42, DKGREEN], [86, 50, GREEN], [56, 56, RED], [78, 58, ORANGE]]) c(p, x, y, 13, col); },
  cocoa: p => { r(p, 26, 46, 62, 62, 0xd8d0e8, 14); e(p, 57, 46, 31, 10, CHOC); poly(p, [[86, 58], [108, 58], [108, 84], [86, 88], [92, 80], [92, 66]], 0xd8d0e8); tiny(p, () => { ln(p, 46, 34, 52, 18, 3); ln(p, 66, 32, 62, 16, 3); }); },
  sushi: p => { e(p, 64, 98, 44, 12, TAN); e(p, 64, 72, 36, 26, WHITE); e(p, 64, 62, 34, 20, 0xf48a6e); tiny(p, () => { ln(p, 44, 60, 84, 60, 2); ln(p, 50, 52, 80, 70, 2); }); r(p, 56, 56, 16, 40, 0x2f4a3a, 5); },
  surprise: p => { poly(p, [[22, 60], [106, 60], [96, 108], [32, 108]], PURPLE); e(p, 64, 60, 44, 12, PURPLE); poly(p, [[28, 54], [100, 54], [88, 40], [40, 40]], 0xc9b6ec); c(p, 64, 36, 7, YELLOW); r(p, 16, 70, 12, 10, DKGREY, 3); r(p, 100, 70, 12, 10, DKGREY, 3); tiny(p, () => { ln(p, 56, 86, 56, 94, 3); ln(p, 64, 78, 64, 94, 3); ln(p, 72, 86, 72, 94, 3); }); },
  egg: p => { e(p, 64, 72, 30, 40, WHITE); e(p, 54, 58, 6, 8, 0xeee6d2); },
  cheese: p => { poly(p, [[14, 96], [114, 96], [104, 52], [34, 30]], YELLOW); poly(p, [[14, 96], [114, 96], [114, 108], [14, 108]], 0xe3b53a); dots(p, [[48, 78], [76, 70], [92, 86], [62, 58]], 0xe3b53a, 7); },
  milk: p => { poly(p, [[34, 24], [94, 24], [86, 112], [42, 112]], 0xe9f2f6); poly(p, [[37, 52], [91, 52], [86, 112], [42, 112]], WHITE); e(p, 64, 24, 30, 6, 0xdfeaf0); },
  pie: p => { poly(p, [[14, 74], [114, 74], [100, 108], [28, 108]], 0xd9923a); e(p, 64, 72, 50, 22, TAN); e(p, 64, 70, 38, 14, 0xe9b568); tiny(p, () => { ln(p, 44, 62, 84, 78, 3); ln(p, 84, 62, 44, 78, 3); ln(p, 64, 58, 64, 82, 3); }); },
  bread: p => { poly(p, [[16, 74], [24, 46], [64, 34], [104, 46], [112, 74], [104, 108], [24, 108]], 0xd9923a); tiny(p, () => { ln(p, 44, 54, 52, 72, 3); ln(p, 64, 50, 72, 70, 3); ln(p, 84, 56, 92, 74, 3); }); },
  stew: p => { poly(p, [[20, 56], [108, 56], [98, 108], [30, 108]], DKGREY); e(p, 64, 56, 44, 13, DKGREY); e(p, 64, 54, 38, 9, 0xb0703a); r(p, 8, 62, 18, 8, DKGREY, 4); r(p, 102, 62, 18, 8, DKGREY, 4); dots(p, [[50, 54], [66, 52], [80, 55]], ORANGE, 4); tiny(p, () => { ln(p, 52, 40, 56, 24, 3); ln(p, 76, 38, 72, 22, 3); }); },
  jam: p => { r(p, 30, 46, 68, 66, RED, 16); r(p, 26, 34, 76, 18, 0xe9e2d0, 6); r(p, 40, 62, 48, 32, CREAM, 6); tiny(p, () => c(p, 64, 78, 8, RED)); },
  friedegg: p => { e(p, 52, 100, 16, 8, DKGREY); poly(p, [[16, 70], [34, 46], [76, 42], [100, 60], [96, 90], [58, 100], [26, 94]], WHITE); c(p, 56, 70, 18, YELLOW); r(p, 92, 82, 28, 10, DKGREY, 5); },
  sandwich: p => { poly(p, [[14, 96], [110, 96], [62, 28]], 0xe3a554); poly(p, [[26, 82], [98, 82], [86, 64], [40, 64]], GREEN); poly(p, [[34, 74], [92, 74], [84, 62], [44, 62]], RED); poly(p, [[22, 92], [102, 92], [108, 100], [16, 100]], YELLOW); },
  cake: p => { poly(p, [[16, 60], [112, 60], [112, 108], [16, 108]], 0xf3d9a6); poly(p, [[16, 60], [112, 60], [112, 74], [100, 70], [90, 78], [76, 70], [60, 78], [44, 70], [30, 78], [16, 72]], PINK); r(p, 16, 90, 96, 8, 0xe8b46a); c(p, 40, 52, 6, RED); c(p, 64, 50, 6, RED); c(p, 88, 52, 6, RED); },
  sundae: p => { poly(p, [[28, 56], [100, 56], [76, 92], [76, 104], [90, 112], [38, 112], [52, 104], [52, 92]], 0xe9f2f6); e(p, 50, 50, 22, 18, CREAM); e(p, 78, 50, 22, 18, PINK); e(p, 64, 38, 20, 16, 0xc9a06a); poly(p, [[44, 52], [84, 52], [76, 66], [52, 66]], CHOC); c(p, 64, 22, 6, RED); },
  // ---- toys ----
  teddy: p => plush(p, { body: 0xb98657, belly: 0xe8c99a, ears: q => { c(q, 42, 28, 11, 0xb98657); c(q, 86, 28, 11, 0xb98657); }, extra: q => { poly(q, [[54, 80], [64, 74], [74, 80], [74, 90], [64, 84], [54, 90]], RED); } }),
  ball: p => { c(p, 64, 66, 46, WHITE); poly(p, [[64, 36], [88, 52], [80, 80], [48, 80], [40, 52]], 0x2f3340); tiny(p, () => { ln(p, 64, 36, 64, 22, 3); ln(p, 88, 52, 104, 46, 3); ln(p, 80, 80, 92, 98, 3); ln(p, 48, 80, 36, 98, 3); ln(p, 40, 52, 24, 46, 3); }); },
  car: p => { poly(p, [[10, 88], [10, 68], [32, 62], [48, 42], [84, 42], [100, 62], [120, 68], [120, 88]], RED); poly(p, [[52, 48], [80, 48], [92, 62], [42, 62]], 0xb9e0f2); c(p, 36, 94, 14, 0x2f3340); c(p, 94, 94, 14, 0x2f3340); tiny(p, () => { c(p, 36, 94, 6, GREY); c(p, 94, 94, 6, GREY); c(p, 112, 76, 4, YELLOW); }); },
  balloon: p => { e(p, 64, 46, 34, 40, RED); t(p, 56, 84, 72, 84, 64, 94, RED); tiny(p, () => { ln(p, 64, 94, 56, 104, 2); ln(p, 56, 104, 70, 114, 2); }); },
  duck: p => { e(p, 62, 86, 40, 24, YELLOW); poly(p, [[96, 76], [118, 64], [110, 86]], YELLOW); e(p, 52, 46, 26, 26, YELLOW); poly(p, [[72, 44], [96, 50], [74, 58]], ORANGE); eyes(p, 54, 54, 40, 3.4); tiny(p, () => e(p, 58, 94, 14, 8, 0xf7e07a)); },
  guitar: p => { r(p, 58, 14, 14, 54, BROWN, 4); r(p, 52, 10, 26, 18, CHOC, 6); e(p, 64, 92, 32, 24, 0xd9923a); e(p, 64, 78, 24, 20, 0xd9923a); c(p, 64, 88, 10, CHOC); ln(p, 64, 28, 64, 108, 2); },
  rocket: p => { poly(p, [[64, 8], [88, 40], [90, 84], [38, 84], [40, 40]], WHITE); t(p, 40, 70, 18, 100, 40, 90, RED); t(p, 88, 70, 110, 100, 88, 90, RED); c(p, 64, 52, 11, BLUE); poly(p, [[52, 84], [76, 84], [64, 118]], ORANGE); t(p, 56, 84, 72, 84, 64, 104, YELLOW); },
  puzzle: p => { poly(p, [[22, 36], [54, 36], [54, 28], [64, 18], [74, 28], [74, 36], [106, 36], [106, 64], [114, 74], [106, 84], [106, 112], [22, 112]], GREEN); c(p, 22, 76, 11, 0x8fd06e); },
  robot: p => { ln(p, 64, 14, 64, 28, 4); c(p, 64, 14, 6, RED); r(p, 34, 28, 60, 40, GREY, 10); c(p, 50, 46, 8, WHITE); c(p, 78, 46, 8, WHITE); tiny(p, () => { c(p, 50, 46, 3, 0x2a1f24); c(p, 78, 46, 3, 0x2a1f24); }); r(p, 42, 70, 44, 38, BLUE, 8); r(p, 26, 72, 14, 30, GREY, 6); r(p, 88, 72, 14, 30, GREY, 6); r(p, 46, 106, 12, 10, DKGREY, 3); r(p, 70, 106, 12, 10, DKGREY, 3); dots(p, [[56, 82], [72, 82]], RED, 4); },
  kite: p => { poly(p, [[64, 10], [100, 48], [64, 92], [28, 48]], PINK); poly(p, [[64, 10], [100, 48], [64, 48]], YELLOW); poly(p, [[28, 48], [64, 92], [64, 48]], BLUE); tiny(p, () => { ln(p, 64, 92, 56, 104, 2); ln(p, 56, 104, 72, 112, 2); c(p, 56, 104, 5, RED); c(p, 72, 112, 5, GREEN); }); },
  dog: p => plush(p, { body: 0xd9a86a, belly: CREAM, ears: q => { e(q, 36, 44, 10, 20, 0x8a5a32); e(q, 92, 44, 10, 20, 0x8a5a32); } }),
  cat: p => plush(p, { body: 0xf0902f, belly: CREAM, ears: q => { t(q, 36, 40, 44, 14, 56, 36, 0xf0902f); t(q, 92, 40, 84, 14, 72, 36, 0xf0902f); }, extra: q => { tiny(q, () => { ln(q, 40, 56, 52, 58, 2); ln(q, 88, 56, 76, 58, 2); }); } }),
  panda: p => plush(p, { body: WHITE, belly: WHITE, ears: q => { c(q, 40, 26, 11, 0x2f3340); c(q, 88, 26, 11, 0x2f3340); }, extra: q => { e(q, 49, 48, 9, 12, 0x2f3340); e(q, 79, 48, 9, 12, 0x2f3340); } }),
  frog: p => plush(p, { body: GREEN, belly: 0xc8e6a0, ears: q => { c(q, 44, 28, 12, GREEN); c(q, 84, 28, 12, GREEN); }, extra: q => { c(q, 44, 28, 7, WHITE); c(q, 84, 28, 7, WHITE); tiny(q, () => { c(q, 44, 28, 3, 0x2a1f24); c(q, 84, 28, 3, 0x2a1f24); }); }, nose: DKGREEN }),
  unicorn: p => plush(p, { body: WHITE, belly: 0xfde0ee, ears: q => { poly(q, [[58, 30], [64, 4], [70, 30]], YELLOW); e(q, 40, 34, 8, 12, WHITE); e(q, 88, 34, 8, 12, WHITE); }, extra: q => { poly(q, [[34, 40], [28, 62], [40, 56]], PINK); poly(q, [[94, 40], [100, 62], [88, 56]], PURPLE); } }),
  dino: p => plush(p, { body: 0x7cc76a, belly: 0xe9e7a0, ears: q => { t(q, 52, 26, 58, 10, 64, 26, 0xf0902f); t(q, 64, 26, 70, 8, 76, 26, 0xf0902f); }, extra: q => { dots(q, [[48, 40], [78, 38]], 0x5aa84a, 3); } }),
  fox: p => plush(p, { body: 0xe8782f, belly: WHITE, ears: q => { t(q, 34, 40, 38, 8, 58, 30, 0xe8782f); t(q, 94, 40, 90, 8, 70, 30, 0xe8782f); }, extra: q => { poly(q, [[32, 60], [64, 70], [96, 60], [96, 52], [64, 62], [32, 52]], WHITE); } }),
  rabbit: p => plush(p, { body: 0xf0e6dc, belly: WHITE, ears: q => { e(q, 48, 22, 8, 22, 0xf0e6dc); e(q, 80, 22, 8, 22, 0xf0e6dc); tiny(q, () => { e(q, 48, 24, 3.4, 14, PINK); e(q, 80, 24, 3.4, 14, PINK); }); }, nose: PINK }),
  elephant: p => plush(p, { body: 0xa7b3c8, belly: 0xc5cfe0, ears: q => { e(q, 30, 50, 16, 20, 0xa7b3c8); e(q, 98, 50, 16, 20, 0xa7b3c8); }, extra: q => { poly(q, [[56, 58], [72, 58], [74, 92], [66, 98], [58, 92]], 0xa7b3c8); } }),
  crystal: p => { e(p, 64, 112, 34, 8, 0x6b7482); r(p, 38, 96, 52, 14, 0x6b7482, 6); c(p, 64, 62, 38, PURPLE); poly(p, [[44, 44], [52, 34], [58, 42], [50, 52]], 0xd9c9ff); tiny(p, () => { ln(p, 78, 70, 88, 62, 2); ln(p, 60, 80, 78, 82, 2); }); },
  // ---- hats ----
  gradcap: p => { poly(p, [[10, 56], [64, 34], [118, 56], [64, 78]], 0x2f3340); poly(p, [[36, 66], [92, 66], [92, 94], [64, 104], [36, 94]], 0x424858); ln(p, 64, 56, 110, 62, 3); ln(p, 110, 62, 108, 86, 3); c(p, 108, 90, 6, YELLOW); },
  sunhat: p => { e(p, 64, 82, 58, 20, TAN); poly(p, [[34, 82], [38, 44], [64, 32], [90, 44], [94, 82]], TAN); poly(p, [[34, 76], [94, 76], [94, 62], [34, 62]], PINK); },
  helmet: p => { poly(p, [[16, 92], [20, 56], [42, 32], [64, 26], [86, 32], [108, 56], [112, 92]], YELLOW); r(p, 12, 88, 104, 16, 0xe3b53a, 8); r(p, 56, 26, 16, 62, 0xe3b53a, 4); },
  cap: p => { poly(p, [[22, 92], [26, 58], [48, 36], [76, 36], [100, 58], [104, 92]], BLUE); poly(p, [[22, 92], [104, 92], [124, 100], [100, 108], [32, 104]], 0x4a8fd8); c(p, 64, 40, 6, 0x4a8fd8); ln(p, 64, 40, 64, 90, 2); },
  tophat: p => { r(p, 36, 18, 56, 70, 0x2f3340, 6); r(p, 36, 66, 56, 14, RED, 3); e(p, 64, 90, 56, 12, 0x2f3340); },
  crown: p => { poly(p, [[18, 98], [12, 42], [40, 66], [64, 28], [88, 66], [116, 42], [110, 98]], YELLOW); r(p, 18, 90, 92, 14, 0xe3b53a, 5); c(p, 64, 78, 7, RED); c(p, 36, 82, 5, BLUE); c(p, 92, 82, 5, GREEN); },
  bow: p => { poly(p, [[62, 62], [14, 32], [10, 92], [62, 66]], PINK); poly(p, [[66, 62], [114, 32], [118, 92], [66, 66]], PINK); c(p, 64, 64, 14, 0xe0698e); },
  // ---- glasses ----
  goggles: p => { r(p, 6, 52, 116, 14, 0x6b4a8a, 6); c(p, 38, 66, 28, 0x6aaee8); c(p, 90, 66, 28, 0x6aaee8); tiny(p, () => { e(p, 30, 56, 7, 4, 0xd0ecff); e(p, 82, 56, 7, 4, 0xd0ecff); }); },
  shades: p => { r(p, 8, 58, 112, 10, 0x2f3340, 4); poly(p, [[14, 58], [58, 58], [54, 90], [20, 90]], 0x2f3340); poly(p, [[70, 58], [114, 58], [108, 90], [74, 90]], 0x2f3340); },
  specs: p => { c(p, 36, 70, 24, WHITE); c(p, 92, 70, 24, WHITE); c(p, 36, 70, 18, 0xcfeaf6); c(p, 92, 70, 18, 0xcfeaf6); r(p, 56, 62, 16, 8, 0x6b4a3a, 3); ln(p, 12, 66, 2, 56, 4); ln(p, 116, 66, 126, 56, 4); },
  // ---- shoes (a pair) ----
  heels: p => { for (const x of [34, 88]) { poly(p, [[x - 18, 64], [x + 4, 50], [x + 12, 76], [x + 22, 92], [x + 18, 100], [x - 18, 98]], RED); r(p, x + 8, 96, 8, 18, DKGREY, 3); } },
  dressshoes: p => { for (const x of [30, 86]) { poly(p, [[x - 18, 60], [x + 6, 60], [x + 12, 76], [x + 30, 82], [x + 30, 100], [x - 18, 100]], 0x4a2f22); r(p, x - 18, 98, 50, 10, CHOC, 4); tiny(p, () => ln(p, x - 4, 66, x + 6, 74, 2)); } },
  sneakers: p => { for (const x of [28, 84]) { poly(p, [[x - 14, 56], [x + 8, 54], [x + 14, 74], [x + 34, 84], [x + 34, 102], [x - 14, 102]], BLUE); r(p, x - 16, 98, 54, 12, WHITE, 5); tiny(p, () => { ln(p, x, 66, x + 12, 70, 2); ln(p, x - 2, 74, x + 14, 78, 2); }); poly(p, [[x + 14, 84], [x + 34, 86], [x + 34, 100], [x + 14, 100]], 0x8cc4f4); } },
  boots: p => { for (const x of [34, 90]) { poly(p, [[x - 16, 30], [x + 12, 30], [x + 12, 76], [x + 34, 84], [x + 34, 104], [x - 16, 104]], 0x9a6238); r(p, x - 18, 100, 54, 12, CHOC, 5); r(p, x - 18, 30, 34, 12, 0xc99466, 4); tiny(p, () => { ln(p, x - 6, 54, x + 8, 54, 2); ln(p, x - 6, 66, x + 8, 66, 2); }); } },
};

// Items that are drawn higher in their box than where they should stand (flat wearables, the fish): moved down so
// every item rests on the same ground line.
export const ITEM_SHIFT = { fish: 26, bow: 24, goggles: 22, shades: 28, specs: 22 };

// Drawing an item onto an InkPen (the caller has translated/cleared as needed). Unknown keys draw a question blob.
export function drawItem(pen, key) {
  const dy = ITEM_SHIFT[key] || 0;
  if (dy) pen.save().translateCanvas(0, dy);
  (ITEM_ART[key] || (q => { e(q, 64, 70, 36, 36, GREY); }))(pen);
  if (dy) pen.restore();
}
