// Item art -> textures. Each item is drawn once (data/itemart.js, through the ink pen) into a 256px texture
// at 2x resolution, then reused by every copy of the item, by the oven's ingredient list and by the recipe book.
import { ART_BOX, drawItem } from '../data/itemart.js';
import { InkPen } from '../data/inkpen.js';

export const TEX_RES = 2;
export const TEX_SIZE = ART_BOX * TEX_RES;
export const itemTextureKey = key => `item:${key}`;
const seedOf = key => [...key].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 11) % 900 + 1;

// The texture key for an item, drawing it first if it hasn't been yet.
export function ensureItemTexture(scene, key) {
  const tk = itemTextureKey(key);
  if (scene.textures.exists(tk)) return tk;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.scaleCanvas(TEX_RES, TEX_RES);
  drawItem(new InkPen(g, seedOf(key), { weight: 5.2 }), key);
  g.generateTexture(tk, TEX_SIZE, TEX_SIZE);
  g.destroy();
  return tk;
}

// A small picture of an item for menus (the oven's ingredient bubble, the recipe book): `px` wide.
export function itemIcon(scene, key, x, y, px = 36) {
  return scene.add.image(x, y, ensureItemTexture(scene, key)).setDisplaySize(px, px);
}
