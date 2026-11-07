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
  blank: {
    name: 'New build', cost: 8,
    exterior: { wall: 'cream', trim: 'white', roofStyle: 'gable', roofColor: 'terracotta' },
    floors: [{ id: 0, rooms: [room(0, 'empty')] }],
  },
};
export const BUILDABLE = Object.keys(BLUEPRINTS).filter(k => BLUEPRINTS[k].cost != null);

// A fresh, independent copy of a blueprint (the city stores plain building data).
export const newBuilding = key => JSON.parse(JSON.stringify(BLUEPRINTS[key]));

// The city: lots along the roads (map coordinates on the 960x600 city map). Slot i holds a
// building or null (an empty lot you can build on).
export const SLOTS = [
  { x: 85,  y: 165 }, { x: 235, y: 165 }, { x: 405, y: 165 }, { x: 555, y: 165 }, { x: 715, y: 165 }, { x: 875, y: 165 },
  { x: 85,  y: 435 }, { x: 235, y: 435 }, { x: 405, y: 435 }, { x: 555, y: 435 }, { x: 715, y: 435 }, { x: 875, y: 435 },
];
export const ROAD = { y: 300, cross: [330, 630] };          // the main road and the two cross streets

export const starterCity = () => [newBuilding('home'), newBuilding('park'), newBuilding('shop'), ...Array(SLOTS.length - 3).fill(null)];
export const START_ZONE = '0.1';                              // the bedroom upstairs at home (floor id 1)
