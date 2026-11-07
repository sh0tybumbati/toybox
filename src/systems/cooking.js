// The oven as a little cooking game: drop up to three ingredients in, wait (or
// tap the oven to hurry), and a dish comes out — a specific one if the mix is a
// recipe (data/recipes.js), a warm leftover or a "chef's surprise" if not.
import { FLOOR_TOP } from '../config.js';
import { CATALOG } from './../data/items.js';
import { MAX_INGREDIENTS, cookOutcome } from '../data/recipes.js';
import { puff, floatText } from './interactions.js';
import { spawnFront } from './spawn.js';
import { itemIcon } from './itemTextures.js';

const WAIT_MS = 2200;      // after the last ingredient, before cooking starts by itself
const COOK_MS = 2400;
const SLOT = 38;

export const canAccept = oven => oven.stage !== 'cooking' && oven.contents.length < MAX_INGREDIENTS;

// The speech bubble over the oven showing what's inside (plain scene objects so
// they draw above the shelf items).
function refreshUI(scene, oven) {
  oven.uiObjs.forEach(o => o.destroy());
  oven.uiObjs = [];
  oven.bar = null;
  const n = oven.contents.length;
  if (!n) return;
  const w = n * SLOT + 18, x = oven.x - 10, y = oven.y - oven.def.h / 2 - 44;
  const add = o => { o.setDepth(7500); oven.uiObjs.push(o); return o; };
  add(scene.add.graphics())
    .fillStyle(0xffffff, 0.96).fillRoundedRect(x - w / 2, y - 26, w, 58, 12)
    .lineStyle(3, 0x4a3426, 1).strokeRoundedRect(x - w / 2, y - 26, w, 58, 12)
    .fillStyle(0xffffff, 0.96).fillTriangle(x + 6, y + 31, x + 24, y + 31, x + 16, y + 44);
  oven.contents.forEach((key, i) => {
    add(itemIcon(scene, key, x - w / 2 + 9 + SLOT / 2 + i * SLOT, y - 6, 40));
  });
  oven.bar = add(scene.add.graphics());
  oven.barBox = { x: x - w / 2 + 12, y: y + 18, w: w - 24 };
}

function drawBar(oven, frac) {
  if (!oven.bar) return;
  const { x, y, w } = oven.barBox;
  oven.bar.clear().fillStyle(0xe6d8bd, 1).fillRoundedRect(x, y, w, 6, 3)
    .fillStyle(0xff9f43, 1).fillRoundedRect(x, y, Math.max(6, w * frac), 6, 3);
}

// A food item was dropped on the oven.
export function addIngredient(scene, oven, item) {
  scene.discard(item, { x: oven.x, y: oven.y - 10, scale: 0, duration: 180 });
  oven.contents.push(item.key);
  oven.stage = 'waiting';
  oven.startAt = scene.time.now + WAIT_MS;
  scene.sfx.pop();
  puff(scene, oven.x, oven.y - 20, 0xfff3a0, 3);
  refreshUI(scene, oven);
}

// Called every frame: fills the "cooking starts soon" bar, then starts cooking.
export function tickOven(scene, oven, now) {
  if (oven.stage !== 'waiting') return;
  const left = oven.startAt - now;
  drawBar(oven, 1 - left / WAIT_MS);
  if (left <= 0) startCooking(scene, oven);
}

export function startCooking(scene, oven) {
  if (oven.stage !== 'waiting') return;
  oven.stage = 'cooking';
  oven.outcome = cookOutcome(oven.contents);
  oven.setState(true);
  if (oven.bar) oven.bar.clear();
  scene.sfx.sizzle();
  scene.time.addEvent({ delay: 350, repeat: 6, callback: () => {
    if (oven.active) puff(scene, oven.x + Phaser.Math.Between(-20, 20), oven.y - 70, 0xffffff, 2);
  } });
  oven.cookEvent = scene.time.delayedCall(COOK_MS, () => { if (oven.active) deliver(scene, oven, true); });
}

// Hand over the result. `here` = we're still in the room (show the full show);
// otherwise it just lands on that room's floor for when we come back.
function deliver(scene, oven, here) {
  const { key, recipe } = oven.outcome;
  const fresh = Boolean(recipe && !scene.discovered.has(recipe.id));
  if (fresh) scene.discovered.add(recipe.id);

  if (here) {
    oven.setState(false);
    scene.sfx.ding();
    spawnFront(scene, key, oven, 60);
    floatText(scene, oven.x, oven.y - 90, '✨');
    scene.earn('cook', oven.x, oven.y - 130);
    scene.tipEvent('cook');
    if (fresh) {                                      // first time: celebrate
      scene.sfx.fanfare();
      floatText(scene, oven.x, oven.y - 190, `📖 New recipe: ${recipe.name}!`, 28);
      scene.earn('discover', oven.x, oven.y - 160);
    }
  } else {
    scene.stashAt(key, oven.x, FLOOR_TOP + 35);
  }
  oven.contents = [];
  oven.stage = 'idle';
  oven.outcome = null;
  refreshUI(scene, oven);
  scene.dirty = true;
}

// Leaving the room: finish a dish instantly, or give the ingredients back.
export function flushOven(scene, oven) {
  if (oven.stage === 'cooking') {
    if (oven.cookEvent) oven.cookEvent.remove();
    oven.setState(false);
    deliver(scene, oven, false);
  } else if (oven.stage === 'waiting') {
    oven.contents.forEach((key, i) => {
      scene.stashAt(key, oven.x + i * 40 - 40, FLOOR_TOP + 35);
    });
    oven.contents = [];
    oven.stage = 'idle';
    scene.dirty = true;
  }
}
