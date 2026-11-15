// The screen the game draws on. The logical height is always H (so a room always fits the window's height); the logical
// width follows the window's shape (view.w), within limits: a wide window shows more of the room, a narrow one crops its sides.
// Menus and minigames are laid out for W x H, so they are centred in it (viewOffset); the room extends its walls and floor.
import { W, H } from './config.js';

export const MIN_VIEW_W = 640, MAX_VIEW_W = 2560;
export const view = { w: W };

export const viewWidthFor = (cw, ch) => {
  const w = Math.round(H * (cw > 0 && ch > 0 ? cw / ch : W / H) / 2) * 2;
  return Math.max(MIN_VIEW_W, Math.min(MAX_VIEW_W, w));
};
// How far a W-wide layout sits from the left edge when it is centred (negative when the window is narrower than W).
export const viewOffset = () => (view.w - W) / 2;
// Extra wall and floor painted either side of a room so the widest window is covered.
export const EDGE_EXTRA = Math.ceil((MAX_VIEW_W - W) / 2);

// Match the canvas to the window; true when the width changed.
export function fitToWindow(game, cw = window.innerWidth, ch = window.innerHeight) {
  const w = viewWidthFor(cw, ch);
  if (w === view.w) return false;
  view.w = w;
  game.scale.setGameSize(w, H);
  return true;
}

// Scenes other than the room are laid out for W x H: keep them in the middle of the screen, and stretch their full-screen
// dim/backdrop rectangles across the sides.
export function centreOverlays(game) {
  const off = viewOffset();
  for (const scene of game.scene.getScenes(true)) {
    if (scene.scene.key === 'Room') continue;
    const cam = scene.cameras && scene.cameras.main;
    if (!cam) continue;
    cam.scrollX = -off;
    if (scene.sys.settings.status === Phaser.Scenes.RUNNING && scene.children.length && scene.wideFor !== view.w) {
      scene.wideFor = view.w;
      for (const o of scene.children.list) {
        if (o.type !== 'Rectangle' || o.x !== 0 || o.y !== 0 || o.width < W - 1 || o.height < H - 1 || o.originX !== 0 || o.scrollFactorX !== 1) continue;
        o.setSize(MAX_VIEW_W * 2, o.height); o.x = -MAX_VIEW_W / 2;
        if (o.input && o.input.hitArea) o.input.hitArea.setTo(0, 0, MAX_VIEW_W * 2, o.height);
      }
    }
  }
}
