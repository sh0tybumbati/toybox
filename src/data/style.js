// The house art style (chosen from the style board, styleboard/riffs.html): "Soft Flat" with
// TONAL LINES — flat fills, no highlights, every shape edged in a darker shade of its own
// colour — plus hard-edged SUNBEAMS from windows as the only light effect. Pure helpers.
export const TONE = 0.78;               // how much darker an outline is than its fill

// Multiply a 0xRRGGBB colour's brightness (k<1 darkens, k>1 lightens).
export function shade(color, k) {
  const ch = s => Math.max(0, Math.min(255, Math.round(((color >> s) & 255) * k)));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

// The outline colour for a fill: the same hue, darker.
export const tonal = (fill, k = TONE) => shade(fill, k);

// Fill a rounded rect/ellipse/etc. in `fill` and edge it in its tonal line: `draw(g)` runs between
// the fill and stroke styles, e.g. outlined(g, 0xffe8b0, 3, g => g.fillRoundedRect(...), g => g.strokeRoundedRect(...)).
export function outlined(g, fill, width, fillFn, strokeFn) {
  g.fillStyle(fill, 1); fillFn(g);
  g.lineStyle(width, tonal(fill), 1); strokeFn(g);
}

// A window's sunbeam: a pale hard-edged shape slanting down-right from the window across the wall
// and onto the floor. Returns polygons (arrays of {x,y}) clipped to a room `w` wide, wall first.
// `wallH` is where the wall meets the floor, `h` the room height.
export function sunbeamShapes(win, w, wallH, h, slant = 190) {
  const clipX = x => Math.max(0, Math.min(w, x));
  const x0 = win.x + 8, x1 = win.x + win.w - 8, top = win.y + win.h - 4;
  const run = wallH - top, floorRun = 110;
  const wall = [{ x: x0, y: top }, { x: x1, y: top }, { x: x1 + slant, y: wallH }, { x: x0 + slant, y: wallH }].map(p => ({ x: clipX(p.x), y: p.y }));
  const floor = [{ x: x0 + slant, y: wallH }, { x: x1 + slant, y: wallH }, { x: x1 + slant + floorRun * (slant / run), y: h }, { x: x0 + slant + floorRun * (slant / run) + 60, y: h }].map(p => ({ x: clipX(p.x), y: p.y }));
  return [wall, floor];
}
export const SUNBEAM_ALPHA = 0.34;
