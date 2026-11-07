// Item art -> textures. Each item is drawn once (data/itemart.js, through the ink pen) into a 256px texture
// at 2x resolution, then reused by every copy of the item, by the oven's ingredient list and by the recipe book.
import { ART_BOX, drawItem } from '../data/itemart.js';
import { LINE } from '../data/ink.js';
import { CATALOG } from '../data/items.js';
import { InkPen } from '../data/inkpen.js';
import { SPRITE_ART } from '../data/spriteart.js';

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
  const size = (CATALOG[key.replace(/_open$/, '')] || {}).size || 72;                    // the art is shown at `size` px: the pen is heavier so lines come out LINE wide
  drawItem(new InkPen(g, seedOf(key), { weight: LINE * ART_BOX / size }), key);
  g.generateTexture(tk, TEX_SIZE, TEX_SIZE);
  g.destroy();
  return tk;
}

// A small picture of an item for menus (the oven's ingredient bubble, the recipe book): `px` wide.
export function itemIcon(scene, key, x, y, px = 36) {
  return scene.add.image(x, y, ensureItemTexture(scene, key)).setDisplaySize(px, px);
}

// --- sprites that aren't items (pets, the bin, coins, reaction faces, icons): data/spriteart.js -------------
export const spriteTextureKey = key => `sprite:${key}`;
export function ensureSpriteTexture(scene, key) {
  const tk = spriteTextureKey(key), art = SPRITE_ART[key];
  if (scene.textures.exists(tk)) return tk;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.scaleCanvas(TEX_RES, TEX_RES);
  art.draw(new InkPen(g, seedOf(key), { weight: art.weight }));
  g.generateTexture(tk, art.box * TEX_RES, art.box * TEX_RES);
  g.destroy();
  return tk;
}

// An icon by key: a sprite ('icon-map') or an item's drawing ('item:apple'), `px` wide and tall.
export function iconImage(scene, key, x, y, px) {
  const tex = key.startsWith('item:') ? ensureItemTexture(scene, key.slice(5)) : ensureSpriteTexture(scene, key);
  return scene.add.image(x, y, tex).setDisplaySize(px, px);
}

// A sprite as an image, `px` wide and tall (the drawing's whole box).
export function spriteImage(scene, key, x, y, px) {
  return scene.add.image(x, y, ensureSpriteTexture(scene, key)).setDisplaySize(px, px);
}
