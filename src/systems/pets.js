// How pets decide where to go. Pure (a random source is passed in), so it's tested.
import { W, FLOOR_TOP, FLOOR_BOTTOM } from '../config.js';
import { clamp } from '../util.js';

export const FOLLOW_DIST = 240;         // wander off further than this from the kid and the pet trots back
export const PET_SPEED = 130;
export const PET_STRIDE = 34;

const spot = (x, lane, worldW) => ({ x: clamp(x, 60, worldW - 60), lane: clamp(lane, FLOOR_TOP + 10, FLOOR_BOTTOM - 5) });

// Where should `pet` head next? A point { x, lane } or null (stay put a while).
// `leader` = the character it follows (or null), `rand` = () => [0,1).
export function petGoal(pet, leader, rand = Math.random, worldW = W) {
  if (leader && Math.abs(leader.x - pet.x) > FOLLOW_DIST) {
    const side = pet.x < leader.x ? -1 : 1;                           // stop on the side it came from
    return spot(leader.x + side * (60 + rand() * 60), leader.lane + (rand() - 0.5) * 50, worldW);
  }
  if (rand() < 0.4) return null;                                      // sometimes just sit
  return spot(pet.x + (rand() - 0.5) * 360, pet.lane + (rand() - 0.5) * 90, worldW);
}

// Milliseconds until the pet thinks again.
export const thinkDelay = (rand = Math.random) => 1800 + rand() * 3200;
