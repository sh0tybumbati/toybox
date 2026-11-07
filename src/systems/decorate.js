// Decorating rooms: the rules for windows (add / move / resize / remove) and for changing a room's look, as pure
// functions on plain data so they're tested. A room's look is { wall, floor, windows } (data/decor.js); a saved look
// stores only what the player changed, and `windows: null` means "the room type's own windows".
import { clamp } from '../util.js';

export const MAX_WINDOWS = 4;
export const WIN = { minW: 80, maxW: 300, minH: 80, maxH: 220, step: 20, move: 30, top: 24, maxTop: 250, margin: 16 };
export const newWindow = (x = 400) => ({ x, y: 70, w: 160, h: 130 });

const fit = (win, roomW) => {
  const w = clamp(Math.round(win.w), WIN.minW, WIN.maxW), h = clamp(Math.round(win.h), WIN.minH, WIN.maxH);
  return { x: clamp(Math.round(win.x), WIN.margin, Math.max(WIN.margin, roomW - w - WIN.margin)), y: clamp(Math.round(win.y), WIN.top, WIN.maxTop), w, h };
};

// A new window in the biggest gap along the wall (or null when the room already has MAX_WINDOWS).
export function addWindow(windows, roomW) {
  if (windows.length >= MAX_WINDOWS) return null;
  const spans = [...windows].sort((a, b) => a.x - b.x);
  let best = { at: WIN.margin, gap: 0 }, edge = WIN.margin;
  for (const w of [...spans, { x: roomW - WIN.margin, w: 0 }]) {
    const gap = w.x - edge;
    if (gap > best.gap) best = { at: edge, gap };
    edge = w.x + w.w;
  }
  const win = newWindow(best.at + Math.max(0, (best.gap - 160) / 2));
  return [...windows, fit(win, roomW)];
}

export function moveWindow(windows, i, dx, dy, roomW) {
  return windows.map((w, k) => (k === i ? fit({ ...w, x: w.x + dx, y: w.y + dy }, roomW) : w));
}

// Resize around the window's centre (so it grows both ways).
export function resizeWindow(windows, i, dw, dh, roomW) {
  return windows.map((w, k) => (k === i ? fit({ ...w, x: w.x - dw / 2, y: w.y - dh / 2, w: w.w + dw, h: w.h + dh }, roomW) : w));
}

export const removeWindow = (windows, i) => windows.filter((_, k) => k !== i);

// The looks table with `change` applied to room `id`. `base` = the room type's own look (so a saved look only
// keeps what differs: a wall/floor equal to the type's default is stored as null, unchanged windows as null).
export function withLook(looks, id, base, change) {
  const cur = looks[id] || {};
  const next = change({ wall: cur.wall || base.wall, floor: cur.floor || base.floor, windows: cur.windows || base.windows.map(w => ({ ...w })) });
  const same = JSON.stringify(next.windows) === JSON.stringify(base.windows);
  const out = { wall: next.wall === base.wall ? null : next.wall, floor: next.floor === base.floor ? null : next.floor, windows: same ? null : next.windows };
  const copy = { ...looks };
  if (!out.wall && !out.floor && !out.windows) delete copy[id]; else copy[id] = out;
  return copy;
}
