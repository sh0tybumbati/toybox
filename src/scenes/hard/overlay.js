// Shared bits of the hard-mode overlay scenes (settings, adult gate, PIN, setup, bank): a dim backdrop over the paused
// room, a hand-inked panel and a close button.
import { W, H } from '../../config.js';
import { TEXT, iconButton, inkPanel } from '../../ui.js';

export function backdrop(scene, w, h, title, { seed = 41, onClose } = {}) {
  scene.add.rectangle(0, 0, W, H, 0x000000, 0.62).setOrigin(0).setInteractive();
  inkPanel(scene, W / 2, H / 2, w, h, { seed });
  if (title) scene.add.text(W / 2, H / 2 - h / 2 + 38, title, { fontSize: '34px', fontStyle: 'bold', color: TEXT }).setOrigin(0.5);
  const close = onClose || (() => leave(scene));
  iconButton(scene, W / 2 + w / 2 - 36, H / 2 - h / 2 + 36, '✖', close, 100);
  scene.input.keyboard.on('keydown-ESC', close);
}

// Back to the room (it was paused under us).
export function leave(scene) {
  scene.scene.resume('Room');
  scene.scene.stop();
}

export const text = (scene, x, y, str, size = 22, extra = {}) => scene.add.text(x, y, str, { fontSize: `${size}px`, color: TEXT, ...extra });
