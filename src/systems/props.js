// What props do: dispensers hop items out, the oven cooks (systems/cooking.js),
// the switch toggles night, the register rings.
import { CATALOG } from '../data/items.js';
import { floatText } from './interactions.js';
import { spawnFront } from './spawn.js';
import { canAccept, addIngredient, startCooking, tickOven, flushOven } from './cooking.js';

// A dispenser's base pool plus any unlocked premium items of the kinds it carries.
export function poolFor(scene, def) {
  const bonus = def.kinds ? [...scene.unlocked].filter(k => def.kinds.includes(CATALOG[k].kind)) : [];
  return [...def.pool, ...bonus];
}

// Pointer pressed on a prop.
export function tapProp(scene, prop) {
  if (scene.editMode) return;                           // in furniture mode, props are for moving
  scene.lastActive = scene.time.now;
  prop.boing(prop.def.behaviour === 'bell' ? 0.7 : prop.def.behaviour === 'switch' ? 0.3 : 0.55);          // everything gives a little when you poke it
  switch (prop.def.behaviour) {
    case 'dispenser': {
      if (prop.state) return;                           // already open
      prop.setState(true);
      scene.sfx[prop.def.sfx]();
      scene.time.delayedCall(250, () => {
        if (!prop.active) return;
        spawnFront(scene, Phaser.Utils.Array.GetRandom(poolFor(scene, prop.def)), prop);
        scene.sfx.pop();
      });
      scene.time.delayedCall(900, () => { if (prop.active) prop.setState(false); });
      break;
    }
    case 'oven':
      if (prop.stage === 'waiting') startCooking(scene, prop);                 // hurry up!
      else if (prop.stage === 'idle') floatText(scene, prop.x, prop.y - 90, 'Drop ingredients in!', 24);
      break;
    case 'switch':
      scene.sfx.click();
      scene.setNight(!scene.night);
      break;
    case 'station':
      scene.openGame(prop.def.game, prop);
      break;
    case 'connector':
      scene.useConnector(prop);
      break;
    case 'pets':
      scene.adoptPet(prop);
      break;
    case 'bed':
      scene.sendToBed(prop);
      break;
    case 'bell':
      scene.sfx.ding();
      scene.tweens.add({ targets: prop, angle: { from: -4, to: 4 }, duration: 70, yoyo: true, repeat: 3, onComplete: () => { prop.angle = 0; } });
      break;
    default:
      break;
  }
}

// An item was released: does a prop want it? Returns true if consumed.
export function dropOnProps(scene, item) {
  if (item.kind !== 'food') return false;
  const oven = scene.props.find(p => p.def.behaviour === 'oven' && canAccept(p) && p.zone().contains(item.x, item.y));
  if (!oven) return false;
  oven.boing(0.6);
  addIngredient(scene, oven, item);
  return true;
}

const ovens = scene => scene.props.filter(p => p.def.behaviour === 'oven');
export const tickProps = (scene, now) => ovens(scene).forEach(o => tickOven(scene, o, now));
export const flushProps = scene => ovens(scene).forEach(o => flushOven(scene, o));
