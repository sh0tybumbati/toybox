// The guided start: a short sequence of hints, each finished by doing the thing.
// Pure data + logic. `done` is the game event that completes the tip, `room`
// (optional) limits where it is shown. Any event completes its tip even out of
// order, so nobody is taught what they already know.
export const TIPS = [
  { id: 'grab',      done: 'grab',      text: '👆 Drag something off a shelf!' },
  { id: 'dress',     done: 'dress',     text: '🧢 Drop it on your friend — hats on the head, toys in their hands!' },
  { id: 'walk',      done: 'walk',      text: '👣 Tap the floor and your friend walks over. Tap a friend to pick who walks!' },
  { id: 'map',       done: 'map',       text: '🗺️ Open the Map to visit other places.' },
  { id: 'eat',       done: 'eat',       room: 'kitchen', text: '🍎 Drop food on your friend\'s mouth to feed them.' },
  { id: 'cook',      done: 'cook',      room: 'kitchen', text: '🍳 Drop ingredients in the oven to cook something new!' },
  { id: 'book',      done: 'book',      text: '📖 Peek in the recipe book to see what you can make.' },
  { id: 'furniture', done: 'furniture', text: '🛋️ Try furniture mode to move things around.' },
  { id: 'shop',      done: 'shop',      text: '🪙 Collect coins in the park, then spend them at the shop!' },
];

export const ALL_TIP_IDS = TIPS.map(t => t.id);

// Record `event`: returns the ids of the tips it completed (already-seen ones are ignored).
export function markDone(seen, event) {
  const finished = TIPS.filter(t => t.done === event && !seen.has(t.id)).map(t => t.id);
  finished.forEach(id => seen.add(id));
  return finished;
}

// The tip to show now: the first unseen one that fits this room.
export const currentTip = (seen, room) => TIPS.find(t => !seen.has(t.id) && (!t.room || t.room === room)) || null;
