// Buildings and the city. A building is player-authored data:
//   { name, exterior: { wall, trim, roofStyle, roofColor },
//     floors: [{ id, rooms: [{ id, type, w, extra? }] }] }        floors run bottom -> top
// A floor is a row of rooms (room types from data/rooms.js) joined into one wide panorama;
// `w` is a room's width in px (stretchable, see systems/builder.js); `extra` = furniture the
// room starts with beyond its type's own (e.g. the stairs). Ids are unique within a building.
// Blueprints are ready-made buildings you can build on an empty lot (cost in coins; null = only in the starting city).

export const ROOM_W = { min: 720, max: 1920, step: 120, def: 960 };
export const MAX_FLOORS = 5;
export const MAX_ROOMS = 5;               // per floor
export const BUILD_COST = { room: 4, floor: 12 };

const stairs = x => ({ type: 'stairs', x, y: 434 });
const room = (id, type, extra) => ({ id, type, w: ROOM_W.def, ...(extra ? { extra } : {}) });

export const BLUEPRINTS = {
  home: {
    name: 'Home', cost: null, unique: true,
    exterior: { wall: 'butter', trim: 'white', roofStyle: 'gable', roofColor: 'terracotta' },
    floors: [
      { id: 0, rooms: [room(0, 'kitchen'), room(1, 'living', [stairs(860)])] },
      { id: 1, rooms: [room(2, 'bedroom', [stairs(860)]), room(3, 'bedroom')] },
    ],
  },
  flat: {                                     // hard mode only: a small rented flat
    name: 'Flat', cost: null, unique: true,
    exterior: { wall: 'sky', trim: 'white', roofStyle: 'flat', roofColor: 'slate' },
    floors: [{ id: 0, rooms: [room(0, 'kitchen'), room(1, 'bedroom')] }],
  },
  park: {
    name: 'Park', cost: 10,
    exterior: { wall: 'meadow', trim: 'white', roofStyle: 'none', roofColor: 'terracotta' },
    floors: [{ id: 0, rooms: [room(0, 'park'), room(1, 'playground')] }],
  },
  shop: {
    name: 'Shop', cost: null, unique: true,
    exterior: { wall: 'blush', trim: 'white', roofStyle: 'flat', roofColor: 'berry' },
    floors: [{ id: 0, rooms: [room(0, 'shop')] }],
  },
  cottage: {
    name: 'Cottage', cost: 15,
    exterior: { wall: 'sky', trim: 'white', roofStyle: 'gable', roofColor: 'slate' },
    floors: [{ id: 0, rooms: [room(0, 'living'), room(1, 'kitchen'), room(2, 'bedroom')] }],
  },
  apartments: {
    name: 'Apartments', cost: 40,
    exterior: { wall: 'brick', trim: 'white', roofStyle: 'flat', roofColor: 'slate' },
    floors: [
      { id: 0, rooms: [room(0, 'hall', [{ type: 'elevator', x: 480, y: 434 }]), room(1, 'living'), room(2, 'kitchen')] },
      { id: 1, rooms: [room(3, 'hall', [{ type: 'elevator', x: 480, y: 434 }]), room(4, 'bedroom'), room(5, 'living')] },
      { id: 2, rooms: [room(6, 'hall', [{ type: 'elevator', x: 480, y: 434 }]), room(7, 'bedroom'), room(8, 'bedroom')] },
    ],
  },
  arcade: {
    name: 'Arcade', cost: 25,
    exterior: { wall: 'lilac', trim: 'navy', roofStyle: 'flat', roofColor: 'plum' },
    floors: [{ id: 0, rooms: [room(0, 'arcade')] }],
  },
  factory: {
    name: 'Shirt Factory', cost: 30,
    exterior: { wall: 'stone', trim: 'black', roofStyle: 'flat', roofColor: 'slate' },
    floors: [{ id: 0, rooms: [room(0, 'factory')] }],
  },
  workshop: {
    name: 'Toy Workshop', cost: 30,
    exterior: { wall: 'mint', trim: 'brown', roofStyle: 'gable', roofColor: 'sunny' },
    floors: [{ id: 0, rooms: [room(0, 'workshop')] }],
  },
  postoffice: {
    name: 'Post Office', cost: 20,
    exterior: { wall: 'sky', trim: 'white', roofStyle: 'gable', roofColor: 'berry' },
    floors: [{ id: 0, rooms: [room(0, 'postoffice')] }],
  },
  market: {
    name: 'Supermarket', cost: 25,
    exterior: { wall: 'butter', trim: 'white', roofStyle: 'flat', roofColor: 'forest' },
    floors: [{ id: 0, rooms: [room(0, 'market'), room(1, 'market')] }],
  },
  ikea: {
    name: 'Furniture Store', cost: 30,
    exterior: { wall: 'sky', trim: 'butter', roofStyle: 'flat', roofColor: 'butter' },
    floors: [{ id: 0, rooms: [room(0, 'ikea')] }],
  },
  pond: {
    name: 'Fishing Pond', cost: 15,
    exterior: { wall: 'meadow', trim: 'white', roofStyle: 'none', roofColor: 'terracotta' },
    floors: [{ id: 0, rooms: [room(0, 'pond')] }],
  },
  campsite: {
    name: 'Campsite', cost: 15,
    exterior: { wall: 'meadow', trim: 'white', roofStyle: 'none', roofColor: 'terracotta' },
    floors: [{ id: 0, rooms: [room(0, 'campsite')] }],
  },
  blank: {
    name: 'New build', cost: 8,
    exterior: { wall: 'cream', trim: 'white', roofStyle: 'gable', roofColor: 'terracotta' },
    floors: [{ id: 0, rooms: [room(0, 'empty')] }],
  },
};
export const BUILDABLE = Object.keys(BLUEPRINTS).filter(k => BLUEPRINTS[k].cost != null);

// A fresh, independent copy of a blueprint (the city stores plain building data).
export const newBuilding = key => JSON.parse(JSON.stringify(BLUEPRINTS[key]));

// The city: lots on a hand-drawn landscape (map coordinates on the 960x600 city map), strung along
// winding paths. `x, y` = the middle of the dirt plot; a building stands on it with its base ~40px lower.
// Slot i holds a building or null (an empty plot you can build on).
export const SLOTS = [
  { x: 125, y: 190 }, { x: 340, y: 178 }, { x: 565, y: 192 }, { x: 790, y: 180 },
  { x: 835, y: 362 }, { x: 610, y: 376 }, { x: 385, y: 356 }, { x: 150, y: 370 },
  { x: 150, y: 520 }, { x: 375, y: 530 }, { x: 600, y: 522 }, { x: 825, y: 532 },
];
// Dirt paths: lists of waypoints that get smoothed into winding tracks.
export const PATHS = [
  [{ x: -20, y: 300 }, { x: 140, y: 268 }, { x: 290, y: 292 }, { x: 450, y: 266 }, { x: 610, y: 294 }, { x: 770, y: 266 }, { x: 980, y: 298 }],
  [{ x: -20, y: 436 }, { x: 150, y: 458 }, { x: 300, y: 442 }, { x: 470, y: 464 }, { x: 620, y: 440 }, { x: 790, y: 460 }, { x: 980, y: 444 }],
  [{ x: 450, y: 266 }, { x: 505, y: 330 }, { x: 482, y: 400 }, { x: 470, y: 464 }],
  [{ x: 140, y: 268 }, { x: 70, y: 200 }, { x: 40, y: 110 }, { x: 60, y: 20 }],
  [{ x: 770, y: 266 }, { x: 860, y: 205 }, { x: 905, y: 120 }, { x: 890, y: 20 }],
];

export const starterCity = () => [newBuilding('home'), newBuilding('park'), newBuilding('shop'), ...Array(SLOTS.length - 3).fill(null)];
export const START_ZONE = '0.1';                              // the bedroom upstairs at home (floor id 1)
