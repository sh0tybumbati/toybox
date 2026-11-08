// What happens when things meet: landing, eating, wearing, cuddling, binning.
// Plain functions taking the RoomScene, so the scene file stays about flow.
import { FLOOR_BOTTOM, BIN } from '../config.js';
import { SLOTS_FOR, SLOT_SFX, CATALOG } from '../data/items.js';
import { REACTIONS } from '../data/expressions.js';
import { findCombo } from '../data/recipes.js';
import { dropOnProps } from './props.js';
import { storeInFurniture } from './storage.js';
import { clamp } from '../util.js';
import { EMOJI_SPRITE } from '../data/spriteart.js';
import { iconImage } from './itemTextures.js';

// --- Small effects -----------------------------------------------------------

// Squash & stretch: tween obj.sq to (sx,sy), then wobble back to 1.
export function squashTo(scene, obj, sx, sy, dur = 90) {
  if (obj.sqTween) obj.sqTween.stop();
  obj.sqTween = scene.tweens.add({
    targets: obj.sq, x: sx, y: sy, duration: dur, ease: 'Quad.easeOut',
    onComplete: () => {
      obj.sqTween = scene.tweens.add({ targets: obj.sq, x: 1, y: 1, duration: 450, ease: 'Elastic.easeOut' });
    },
  });
}

// Little dust/crumb circles flying out from a point.
export function puff(scene, x, y, color = 0xffffff, n = 5) {
  for (let i = 0; i < n; i++) {
    const p = scene.add.circle(x, y, Phaser.Math.Between(3, 6), color, 0.7).setDepth(9000);
    scene.tweens.add({
      targets: p, alpha: 0, scale: 1.6,
      x: x + Phaser.Math.Between(-35, 35), y: y - Phaser.Math.Between(5, 30),
      duration: 400, ease: 'Quad.easeOut', onComplete: () => p.destroy(),
    });
  }
}

// Floating text. Emoji that have a hand-drawn sprite (data/spriteart.js EMOJI_SPRITE) become that sprite, so
// "+1 🪙" is the words and a drawn coin, and a lone "💖" is a drawn heart.
const TOKEN = new RegExp(`(${Object.keys(EMOJI_SPRITE).join('|')})`, 'u');
export function floatText(scene, x, y, str, size = 48) {
  const parts = String(str).split(TOKEN).map(s => (EMOJI_SPRITE[s] ? s : s.trim())).filter(Boolean);
  const wordy = size < 40, px = wordy ? size * 1.15 : size * 1.05, gap = 4, items = [];
  for (const part of parts) {
    items.push(EMOJI_SPRITE[part]
      ? iconImage(scene, EMOJI_SPRITE[part], 0, 0, px)
      : scene.add.text(0, 0, part, { fontSize: `${size}px`, ...(wordy && { fontStyle: 'bold', color: '#ffffff', stroke: '#4a3426', strokeThickness: 4 }) }).setOrigin(0.5));
  }
  const total = items.reduce((n, o) => n + o.displayWidth + gap, -gap);
  let at = -total / 2;
  for (const o of items) { o.setPosition(at + o.displayWidth / 2, 0); at += o.displayWidth + gap; }
  const row = scene.add.container(x, y, items).setDepth(9999);
  scene.tweens.add({ targets: row, y: y - 70, alpha: 0, duration: 900, onComplete: () => row.destroy() });
  return row;
}

// An object hit the floor with `impact` px/s of downward speed.
export function land(scene, obj, impact) {
  const k = clamp(impact / 1000, 0.08, 0.3);
  squashTo(scene, obj, 1 + k, 1 - k);
  scene.sfx.thud(clamp(impact / 900, 0.1, 1));
  if (impact > 350) puff(scene, obj.x, obj.lane, 0xe8d3b0, 4);
}

// --- Dropping an item --------------------------------------------------------

// Overlap check: an item counts as "in" a zone if its centre point lies inside
// the zone's world-space rectangle (Rectangle.contains). Characters are tried
// front-most first, so overlapping characters resolve the way they look.
export function handleDrop(scene, item) {
  if (item.kind === 'food') {                              // a pet nearby gets first dibs on the snack
    const pet = scene.petNear(item.x, item.lane, 55);
    if (pet) return scene.feedPet(pet, item);
  }
  const chars = [...scene.characters].sort((a, b) => b.depth - a.depth);
  for (const c of chars) {
    if (item.kind === 'food') {
      if (c.getZone('mouth').contains(item.x, item.y)) return eat(scene, item, c);
      if (scene.hard && c.getZone('body').contains(item.x, item.y) && scene.addToBag(c, item)) return;       // hard mode: into their bag
      continue;
    }
    // Wearable kinds: the first matching slot zone the item's centre is inside.
    for (const slot of SLOTS_FOR[item.kind] || []) {
      if (c.getZone(slot).contains(item.x, item.y)) return equip(scene, item, c, slot);
    }
    if (item.kind === 'toy' && c.getZone('body').contains(item.x, item.y)) return cuddle(scene, item, c);
  }
  if (scene.dropInContainer(item)) return;
  if (dropOnProps(scene, item)) return;
  if (storeInFurniture(scene, item)) return;
  if (tryCombo(scene, item)) return;
  // Otherwise: dropped on the background — gravity + throw velocity handle it.
}

// Is `other` a floor item that `item` could combine with?
export function comboPartner(scene, item, other) {
  return other instanceof item.constructor && other !== item && !other.dead && !other.worn
    && !other.onShelf && !other.held && !other.storedIn && findCombo(item.key, other.key)
    && Math.abs(other.lane - item.lane) < 45;
}

// Dropped on top of a compatible item (close enough in x/y and floor depth):
// both vanish and the result hops out between them.
function tryCombo(scene, item) {
  const other = scene.bodies.find(o => comboPartner(scene, item, o) && Math.hypot(o.x - item.x, o.y - item.y) < 55);
  if (!other) return false;
  const result = findCombo(item.key, other.key);
  const x = (item.x + other.x) / 2, lane = other.lane;
  scene.discard(item, { x, y: other.y, scale: 0, duration: 160 });
  scene.discard(other, { scale: 0, duration: 160 });
  scene.time.delayedCall(180, () => {
    const made = scene.createItem(result, x, lane);
    made.vz = 480;
    made.sq.x = made.sq.y = 0.01;
    scene.tweens.add({ targets: made.sq, x: 1, y: 1, duration: 300, ease: 'Back.easeOut' });
    scene.sfx.ding();
    puff(scene, x, lane - 30, 0xfff3a0, 6);
    floatText(scene, x, lane - 80, '✨');
    scene.earn('combo', x, lane - 120);
    scene.dirty = true;
  });
  return true;
}

export function eat(scene, item, c) {
  scene.tipEvent('eat');
  const mouthY = c.mouthY();
  const name = CATALOG[item.key].reaction || 'yum', react = REACTIONS[name];
  scene.discard(item, { x: c.x, y: mouthY, scale: 0, duration: 220 });

  // Chew, then react: each food has its own face, sound and emoji.
  scene.sfx.crunch();
  puff(scene, c.x, mouthY, 0xc98f5a, 6);
  scene.earn('eat', c.x, c.headTopY() - 50);
  if (scene.hard) scene.hardFed(c, item.key);                  // hard mode: it fills you up
  c.eatingUntil = scene.time.now + 700;
  c.reaction = name;
  c.reactUntil = c.eatingUntil + 1600;
  scene.time.delayedCall(450, () => {
    scene.sfx[react.sfx === 'crunch' ? 'giggle' : react.sfx]();
    floatText(scene, c.x, c.headTopY() - 10, react.emoji);
    if (react.extra) floatText(scene, c.x + 40, c.headTopY() + 20, react.extra);
  });
  squashTo(scene, c, 1.12, 0.9, 110);
  if (react.grow) scene.tweens.add({ targets: c, scale: Math.min(c.scaleX * 1.06, 1.5), duration: 150 });
}

// Attach an item to one of the character's slots; anything already there is tossed off.
function equip(scene, item, c, slot) {
  scene.tipEvent('dress');
  const old = c.worn[slot];
  if (old && old !== item) {
    old.worn = false;
    old.owner = null;
    old.slot = null;
    old.snapping = false;
    old.lane = Math.min(c.lane + 15, FLOOR_BOTTOM);
    old.z = Math.max(0, old.lane - (old.y + old.foot()));
    old.vx = 220; old.vz = 700;
  }
  c.worn[slot] = item;
  item.worn = true;
  item.owner = c;
  item.slot = slot;
  item.snapping = true;                        // let the tween drive it, then follow the character
  item.vx = item.vz = item.ly = 0;
  item.setDepth(c.depth + 1);
  const t = c.slotTarget(slot);
  scene.tweens.add({                           // snap into place
    targets: item, scale: c.scaleX * c.slots[slot].scale, angle: 0, x: t.x, y: t.y,
    duration: 140, ease: 'Back.easeOut',
    onComplete: () => { item.snapping = false; },
  });
  item.sq.x = item.sq.y = 1;
  squashTo(scene, c, 0.95, 1.04, 80);
  scene.sfx[SLOT_SFX[slot]]();
  floatText(scene, t.x, t.y - 50, '✨');
}

function cuddle(scene, toy, c) {
  scene.tipEvent('dress');
  scene.tweens.add({ targets: c, angle: { from: -4, to: 4 }, duration: 90, yoyo: true, repeat: 3,
    onComplete: () => { c.angle = 0; } });
  squashTo(scene, c, 1.06, 0.95, 120);
  toy.vz = 560;                                // the toy hops off, delighted
  toy.vx = Phaser.Math.Between(0, 1) ? 180 : -180;
  scene.sfx.cuddle();
  floatText(scene, c.x, c.headTopY() + 70, '💖');
}

export function trash(scene, item) {
  const bx = scene.binXs().sort((a, b) => Math.abs(a - item.x) - Math.abs(b - item.x))[0] ?? BIN.x;   // the nearest bin
  scene.discard(item, { x: bx, y: BIN.lane - 50, scale: 0, angle: 200, duration: 260, ease: 'Quad.easeIn' });
  scene.sfx.whoosh();
  puff(scene, bx, BIN.lane - 40, 0xcccccc, 4);
}
