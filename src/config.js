// Shared constants. Pure data — safe to import from tests (no Phaser here).

export const W = 960;
export const H = 600;

// The floor is a band that the "ground contact" point of every object lives in.
export const FLOOR_TOP = 445;
export const FLOOR_BOTTOM = 580;
export const GRAVITY = 2200;
export const FOOT = 145;                // character: origin -> feet, at scale 1

export const SHELF_W = 300;
export const SHELF_STEP = 75;
export const MAX_FLOOR_ITEMS = 20;      // oldest floor clutter fades away beyond this

// Trash bin: anything that lands on the floor inside this footprint is binned.
export const BIN = { x: 880, lane: 565, minLane: 500, halfW: 46 };

export const SAVE_VERSION = 8;

// Text defaults to this stack so emoji look the same everywhere (index.html loads the font).
export const FONT = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
