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
export const BUILD_COST = { room: 0, floor: 0 };            // kid mode: building is free (hard mode prices it in cash, data/hard/property.js)

const stairs = x => ({ type: 'stairs', x, y: 434 });
const room = (id, type, extra) => ({ id, type, w: ROOM_W.def, ...(extra ? { extra } : {}) });

export const BLUEPRINTS = {
  home: {
    name: 'Home', house: true, cost: null, unique: true,
    exterior: { wall: 'butter', trim: 'white', roofStyle: 'gable', roofColor: 'terracotta' },
    floors: [
      { id: 0, rooms: [room(0, 'kitchen'), room(1, 'living', [stairs(860)])] },
      { id: 1, rooms: [room(2, 'bedroom', [stairs(860)]), room(3, 'bedroom')] },
    ],
  },
  flat: {                                     // hard mode only: a small rented flat
    name: 'Flat', house: true, cost: null, unique: true,
    exterior: { wall: 'sky', trim: 'white', roofStyle: 'flat', roofColor: 'slate' },
    floors: [{ id: 0, rooms: [room(0, 'kitchen'), room(1, 'bedroom')] }],
  },
  motel: {                                    // hard mode only: rent a room by the week
    name: 'Motel', cost: null, unique: true,
    exterior: { wall: 'butter', trim: 'berry', roofStyle: 'flat', roofColor: 'terracotta' },
    floors: [{ id: 0, rooms: [room(0, 'motel')] }],
  },
  alley: {                                    // hard mode only: where things are bought without questions
    name: 'Back Alley', cost: null, unique: true,
    exterior: { wall: 'grey', trim: 'black', roofStyle: 'none', roofColor: 'slate' },
    floors: [{ id: 0, rooms: [room(0, 'alley')] }],
  },
  bank: {                                     // hard mode only: swap coins and cash (and, later, loans)
    name: 'Bank', cost: null, unique: true,
    exterior: { wall: 'stone', trim: 'navy', roofStyle: 'flat', roofColor: 'slate' },
    floors: [{ id: 0, rooms: [room(0, 'bank')] }],
  },
  shelter: {                                  // hard mode only: a night shelter
    name: 'Shelter', cost: null, unique: true,
    exterior: { wall: 'blush', trim: 'white', roofStyle: 'flat', roofColor: 'slate' },
    floors: [{ id: 0, rooms: [room(0, 'shelter')] }],
  },
  park: {
    name: 'Park', cost: null,
    exterior: { wall: 'meadow', trim: 'white', roofStyle: 'none', roofColor: 'terracotta' },
    floors: [{ id: 0, rooms: [room(0, 'park'), room(1, 'playground')] }],
  },
  nursery: {                                  // hard mode only: seeds and garden gear
    name: 'Garden Centre', cost: null, unique: true,
    exterior: { wall: 'mint', trim: 'white', roofStyle: 'gable', roofColor: 'forest' },
    floors: [{ id: 0, rooms: [room(0, 'nursery')] }],
  },
  shop: {
    name: 'Shop', cost: null, unique: true,
    exterior: { wall: 'blush', trim: 'white', roofStyle: 'flat', roofColor: 'berry' },
    floors: [{ id: 0, rooms: [room(0, 'shop')] }],
  },
  cottage: {
    name: 'Cottage', house: true, cost: 0,
    exterior: { wall: 'sky', trim: 'white', roofStyle: 'gable', roofColor: 'slate' },
    floors: [{ id: 0, rooms: [room(0, 'living'), room(1, 'kitchen'), room(2, 'bedroom')] }],
  },
  apartments: {
    name: 'Apartments', house: true, cost: 0,
    exterior: { wall: 'brick', trim: 'white', roofStyle: 'flat', roofColor: 'slate' },
    floors: [
      { id: 0, rooms: [room(0, 'hall', [{ type: 'elevator', x: 480, y: 434 }]), room(1, 'living'), room(2, 'kitchen')] },
      { id: 1, rooms: [room(3, 'hall', [{ type: 'elevator', x: 480, y: 434 }]), room(4, 'bedroom'), room(5, 'living')] },
      { id: 2, rooms: [room(6, 'hall', [{ type: 'elevator', x: 480, y: 434 }]), room(7, 'bedroom'), room(8, 'bedroom')] },
    ],
  },
  arcade: {
    name: 'Arcade', cost: null,
    exterior: { wall: 'lilac', trim: 'navy', roofStyle: 'flat', roofColor: 'plum' },
    floors: [{ id: 0, rooms: [room(0, 'arcade')] }],
  },
  factory: {
    name: 'Shirt Factory', cost: null,
    exterior: { wall: 'stone', trim: 'black', roofStyle: 'flat', roofColor: 'slate' },
    floors: [{ id: 0, rooms: [room(0, 'factory')] }],
  },
  workshop: {
    name: 'Toy Workshop', cost: null,
    exterior: { wall: 'mint', trim: 'brown', roofStyle: 'gable', roofColor: 'sunny' },
    floors: [{ id: 0, rooms: [room(0, 'workshop')] }],
  },
  postoffice: {
    name: 'Post Office', cost: null,
    exterior: { wall: 'sky', trim: 'white', roofStyle: 'gable', roofColor: 'berry' },
    floors: [{ id: 0, rooms: [room(0, 'postoffice')] }],
  },
  market: {
    name: 'Supermarket', cost: null,
    exterior: { wall: 'butter', trim: 'white', roofStyle: 'flat', roofColor: 'forest' },
    floors: [{ id: 0, rooms: [room(0, 'market'), room(1, 'market')] }],
  },
  ikea: {
    name: 'Furniture Store', cost: null,
    exterior: { wall: 'sky', trim: 'butter', roofStyle: 'flat', roofColor: 'butter' },
    floors: [{ id: 0, rooms: [room(0, 'ikea')] }],
  },
  pond: {
    name: 'Fishing Pond', cost: null,
    exterior: { wall: 'meadow', trim: 'white', roofStyle: 'none', roofColor: 'terracotta' },
    floors: [{ id: 0, rooms: [room(0, 'pond')] }],
  },
  campsite: {
    name: 'Campsite', cost: null,
    exterior: { wall: 'meadow', trim: 'white', roofStyle: 'none', roofColor: 'terracotta' },
    floors: [{ id: 0, rooms: [room(0, 'campsite')] }],
  },
  bizshop: {                                  // hard mode only: premises you build for a business of your own
    name: 'My Shop', cost: null, biz: 'shop',
    exterior: { wall: 'blush', trim: 'white', roofStyle: 'flat', roofColor: 'berry' },
    floors: [{ id: 0, rooms: [room(0, 'shop')] }],
  },
  bizworkshop: {
    name: 'My Workshop', cost: null, biz: 'workshop',
    exterior: { wall: 'mint', trim: 'brown', roofStyle: 'gable', roofColor: 'sunny' },
    floors: [{ id: 0, rooms: [room(0, 'workshop')] }],
  },
  bizfarm: {
    name: 'My Farm', cost: null, biz: 'farm',
    exterior: { wall: 'meadow', trim: 'white', roofStyle: 'none', roofColor: 'terracotta' },
    floors: [{ id: 0, rooms: [room(0, 'garden')] }],
  },
  blank: {
    name: 'New build', house: true, cost: 0,
    exterior: { wall: 'cream', trim: 'white', roofStyle: 'gable', roofColor: 'terracotta' },
    floors: [{ id: 0, rooms: [room(0, 'empty')] }],
  },
};
// Houses are all you can build; every public place (shops, arcade, park...) is already in town.
export const BUILDABLE = Object.keys(BLUEPRINTS).filter(k => BLUEPRINTS[k].house && BLUEPRINTS[k].cost != null);
// A building you can live in (flag kept on the building; older saves are recognised by their blueprint's name).
export const isHouse = b => Boolean(b && (b.house || Object.values(BLUEPRINTS).some(bp => bp.house && bp.name === b.name)));

// A fresh, independent copy of a blueprint (the city stores plain building data).
export const newBuilding = key => JSON.parse(JSON.stringify(BLUEPRINTS[key]));

// The city: lots on a hand-drawn landscape (map coordinates on the 960x600 city map), strung along
// winding paths. `x, y` = the middle of the dirt plot; a building stands on it with its base ~40px lower.
// Slot i holds a building or null (an empty plot you can build on).
export const SLOTS = [
  { x: 100, y: 112 }, { x: 290, y: 112 }, { x: 480, y: 112 }, { x: 670, y: 112 }, { x: 860, y: 112 },
  { x: 100, y: 242 }, { x: 290, y: 242 }, { x: 480, y: 242 }, { x: 670, y: 242 }, { x: 860, y: 242 },
  { x: 100, y: 372 }, { x: 290, y: 372 }, { x: 480, y: 372 }, { x: 670, y: 372 }, { x: 860, y: 372 },
  { x: 100, y: 502 }, { x: 290, y: 502 }, { x: 480, y: 502 }, { x: 670, y: 502 }, { x: 860, y: 502 },
];
// Dirt paths: lists of waypoints that get smoothed into winding tracks (three streets and a few lanes between them).
export const PATHS = [
  [{ x: -20, y: 204 }, { x: 150, y: 190 }, { x: 300, y: 206 }, { x: 480, y: 190 }, { x: 660, y: 206 }, { x: 830, y: 190 }, { x: 980, y: 204 }],
  [{ x: -20, y: 334 }, { x: 150, y: 320 }, { x: 300, y: 336 }, { x: 480, y: 320 }, { x: 660, y: 336 }, { x: 830, y: 320 }, { x: 980, y: 334 }],
  [{ x: -20, y: 464 }, { x: 150, y: 450 }, { x: 300, y: 466 }, { x: 480, y: 450 }, { x: 660, y: 466 }, { x: 830, y: 450 }, { x: 980, y: 464 }],
  [{ x: 195, y: 190 }, { x: 205, y: 260 }, { x: 192, y: 336 }, { x: 204, y: 400 }, { x: 195, y: 466 }],
  [{ x: 575, y: 190 }, { x: 565, y: 260 }, { x: 578, y: 336 }, { x: 566, y: 400 }, { x: 575, y: 466 }],
  [{ x: 765, y: 190 }, { x: 775, y: 260 }, { x: 762, y: 336 }, { x: 774, y: 400 }, { x: 765, y: 466 }],
];

// The starter town: every public place is already built (slot -> blueprint); the empty lots are for houses.
export const TOWN = { 0: 'home', 1: 'park', 2: 'shop', 3: 'market', 4: 'postoffice', 6: 'arcade', 7: 'factory', 9: 'workshop', 10: 'pond', 11: 'ikea', 12: 'campsite' };
export const starterCity = () => SLOTS.map((_, i) => (TOWN[i] ? newBuilding(TOWN[i]) : null));
export const START_ZONE = '0.1';                              // the bedroom upstairs at home (floor id 1)
