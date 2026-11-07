// Interactive furniture. Each type has a size, a behaviour and a `draw(g, state)`
// that paints it centred on the Graphics origin (so the hit box is centred too).
//   dispenser: tap to open; a random item from `pool` hops out. state = open?
//   oven:      drop ingredients on it (up to 3); it cooks them into a dish (data/recipes.js).
//              state = cooking?
//   switch:    tap to toggle night. state = lights on?
//   bed:       a friend dropped on it (or sent to it by tapping) tucks in and sleeps; tap them to wake up.
//   connector: elevator / stairs / ladder (`connector` = which). Tap to go to another floor of the building:
//              an elevator reaches every floor with an elevator, stairs and ladders the neighbouring floors
//              that have the same kind.
//   pets:      tap for a new pet to hop out; drop a pet back on it to send it home.
//   bell:      tap to ring (shop register). No state.
//   storage:   drop items on it and they sit in its slots, visible, until dragged out again.
//              `slots` are item centres (local coords), `accepts` limits item kinds (null = anything).
// Every type has a `name` and a `mount` ('floor' stands on the floor, 'wall' hangs on the wall)
// for the furniture catalogue.
// Dispensers with `kinds` also hand out any unlocked premium item of those kinds.
export const PROP_TYPES = {
  fridge: {
    name: 'Fridge', mount: 'floor',
    behaviour: 'dispenser', w: 92, h: 240, sfx: 'creak',
    pool: ['egg', 'cheese', 'milk', 'apple', 'berry', 'carrot', 'icecream'],
    draw(g, open) {
      g.fillStyle(0xe9f2f6, 1).fillRoundedRect(-46, -120, 92, 240, 10);
      g.lineStyle(4, 0xaec3cc, 1).strokeRoundedRect(-46, -120, 92, 240, 10);
      if (open) {
        g.fillStyle(0xfff3c4, 1).fillRoundedRect(-40, -114, 80, 228, 6);
        g.lineStyle(3, 0xe0cf8f, 1);
        [-50, 10, 70].forEach(y => g.lineBetween(-40, y, 40, y));
        const door = [{ x: -46, y: -120 }, { x: -88, y: -104 }, { x: -88, y: 104 }, { x: -46, y: 120 }];
        g.fillStyle(0xdbe8ee, 1).fillPoints(door, true);
        g.lineStyle(3, 0xaec3cc, 1).strokePoints(door, true);
      } else {
        g.lineStyle(3, 0xaec3cc, 1).lineBetween(-46, -50, 46, -50);
        g.fillStyle(0x9fb3bc, 1).fillRoundedRect(28, -100, 7, 36, 3).fillRoundedRect(28, -40, 7, 56, 3);
      }
    },
  },
  oven: {
    name: 'Oven', mount: 'floor',
    behaviour: 'oven', w: 104, h: 132,
    draw(g, cooking) {
      g.fillStyle(0x8f9aa3, 1).fillRoundedRect(-50, -54, 100, 120, 8);
      g.fillStyle(0xd0d4d8, 1).fillRoundedRect(-52, -66, 104, 16, 6);                // counter top
      g.fillStyle(cooking ? 0xffa63d : 0x2e3238, 1).fillRoundedRect(-36, -20, 72, 56, 6);
      if (cooking) g.fillStyle(0xffd27a, 1).fillRoundedRect(-28, -12, 56, 40, 5);
      g.lineStyle(4, 0x5d6870, 1).strokeRoundedRect(-36, -20, 72, 56, 6);
      g.fillStyle(0xdddddd, 1);
      [-34, -12, 12, 34].forEach(x => g.fillCircle(x, -38, 6));                      // knobs
    },
  },
  wardrobe: {
    name: 'Surprise Wardrobe', mount: 'floor',
    behaviour: 'dispenser', w: 96, h: 224, sfx: 'creak',
    pool: ['gradcap', 'sunhat', 'goggles', 'dressshoes', 'cap', 'crown', 'shades', 'sneakers'],
    kinds: ['hat', 'glasses', 'shoes'],
    draw(g, open) {
      g.fillStyle(0xb5835a, 1).fillRoundedRect(-48, -112, 96, 224, 8);
      g.lineStyle(4, 0x8a5e3b, 1).strokeRoundedRect(-48, -112, 96, 224, 8);
      if (open) {
        g.fillStyle(0x4a2f20, 1).fillRoundedRect(-42, -104, 84, 208, 5);
        g.lineStyle(3, 0xcccccc, 1).lineBetween(-40, -92, 40, -92);                   // rail
        g.fillStyle(0xff6b8b, 1).fillRect(-34, -90, 16, 70);
        g.fillStyle(0x6ec6ff, 1).fillRect(-10, -90, 16, 70);
        g.fillStyle(0xffd166, 1).fillRect(14, -90, 16, 58);
        const left = [{ x: -48, y: -112 }, { x: -86, y: -96 }, { x: -86, y: 96 }, { x: -48, y: 112 }];
        const right = left.map(p => ({ x: -p.x, y: p.y }));
        for (const door of [left, right]) {
          g.fillStyle(0xc99466, 1).fillPoints(door, true);
          g.lineStyle(3, 0x8a5e3b, 1).strokePoints(door, true);
        }
      } else {
        g.lineStyle(3, 0x8a5e3b, 1).lineBetween(0, -112, 0, 112);
        g.fillStyle(0xffe9a8, 1).fillCircle(-10, 0, 5).fillCircle(10, 0, 5);
      }
    },
  },
  chest: {
    name: 'Surprise Toy Chest', mount: 'floor',
    behaviour: 'dispenser', w: 112, h: 76, sfx: 'creak',
    pool: ['teddy', 'ball', 'car', 'balloon', 'duck', 'guitar', 'rocket', 'puzzle', 'robot', 'kite'],
    kinds: ['toy'],
    draw(g, open) {
      g.fillStyle(0xb5835a, 1).fillRoundedRect(-56, -6, 112, 44, 6);                  // base
      g.lineStyle(3, 0x8a5e3b, 1).strokeRoundedRect(-56, -6, 112, 44, 6);
      if (open) {
        g.fillStyle(0x4a2f20, 1).fillRect(-50, -6, 100, 8);
        const lid = [{ x: -56, y: -6 }, { x: 56, y: -6 }, { x: 48, y: -36 }, { x: -48, y: -36 }];
        g.fillStyle(0xc99466, 1).fillPoints(lid, true);
        g.lineStyle(3, 0x8a5e3b, 1).strokePoints(lid, true);
      } else {
        g.fillStyle(0xc99466, 1).fillRoundedRect(-56, -34, 112, 32, 12);
        g.lineStyle(3, 0x8a5e3b, 1).strokeRoundedRect(-56, -34, 112, 32, 12);
      }
      g.fillStyle(0xffd166, 1).fillRect(-8, -34, 16, 72).fillCircle(0, 4, 6);         // strap + lock
    },
  },
  lightswitch: {
    name: 'Light Switch', mount: 'wall',
    behaviour: 'switch', w: 40, h: 56,
    draw(g, lightsOn) {
      g.fillStyle(0xffffff, 1).fillRoundedRect(-20, -28, 40, 56, 6);
      g.lineStyle(3, 0xcccccc, 1).strokeRoundedRect(-20, -28, 40, 56, 6);
      g.fillStyle(0xdddddd, 1).fillRoundedRect(-8, -18, 16, 36, 4);
      if (lightsOn) g.fillStyle(0xffd166, 1).fillRoundedRect(-8, -18, 16, 18, 4);
      else g.fillStyle(0x8899aa, 1).fillRoundedRect(-8, 0, 16, 18, 4);
    },
  },
  bed: {
    name: 'Bed', mount: 'floor',
    behaviour: 'bed', w: 260, h: 100,
    draw(g) {
      g.fillStyle(0x8a5e3b, 1).fillRoundedRect(-130, -50, 22, 100, 6);                 // headboard
      g.fillStyle(0x8a5e3b, 1).fillRoundedRect(112, -4, 18, 54, 6);                    // footboard
      g.fillStyle(0xb5835a, 1).fillRoundedRect(-124, 24, 248, 26, 6);                  // frame
      g.fillStyle(0xfdf6e6, 1).fillRoundedRect(-112, -16, 224, 44, 12);                // mattress
      g.lineStyle(3, 0xe0d3b5, 1).strokeRoundedRect(-112, -16, 224, 44, 12);
      g.fillStyle(0xffffff, 1).fillRoundedRect(-106, -30, 72, 30, 14);                 // pillow
      g.lineStyle(3, 0xdddddd, 1).strokeRoundedRect(-106, -30, 72, 30, 14);
    },
  },
  elevator: {
    name: 'Elevator', mount: 'floor', connector: 'elevator',
    behaviour: 'connector', w: 130, h: 232,
    draw(g, open) {
      g.fillStyle(0x6b7a99, 1).fillRoundedRect(-65, -116, 130, 232, 8);               // frame
      g.fillStyle(0x3b4660, 1).fillRoundedRect(-52, -96, 104, 212, 4);                // shaft
      if (open) g.fillStyle(0xfff3c4, 1).fillRoundedRect(-48, -92, 96, 204, 3);       // lit cabin
      else {
        g.fillStyle(0xc6cfe2, 1).fillRect(-48, -92, 47, 204).fillRect(1, -92, 47, 204);   // closed doors
        g.lineStyle(2, 0x9aa5bd, 1).lineBetween(0, -92, 0, 112);
      }
      g.fillStyle(0x1b2236, 1).fillRoundedRect(-30, -112, 60, 14, 4);                 // floor display
      g.fillStyle(0x7fe08a, 1).fillTriangle(-6, -100, 6, -100, 0, -109);
    },
  },
  stairs: {
    name: 'Stairs', mount: 'floor', connector: 'stairs',
    behaviour: 'connector', w: 170, h: 232,
    draw(g, open) {
      const steps = 7;
      for (let i = 0; i < steps; i++) {                                                // a staircase rising to the right
        const x = -80 + i * 22, top = 100 - (i + 1) * 28;
        g.fillStyle(0xc99466, 1).fillRect(x, top, 22, 116 - (top + 16) + 16);
        g.fillStyle(0xe2b685, 1).fillRect(x, top, 22, 8);
        g.lineStyle(2, 0x8a5e3b, 1).strokeRect(x, top, 22, 116 - (top + 16) + 16);
      }
      g.lineStyle(6, 0x8a5e3b, 1).lineBetween(-80, 40, 74, -116);                      // handrail
      g.fillStyle(0x8a5e3b, 1);
      for (let i = 0; i < steps; i += 2) g.fillRect(-76 + i * 22, 44 - i * 28 - 40, 5, 44);
      if (open) g.fillStyle(0xfff3a0, 0.5).fillRoundedRect(-84, -118, 168, 236, 10);   // glow while in use
    },
  },
  ladder: {
    name: 'Ladder', mount: 'floor', connector: 'ladder',
    behaviour: 'connector', w: 64, h: 232,
    draw(g, open) {
      g.fillStyle(0xb5835a, 1).fillRoundedRect(-24, -116, 8, 232, 3).fillRoundedRect(16, -116, 8, 232, 3);   // rails
      g.fillStyle(0xc99466, 1);
      for (let y = -100; y < 112; y += 32) g.fillRoundedRect(-24, y, 48, 8, 3);                           // rungs
      if (open) g.fillStyle(0xfff3a0, 0.5).fillRoundedRect(-30, -118, 60, 236, 8);
    },
  },
  petbasket: {
    name: 'Pet Basket', mount: 'floor',
    behaviour: 'pets', w: 112, h: 52,
    draw(g) {
      g.fillStyle(0xc9964f, 1).fillRoundedRect(-56, -6, 112, 44, 18);                // wicker rim
      g.lineStyle(2, 0xa87a3a, 1);
      for (let x = -44; x <= 44; x += 22) g.lineBetween(x, -2, x, 36);
      g.lineBetween(-54, 16, 54, 16);
      g.fillStyle(0xff9fb5, 1).fillEllipse(0, -4, 92, 20);                            // soft cushion
      g.fillStyle(0xffc2d1, 1).fillEllipse(0, -6, 66, 11);
      g.fillStyle(0xffe066, 1).fillCircle(34, 6, 5);                                  // a button on the cushion
    },
  },
  basket: {
    name: 'Picnic Basket', mount: 'floor',
    behaviour: 'dispenser', w: 96, h: 64, sfx: 'creak',
    pool: ['apple', 'banana', 'cookie', 'bread', 'cheese', 'berry', 'grapes', 'milk'],
    draw(g, open) {
      g.fillStyle(0xc9964f, 1).fillRoundedRect(-46, -12, 92, 44, 14);               // wicker
      g.lineStyle(2, 0xa87a3a, 1);
      for (let x = -34; x <= 34; x += 17) g.lineBetween(x, -10, x, 30);
      g.lineBetween(-44, 8, 44, 8);
      if (open) {
        g.fillStyle(0x6b4423, 1).fillEllipse(0, -12, 84, 16);
        const cloth = [{ x: 30, y: -12 }, { x: 60, y: -4 }, { x: 52, y: 20 }, { x: 28, y: 6 }];
        g.fillStyle(0xe5484d, 1).fillPoints(cloth, true);
      } else {
        g.fillStyle(0xffffff, 1).fillRoundedRect(-46, -26, 92, 22, 8);               // gingham cloth
        g.fillStyle(0xe5484d, 1);
        for (let x = -46; x < 46; x += 23) g.fillRect(x, -26, 11.5, 22);
      }
    },
  },
  lamppost: {
    name: 'Lamp Post', mount: 'floor',
    behaviour: 'switch', w: 36, h: 210,
    draw(g, lightsOn) {
      g.fillStyle(0x3b3f4a, 1).fillRect(-5, -80, 10, 185).fillRoundedRect(-14, 92, 28, 14, 4);
      g.fillStyle(lightsOn ? 0x777777 : 0xffe066, 1).fillRoundedRect(-16, -105, 32, 34, 8);   // lit at night
      if (!lightsOn) g.fillStyle(0xfff3a0, 0.35).fillCircle(0, -88, 40);
      g.fillStyle(0x3b3f4a, 1).fillTriangle(-20, -105, 20, -105, 0, -122);
    },
  },
  register: {
    name: 'Shop Register', mount: 'floor',
    behaviour: 'bell', w: 100, h: 76,
    draw(g) {
      g.fillStyle(0x8a5e3b, 1).fillRoundedRect(-50, -6, 100, 44, 6);                 // counter
      g.fillStyle(0xdddddd, 1).fillRoundedRect(-30, -34, 60, 30, 6);                 // register
      g.fillStyle(0x4a8f5a, 1).fillRoundedRect(-22, -30, 28, 12, 3);                 // screen
      g.fillStyle(0xffd166, 1).fillCircle(18, -22, 6);                               // bell button
    },
  },
  pantry: {
    name: 'Pantry Crate', mount: 'floor',
    behaviour: 'dispenser', w: 112, h: 78, sfx: 'creak',
    pool: ['flour', 'tomato', 'potato', 'corn', 'meat', 'rice', 'fish', 'chocolate', 'egg', 'milk'],
    draw(g, open) {
      g.fillStyle(0xb5835a, 1).fillRoundedRect(-56, -4, 112, 42, 4);                 // crate
      g.lineStyle(3, 0x8a5e3b, 1).strokeRoundedRect(-56, -4, 112, 42, 4);
      g.lineBetween(-56, 12, 56, 12).lineBetween(-56, 26, 56, 26);
      if (open) {
        g.fillStyle(0xf4ead0, 1).fillEllipse(-16, -10, 54, 40);                       // flour sack, mouth open
        g.fillStyle(0xffffff, 1).fillEllipse(-16, -22, 38, 12);
        g.fillStyle(0x8a5e3b, 1).fillRect(24, -34, 36, 6);                           // lid propped up
      } else {
        g.fillStyle(0xf4ead0, 1).fillRoundedRect(-44, -36, 50, 36, 10);               // sacks
        g.fillStyle(0xe8d9b0, 1).fillRoundedRect(8, -30, 40, 30, 10);
        g.fillStyle(0x8a5e3b, 1).fillRect(-12, -36, 6, 6).fillRect(28, -30, 6, 6);
      }
    },
  },
  // --- Storage furniture: open-front, so whatever is inside stays in view ---------
  cabinet: {
    name: 'Cabinet', mount: 'floor', behaviour: 'storage', w: 136, h: 200, accepts: null,
    slots: [{ x: -42, y: -62 }, { x: 0, y: -62 }, { x: 42, y: -62 }, { x: -42, y: -2 }, { x: 0, y: -2 }, { x: 42, y: -2 }, { x: -42, y: 58 }, { x: 0, y: 58 }, { x: 42, y: 58 }],
    draw(g) {
      g.fillStyle(0xc99466, 1).fillRoundedRect(-68, -100, 136, 200, 8);
      g.lineStyle(4, 0x8a5e3b, 1).strokeRoundedRect(-68, -100, 136, 200, 8);
      g.fillStyle(0xf3e0c2, 1).fillRect(-60, -92, 120, 184);                            // back panel
      g.fillStyle(0xb5835a, 1);
      [-38, 22, 82].forEach(y => g.fillRect(-60, y, 120, 7));                           // shelves
      g.fillStyle(0x8a5e3b, 1).fillRect(-74, -108, 148, 10);                            // top
    },
  },
  closet: {
    name: 'Closet', mount: 'floor', behaviour: 'storage', w: 132, h: 224, accepts: ['hat', 'glasses', 'shoes'],
    slots: [{ x: -40, y: -70 }, { x: 0, y: -70 }, { x: 40, y: -70 }, { x: -40, y: -6 }, { x: 0, y: -6 }, { x: 40, y: -6 }, { x: -40, y: 58 }, { x: 0, y: 58 }, { x: 40, y: 58 }],
    draw(g) {
      g.fillStyle(0x8a6a4f, 1).fillRoundedRect(-66, -112, 132, 224, 8);
      g.lineStyle(4, 0x5e4630, 1).strokeRoundedRect(-66, -112, 132, 224, 8);
      g.fillStyle(0xe8d8c0, 1).fillRect(-58, -104, 116, 208);
      g.lineStyle(3, 0xcccccc, 1).lineBetween(-56, -92, 56, -92);                       // hanging rail
      g.fillStyle(0x5e4630, 1);
      [-46, 18, 82].forEach(y => g.fillRect(-58, y, 116, 7));
      g.fillStyle(0xffd166, 1).fillCircle(-62, 0, 4).fillCircle(62, 0, 4);              // knobs
    },
  },
  bookcase: {
    name: 'Bookcase', mount: 'floor', behaviour: 'storage', w: 160, h: 190, accepts: null,
    slots: [{ x: -54, y: -58 }, { x: -18, y: -58 }, { x: 18, y: -58 }, { x: 54, y: -58 }, { x: -54, y: 2 }, { x: -18, y: 2 }, { x: 18, y: 2 }, { x: 54, y: 2 }, { x: -54, y: 62 }, { x: -18, y: 62 }, { x: 18, y: 62 }, { x: 54, y: 62 }],
    draw(g) {
      g.fillStyle(0xa86f47, 1).fillRoundedRect(-80, -95, 160, 190, 6);
      g.lineStyle(4, 0x6e4528, 1).strokeRoundedRect(-80, -95, 160, 190, 6);
      g.fillStyle(0xfff0d6, 1).fillRect(-72, -87, 144, 174);
      g.fillStyle(0x8a5a36, 1);
      [-38, 22, 82].forEach(y => g.fillRect(-72, y, 144, 7));
    },
  },
  trunk: {
    name: 'Trunk', mount: 'floor', behaviour: 'storage', w: 124, h: 76, accepts: null,
    slots: [{ x: -36, y: -22 }, { x: 0, y: -22 }, { x: 36, y: -22 }],
    draw(g) {
      g.fillStyle(0x6b4423, 1).fillEllipse(0, -2, 108, 22);                              // open top, dark inside
      g.fillStyle(0xb5835a, 1).fillRoundedRect(-62, 0, 124, 38, 6);
      g.lineStyle(3, 0x8a5e3b, 1).strokeRoundedRect(-62, 0, 124, 38, 6);
      g.fillStyle(0xffd166, 1).fillRect(-6, 0, 12, 38).fillCircle(0, 14, 5);
      g.fillStyle(0xc99466, 1).fillRoundedRect(-62, -30, 124, 12, 5).fillPoints([{ x: -62, y: -18 }, { x: -52, y: -2 }, { x: -62, y: 0 }], true);
    },
  },
};
