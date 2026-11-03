// Small UI helpers shared by the scenes.

// Make an object easy to hit with a finger: the hit area is the object plus `pad`
// pixels on every side. (Phaser hit areas are in the object's top-left local space.)
export function touchable(obj, pad = 10) {
  return obj.setInteractive({
    hitArea: new Phaser.Geom.Rectangle(-pad, -pad, obj.width + 2 * pad, obj.height + 2 * pad),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: true,
  });
}

// A round-ish icon button for overlays (✖ close buttons and the like).
export function iconButton(scene, x, y, glyph, onTap, depth = 10000) {
  const b = scene.add.text(x, y, glyph, { fontSize: '30px' }).setOrigin(0.5).setDepth(depth);
  return touchable(b, 12).on('pointerdown', onTap);
}
