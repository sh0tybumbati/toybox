// Shared constants. Pure data — safe to import from tests (no Phaser here).

export const W = 960;                  // one screen
export const SECTION_W = 960;          // every room is one screen wide; a floor is several rooms side by side
export const H = 600;

// The floor is a band that the "ground contact" point of every object lives in.
export const FLOOR_TOP = 445;
export const FLOOR_BOTTOM = 580;
export const GRAVITY = 2200;
export const CHAR_SCALE = 0.64;       // how big people are in the room (the creator shows them full size)

export const SHELF_W = 300;
export const SHELF_STEP = 75;
export const MAX_FLOOR_ITEMS = 20;      // oldest floor clutter fades away beyond this

// Trash bin: anything that lands on the floor inside this footprint is binned.
export const BIN = { x: 880, lane: 565, minLane: 500, halfW: 46 };

export const SAVE_VERSION = 13;

// Text defaults to this stack so emoji look the same everywhere (index.html loads the font).
export const FONT = '"Patrick Hand", "Comic Sans MS", "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", cursive';

// The rounded face for the UI kit's buttons, chips and meters (Patrick Hand stays for titles and speech).
export const UI_FONT = '"Fredoka", "Patrick Hand", "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';

// The HUD (top bar, player card, clock) is drawn at this fraction of its design size, anchored to its corner.
export const HUD_SCALE = 0.6;
