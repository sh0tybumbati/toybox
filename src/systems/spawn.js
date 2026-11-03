import { FLOOR_TOP } from '../config.js';

// Pop a fresh item out in front of a prop, hopping from about `height` above the floor.
export function spawnFront(scene, key, prop, height = 90) {
  const between = Phaser.Math.Between;
  const item = scene.createItem(key, prop.x + between(-25, 25), FLOOR_TOP + 35);
  item.z = height;
  item.y -= height;
  item.vz = 300;
  item.vx = between(-120, 120);
  item.sq.x = item.sq.y = 0.01;
  scene.tweens.add({ targets: item.sq, x: 1, y: 1, duration: 300, ease: 'Back.easeOut' });
  scene.trimFloor();
  scene.dirty = true;
  return item;
}
