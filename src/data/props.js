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
//   station:   a mini-game station (`game` = id in data/minigames.js): tap to play.
//   mail:      drop an item on it to post it to another building (systems/mail.js).
//   pets:      tap for a new pet to hop out; drop a pet back on it to send it home.
//   bell:      tap to ring (shop register). No state.
//   storage:   drop items on it and they sit in its slots, visible, until dragged out again.
//              `slots` are item centres (local coords), `accepts` limits item kinds (null = anything).
//   play:      playground gear. Tap it and the selected friend walks over and rides (systems/play.js).
//              `ride.parts` move (swing / rock) and carry riders on their `seats`; `ride.slide` is a climb-and-slide path;
//              a part with no motion is just a seat (a bench). Local coords, relative to the piece's centre.
// Every type has a `name`, a `mount` ('floor' stands on the floor, 'wall' hangs on the wall) and a `cat`
// (catalogue tab: home | storage | play | town) for the furniture catalogue.
// Dispensers with `kinds` also hand out any unlocked premium item of those kinds.
export const PROP_TYPES = {
  fridge: {
    name: 'Fridge', cat: 'home', mount: 'floor',
    hardActions: ['eat', 'store'],
    surface: { top: -120 },
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
    name: 'Oven', cat: 'home', mount: 'floor',
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
    name: 'Surprise Wardrobe', cat: 'home', mount: 'floor',
    surface: { top: -112 },
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
    name: 'Surprise Toy Chest', cat: 'home', mount: 'floor',
    surface: { top: -6 },
    behaviour: 'dispenser', w: 112, h: 76, sfx: 'creak',
    pool: ['teddy', 'ball', 'car', 'balloon', 'duck', 'guitar', 'rocket', 'puzzle', 'robot', 'kite', 'box', 'backpack'],
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
    name: 'Light Switch', cat: 'home', mount: 'wall',
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
    name: 'Bed', cat: 'home', mount: 'floor',
    hardActions: ['sleep'],
    surface: { top: -4, people: false },
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
    name: 'Elevator', cat: 'town', mount: 'floor', connector: 'elevator',
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
    name: 'Stairs', cat: 'town', mount: 'floor', connector: 'stairs',
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
    name: 'Ladder', cat: 'town', mount: 'floor', connector: 'ladder',
    behaviour: 'connector', w: 64, h: 232,
    draw(g, open) {
      g.fillStyle(0xb5835a, 1).fillRoundedRect(-24, -116, 8, 232, 3).fillRoundedRect(16, -116, 8, 232, 3);   // rails
      g.fillStyle(0xc99466, 1);
      for (let y = -100; y < 112; y += 32) g.fillRoundedRect(-24, y, 48, 8, 3);                           // rungs
      if (open) g.fillStyle(0xfff3a0, 0.5).fillRoundedRect(-30, -118, 60, 236, 8);
    },
  },
  dock: {
    name: 'Fishing Dock', cat: 'town', mount: 'floor', behaviour: 'station', game: 'fishing', w: 240, h: 96,
    draw(g, open) {
      g.fillStyle(0xc99a62, 1).fillRect(-116, -20, 232, 40);                          // the boards
      g.fillStyle(0xe0b678, 1).fillRect(-116, -20, 232, 12);
      for (const x of [-60, 0, 60]) g.lineStyle(3, 0).lineBetween(x, -20, x + 2, 20);
      g.fillStyle(0x8a5e3b, 1).fillRect(-106, 20, 12, 28).fillRect(94, 20, 12, 28).fillRect(-6, 20, 12, 28);   // posts
      g.fillStyle(0x6aaee8, 1).fillEllipse(78, -30, 40, 18);                          // a bucket
      g.fillStyle(0xe0605a, 1).fillCircle(40, -26, 7);                               // a bobber on the boards
      g.lineStyle(5, 0).lineBetween(-80, -22, -40, -92).lineBetween(-40, -92, -10, -80);   // a rod leaning on the rail
    },
  },
  tv: {
    name: 'TV and Console', cat: 'town', mount: 'floor', behaviour: 'station', game: 'arcade', w: 156, h: 150,
    draw(g, on) {
      g.fillStyle(0xb98657, 1).fillRoundedRect(-66, 34, 132, 38, 6);                  // the stand
      g.fillStyle(0x8a5e3b, 1).fillRect(-58, 70, 12, 8).fillRect(46, 70, 12, 8);
      g.fillStyle(0x4a5368, 1).fillRoundedRect(-54, -56, 108, 88, 12);                // the TV
      g.fillStyle(on ? 0xa8f0d0 : 0x2e3a4a, 1).fillRoundedRect(-44, -46, 88, 68, 8);   // its screen (lit while playing)
      g.fillStyle(on ? 0xfff3a0 : 0x56657a, 1).fillTriangle(-6, -34, 8, -34, 1, -48).fillCircle(0, -20, 10);
      g.fillStyle(0xd0d4dc, 1).fillRoundedRect(-30, 44, 60, 14, 5);                   // the console
      g.fillStyle(0xe0605a, 1).fillCircle(22, 51, 3);
      g.lineStyle(3, 0).lineBetween(-10, -56, -26, -76).lineBetween(10, -56, 28, -78);   // rabbit ears
    },
  },
  sewing: {
    name: 'Sewing Machine', cat: 'town', mount: 'floor', behaviour: 'station', game: 'shirt', w: 140, h: 112,
    surface: { top: 14 },
    draw(g, busy) {
      g.fillStyle(0xb98657, 1).fillRoundedRect(-62, 14, 124, 30, 6);                  // the table
      g.fillStyle(0x8a5e3b, 1).fillRect(-54, 42, 10, 14).fillRect(44, 42, 10, 14);
      g.fillStyle(0xf59ab4, 1).fillRoundedRect(-40, -44, 80, 58, 14);                 // the machine
      g.fillStyle(0xd0d4dc, 1).fillRoundedRect(8, -52, 32, 14, 6);
      g.fillStyle(0xe0453d, 1).fillCircle(-22, -50, 9);                               // a spool of thread
      g.fillStyle(busy ? 0xffd166 : 0xf7efe0, 1).fillRoundedRect(-30, -28, 36, 24, 6);
      g.lineStyle(4, 0).lineBetween(34, -30, 34, 8);                                  // the needle
      g.fillStyle(0x6aaee8, 1).fillTriangle(-58, 14, -20, 14, -50, 36);               // cloth draped over the edge
    },
  },
  claytable: {
    name: 'Clay Table', cat: 'town', mount: 'floor', behaviour: 'station', game: 'sculpt', w: 150, h: 104,
    surface: { top: 12 },
    draw(g, busy) {
      g.fillStyle(0xb98657, 1).fillRoundedRect(-66, 12, 132, 30, 6);
      g.fillStyle(0x8a5e3b, 1).fillRect(-58, 40, 10, 18).fillRect(48, 40, 10, 18);
      g.fillStyle(0xf59ab4, 1).fillEllipse(-28, -2, 54, 34);                          // lumps of clay
      g.fillStyle(0x6aaee8, 1).fillEllipse(20, 0, 46, 30);
      g.fillStyle(busy ? 0xffd166 : 0x7bd88f, 1).fillEllipse(-4, -22, 40, 30);
      g.fillStyle(0xd9a066, 1).fillRoundedRect(36, -14, 8, 36, 3);                    // a modelling tool
    },
  },
  campfire: {
    name: 'Campfire', cat: 'play', mount: 'floor', behaviour: 'station', game: 'camp', w: 120, h: 96,
    draw(g, lit) {
      g.fillStyle(0x9a9aa4, 1).fillCircle(-40, 28, 10).fillCircle(-18, 38, 10).fillCircle(8, 40, 10).fillCircle(32, 36, 10).fillCircle(46, 24, 9);   // a ring of stones
      g.fillStyle(0x8a5e3b, 1).fillRoundedRect(-36, 20, 72, 14, 6).fillRoundedRect(-30, 10, 60, 12, 6);               // logs
      g.fillStyle(0xf0902f, 1).fillTriangle(-26, 14, 0, -44, 26, 14);
      g.fillStyle(0xf7d24a, 1).fillTriangle(-14, 14, 4, -22, 16, 14);
      if (lit) g.fillStyle(0xffffff, 0.35).fillCircle(0, -4, 44);
    },
  },
  till: {
    name: 'Checkout Till', cat: 'town', mount: 'floor', behaviour: 'station', game: 'cashier', w: 150, h: 120, blurb: 'Scan and give change',
    draw(g, busy) {
      g.fillStyle(0x8a5e3b, 1).fillRoundedRect(-75, 0, 150, 56, 6);                    // the counter
      g.fillStyle(0x6b7482, 1).fillRoundedRect(-70, -10, 80, 14, 5);                   // the belt
      g.fillStyle(0xdddddd, 1).fillRoundedRect(20, -48, 46, 42, 6);                    // the till
      g.fillStyle(busy ? 0xffe066 : 0x4a8f5a, 1).fillRoundedRect(26, -42, 34, 14, 3);  // its screen
      g.fillStyle(0xffd166, 1).fillCircle(32, -16, 4).fillCircle(46, -16, 4).fillCircle(60, -16, 4);
    },
  },
  flatpack: {
    name: 'Flat-pack Stand', cat: 'town', mount: 'floor', behaviour: 'station', game: 'ikea', fee: true, w: 170, h: 130, blurb: 'Build it, send it home',
    draw(g, busy) {
      g.fillStyle(0x4a7fd0, 1).fillRoundedRect(-80, -62, 160, 124, 8);                 // a big blue sign board
      g.fillStyle(0xffd23f, 1).fillRoundedRect(-66, -48, 132, 30, 6);
      g.fillStyle(0xc99466, 1).fillRoundedRect(-62, 0, 56, 40, 4).fillRoundedRect(4, 8, 58, 32, 4);   // flat boxes
      g.lineStyle(3, 0x8a5e3b, 1).lineBetween(-62, 20, -6, 20).lineBetween(4, 24, 62, 24);
      if (busy) g.fillStyle(0xffffff, 0.3).fillRoundedRect(-80, -62, 160, 124, 8);
    },
  },
  sofa: {
    name: 'Sofa', cat: 'ikea', mount: 'floor', behaviour: 'play', w: 200, h: 100, blurb: 'Sit and chat',
    hardActions: ['sit'],
    surface: { top: -10, people: false },
    ride: { parts: [{ pivot: { x: 0, y: 0 }, seats: [{ x: -50, y: 0 }, { x: 50, y: 0 }] }] },
    draw(g) {
      g.fillStyle(0x4a7fd0, 1).fillRoundedRect(-100, -44, 200, 62, 12);               // the back
      g.fillStyle(0x5f93e0, 1).fillRoundedRect(-84, -10, 168, 44, 10);                // the cushions
      g.fillStyle(0x3c68b0, 1).fillRoundedRect(-108, -20, 30, 58, 12).fillRoundedRect(78, -20, 30, 58, 12);   // the arms
      g.fillStyle(0x8a5e3b, 1).fillRect(-90, 36, 10, 14).fillRect(80, 36, 10, 14);
      g.lineStyle(3, 0x3c68b0, 1).lineBetween(0, -10, 0, 34);
    },
  },
  dresser: {
    name: 'Dresser', cat: 'ikea', mount: 'floor', behaviour: 'storage', w: 150, h: 130, accepts: null,
    surface: { top: -65 },
    slots: [{ x: -40, y: -34 }, { x: 0, y: -34 }, { x: 40, y: -34 }, { x: -40, y: 22 }, { x: 0, y: 22 }, { x: 40, y: 22 }],
    draw(g) {
      g.fillStyle(0xf3e0c2, 1).fillRoundedRect(-75, -65, 150, 130, 8);
      g.lineStyle(4, 0x8a5e3b, 1).strokeRoundedRect(-75, -65, 150, 130, 8);
      g.fillStyle(0xffd23f, 1).fillRect(-67, -4, 134, 8);                              // a yellow drawer stripe
      g.fillStyle(0xb5835a, 1).fillRect(-67, 52, 134, 7).fillRect(-67, -58, 134, 7);
      g.fillStyle(0x4a3426, 1).fillCircle(-18, 30, 4).fillCircle(18, 30, 4);
    },
  },
  desk: {
    name: 'Desk', cat: 'ikea', mount: 'floor', behaviour: 'storage', w: 180, h: 110, accepts: null,
    surface: { top: -14 },
    slots: [{ x: -56, y: -34 }, { x: -18, y: -34 }, { x: 20, y: -34 }, { x: 58, y: -34 }],
    draw(g) {
      g.fillStyle(0xd9aa72, 1).fillRoundedRect(-90, -14, 180, 14, 5);                  // the top
      g.fillStyle(0x8a5e3b, 1).fillRect(-82, 0, 10, 54).fillRect(72, 0, 10, 54);       // legs
      g.fillStyle(0xc99466, 1).fillRoundedRect(20, 0, 56, 36, 4);                      // a drawer unit
      g.fillStyle(0x4a3426, 1).fillCircle(48, 18, 3);
    },
  },
  floorlamp: {
    name: 'Floor Lamp', cat: 'ikea', mount: 'floor', behaviour: 'none', w: 70, h: 230, blurb: 'A cosy glow',
    draw(g) {
      g.fillStyle(0x3b3f4a, 1).fillRoundedRect(-24, 100, 48, 12, 5).fillRect(-4, -84, 8, 190);   // base + pole
      g.fillStyle(0xffd23f, 1).fillTriangle(-34, -50, 34, -50, 20, -114).fillTriangle(-34, -50, 20, -114, -20, -114);   // the shade
      g.fillStyle(0xfff3a0, 0.5).fillCircle(0, -60, 44);
    },
  },
  chair: {
    name: 'Chair', cat: 'home', mount: 'floor', behaviour: 'play', w: 84, h: 112, blurb: 'Take a seat',
    hardActions: ['sit'],
    ride: { parts: [{ pivot: { x: 0, y: 0 }, seats: [{ x: 0, y: 0 }] }] },
    draw(g) {
      g.fillStyle(0x8a5e3b, 1).fillRect(-34, 12, 8, 44).fillRect(26, 12, 8, 44);                          // legs
      g.fillStyle(0xb5835a, 1).fillRoundedRect(-38, -50, 8, 58, 3).fillRoundedRect(30, -50, 8, 58, 3);   // the back posts
      g.fillStyle(0xc99466, 1).fillRoundedRect(-34, -46, 68, 10, 3).fillRoundedRect(-34, -28, 68, 10, 3); // the slats
      g.fillStyle(0xd9aa72, 1).fillRoundedRect(-40, -2, 80, 14, 5);                                      // the seat
    },
  },
  stool: {
    name: 'Stool', cat: 'home', mount: 'floor', behaviour: 'play', w: 64, h: 76, blurb: 'A little seat',
    hardActions: ['sit'],
    ride: { parts: [{ pivot: { x: 0, y: 0 }, seats: [{ x: 0, y: 0 }] }] },
    draw(g) {
      g.fillStyle(0x8a5e3b, 1).fillRect(-24, 8, 7, 30).fillRect(17, 8, 7, 30).fillRect(-3, 8, 6, 30);
      g.fillStyle(0xf59ab4, 1).fillRoundedRect(-30, -6, 60, 16, 8);                                      // a round cushion
    },
  },
  armchair: {
    name: 'Armchair', cat: 'home', mount: 'floor', behaviour: 'play', w: 116, h: 112, blurb: 'Sink right in',
    hardActions: ['sit'],
    surface: { top: -2, people: false },
    ride: { parts: [{ pivot: { x: 0, y: 0 }, seats: [{ x: 0, y: 0 }] }] },
    draw(g) {
      g.fillStyle(0x7bd88f, 1).fillRoundedRect(-52, -50, 104, 70, 14);                                    // the back
      g.fillStyle(0x62c077, 1).fillRoundedRect(-58, -16, 24, 56, 10).fillRoundedRect(34, -16, 24, 56, 10);   // the arms
      g.fillStyle(0x93e4a5, 1).fillRoundedRect(-36, -8, 72, 34, 10);                                      // the cushion
      g.fillStyle(0x8a5e3b, 1).fillRect(-50, 40, 9, 12).fillRect(41, 40, 9, 12);
    },
  },
  table: {
    name: 'Table', cat: 'home', mount: 'floor', behaviour: 'none', w: 200, h: 96, blurb: 'Put things on it',
    surface: { top: -8 },
    draw(g) {
      g.fillStyle(0x8a5e3b, 1).fillRect(-86, 4, 10, 44).fillRect(76, 4, 10, 44);                          // legs
      g.fillStyle(0xb5835a, 1).fillRoundedRect(-84, 22, 168, 8, 3);                                       // a low rail
      g.fillStyle(0xd9aa72, 1).fillRoundedRect(-100, -8, 200, 16, 5);                                     // the top
    },
  },
  shower: {
    name: 'Shower', cat: 'home', mount: 'floor', behaviour: 'none', hardOnly: true, hardActions: ['wash'], w: 96, h: 220, blurb: 'Get clean',
    draw(g) {
      g.fillStyle(0xcfe8ee, 1).fillRoundedRect(-44, -106, 88, 212, 8);                       // the cubicle
      g.fillStyle(0xe9f6f8, 1).fillRoundedRect(-36, -98, 72, 196, 6);
      g.fillStyle(0xaab4c0, 1).fillRect(-4, -98, 8, 30).fillRoundedRect(-18, -72, 36, 10, 5);   // the pipe and the shower head
      g.fillStyle(0x8cc4f4, 1).fillRect(-14, -58, 3, 22).fillRect(-1, -58, 3, 28).fillRect(12, -58, 3, 22);   // drops
      g.fillStyle(0x6b7482, 1).fillRoundedRect(-44, 96, 88, 10, 4);                          // the tray
    },
  },
  fountain: {
    name: 'Water Fountain', cat: 'play', mount: 'floor', behaviour: 'none', hardOnly: true, hardActions: ['wash'], w: 70, h: 110, blurb: 'A quick wash',
    draw(g) {
      g.fillStyle(0x9aa4b0, 1).fillRoundedRect(-22, -4, 44, 58, 6);                          // the stone post
      g.fillStyle(0xb7c0cc, 1).fillEllipse(0, -6, 66, 22);                                   // the basin
      g.fillStyle(0x8cc4f4, 1).fillEllipse(0, -8, 48, 12);
      g.fillStyle(0x8cc4f4, 1).fillRect(-3, -42, 6, 34).fillTriangle(-9, -42, 9, -42, 0, -56);   // the spout
    },
  },
  frontdoor: {
    name: 'Front Door', cat: 'home', mount: 'floor', behaviour: 'none', hardOnly: true, hardActions: ['out'], w: 112, h: 230, blurb: 'The road is out here',
    draw(g) {
      g.fillStyle(0x7a4a2e, 1).fillRoundedRect(-50, -108, 100, 216, 6);                       // the door
      g.fillStyle(0x93603c, 1).fillRoundedRect(-40, -98, 80, 196, 4);
      g.fillStyle(0xbfe3f2, 1).fillRoundedRect(-28, -86, 56, 70, 4);                          // a glass pane: the road shows through
      g.fillStyle(0x6c6f78, 1).fillRect(-28, -42, 56, 26);                                    // tarmac
      g.fillStyle(0xe8e2c0, 1).fillRect(-22, -30, 14, 4).fillRect(2, -30, 14, 4);             // road markings
      g.fillStyle(0xb9b3a4, 1).fillRect(-28, -48, 56, 6);                                     // the kerb
      g.fillStyle(0xf5c14a, 1).fillCircle(32, 6, 5);                                          // the handle
      g.fillStyle(0xf1ebdc, 1).fillRoundedRect(-14, -102, 28, 14, 3);                         // house number
      g.fillStyle(0x6b5648, 1).fillRoundedRect(-44, 106, 88, 10, 4);                          // doormat
    },
  },
  gardenbed: {
    name: 'Garden Bed', cat: 'town', mount: 'floor', behaviour: 'none', hardOnly: true, plot: true, hardActions: ['tend'], w: 170, h: 90, blurb: 'Grow food',
    draw(g, st) {
      const [stageName, crop] = (typeof st === 'string' ? st : 'empty').split(':');
      g.fillStyle(0x8a5e3b, 1).fillRoundedRect(-80, -4, 160, 54, 8);                          // the frame
      g.fillStyle(0x5a3b28, 1).fillRoundedRect(-72, -12, 144, 48, 6);                         // the soil
      if (stageName === 'empty') return;
      const tall = { seed: 4, growing: 22, ready: 38, dead: 10 }[stageName] ?? 4, col = stageName === 'dead' ? 0x9a8a5a : 0x4fa14a;
      for (let i = 0; i < 5; i++) {
        g.fillStyle(col, 1).fillTriangle(-56 + i * 28, -8, -48 + i * 28, -8 - tall, -40 + i * 28, -8);
        if (stageName === 'ready') g.fillStyle({ carrot: 0xf08a2f, tomato: 0xe5484d, potato: 0xc9a56a, berry: 0x5a6fd0, corn: 0xf5d24a }[crop] || 0xf08a2f, 1).fillCircle(-48 + i * 28, -8 - tall - 4, 6);
      }
    },
  },
  seedrack: {
    name: 'Seed Rack', cat: 'town', mount: 'floor', behaviour: 'none', hardOnly: true, hardActions: ['buyseeds'], hours: [[8, 18]], w: 150, h: 150, blurb: 'Seeds and garden gear',
    draw(g) {
      g.fillStyle(0x8a5e3b, 1).fillRoundedRect(-62, -66, 124, 122, 6);                        // the rack
      g.fillStyle(0xf1ebdc, 1).fillRect(-54, -56, 108, 8).fillRect(-54, -18, 108, 8).fillRect(-54, 20, 108, 8);
      [0xf08a2f, 0xe5484d, 0xc9a56a, 0x5a6fd0, 0xf5d24a].forEach((c, i) => { g.fillStyle(c, 1).fillRoundedRect(-52 + i * 22, -52, 18, 26, 3); g.fillStyle(0x4fa14a, 1).fillRoundedRect(-52 + i * 22, -14, 18, 26, 3); });
      g.fillStyle(0x4fa14a, 1).fillRoundedRect(-52, 24, 50, 24, 4);                           // a bag of feed
    },
  },
  growpot: {
    name: 'Plant Pot', cat: 'home', mount: 'floor', behaviour: 'none', hardOnly: true, gear: 'pot', plot: true, hardActions: ['tend'], w: 80, h: 90, blurb: 'Grows anywhere with light',
    draw(g, st) {
      const [stageName, crop] = (typeof st === 'string' ? st : 'empty').split(':');
      g.fillStyle(0xc4693f, 1).fillTriangle(-30, -2, 30, -2, 22, 44).fillTriangle(-30, -2, 22, 44, -22, 44);
      g.fillStyle(0xa8532f, 1).fillRoundedRect(-34, -10, 68, 14, 4);
      g.fillStyle(0x5a3b28, 1).fillRect(-26, -12, 52, 6);
      if (stageName === 'empty') return;
      const tall = { seed: 4, growing: 18, ready: 30, dead: 8 }[stageName] ?? 4, col = stageName === 'dead' ? 0x9a8a5a : 0x4fa14a;
      for (let i = 0; i < 3; i++) g.fillStyle(col, 1).fillTriangle(-18 + i * 18, -10, -12 + i * 18, -10 - tall, -6 + i * 18, -10);
      if (stageName === 'ready') g.fillStyle({ carrot: 0xf08a2f, tomato: 0xe5484d, potato: 0xc9a56a, berry: 0x5a6fd0, corn: 0xf5d24a }[crop] || 0xf08a2f, 1).fillCircle(0, -44, 6);
    },
  },
  growtent: {
    name: 'Grow Tent', cat: 'home', mount: 'floor', behaviour: 'none', hardOnly: true, gear: 'tent', plot: true, hardActions: ['tend'], w: 150, h: 190, blurb: 'Indoors, with a lamp',
    draw(g, st) {
      const [stageName, crop] = (typeof st === 'string' ? st : 'empty').split(':');
      g.fillStyle(0x2f3a34, 1).fillRoundedRect(-66, -86, 132, 172, 8);                        // the dark tent
      g.fillStyle(0x3d4b43, 1).fillRoundedRect(-58, -78, 116, 156, 6);
      g.fillStyle(0x9aa6a0, 1).fillRect(-4, -78, 8, 156);                                     // the zip
      g.fillStyle(0xc9d2cc, 1).fillRoundedRect(-52, 40, 104, 14, 4);                          // a silvery floor
      if (stageName !== 'empty') {
        const tall = { seed: 6, growing: 34, ready: 62, dead: 12 }[stageName] ?? 6, col = stageName === 'dead' ? 0x9a8a5a : 0x58b04e;
        for (let i = 0; i < 4; i++) g.fillStyle(col, 1).fillTriangle(-40 + i * 26, 40, -32 + i * 26, 40 - tall, -24 + i * 26, 40);
        if (stageName === 'ready') g.fillStyle({ carrot: 0xf08a2f, tomato: 0xe5484d, potato: 0xc9a56a, berry: 0x5a6fd0, corn: 0xf5d24a }[crop] || 0xf08a2f, 1).fillCircle(0, -26, 8);
      }
      g.fillStyle(0xc77dff, 0.14).fillRoundedRect(-58, -78, 116, 156, 6);                      // a purple glow leaks out
    },
  },
  growlamp: {
    name: 'Grow Lamp', cat: 'home', mount: 'floor', behaviour: 'none', hardOnly: true, gear: 'lamp', w: 70, h: 190, blurb: 'Lights pots and tents',
    draw(g) {
      g.fillStyle(0x4a4f58, 1).fillRect(-4, -70, 8, 130).fillRoundedRect(-26, 56, 52, 10, 4);  // the stand
      g.fillStyle(0x6b5a8a, 1).fillRoundedRect(-34, -86, 68, 22, 8);                          // the shade
      g.fillStyle(0xe2b6ff, 0.9).fillRect(-26, -66, 52, 5);                                   // the purple tubes
      g.fillStyle(0xc77dff, 0.18).fillTriangle(-30, -62, 30, -62, 0, 48);
    },
  },
  dumpster: {
    name: 'Dumpster', cat: 'town', mount: 'floor', behaviour: 'none', hardOnly: true, hardActions: ['scavenge'], w: 118, h: 104, blurb: 'Search it',
    draw(g) {
      g.fillStyle(0x4f7a58, 1).fillRoundedRect(-58, -34, 116, 76, 6);                        // the bin
      g.fillStyle(0x3f6648, 1).fillRoundedRect(-62, -44, 124, 16, 5);                        // its lid, a little ajar
      g.fillStyle(0x2f4d36, 1).fillRect(-50, -26, 6, 60).fillRect(-26, -26, 6, 60).fillRect(-2, -26, 6, 60).fillRect(22, -26, 6, 60).fillRect(44, -26, 6, 60);
      g.fillStyle(0xe8e2d0, 1).fillTriangle(30, -44, 52, -52, 46, -34);                      // a bit of paper hanging out
      g.fillStyle(0x4a5368, 1).fillCircle(-40, 46, 7).fillCircle(40, 46, 7);
    },
  },
  cot: {
    name: 'Shelter Cot', cat: 'home', mount: 'floor', behaviour: 'bed', hardOnly: true, hardActions: ['sleep'], hours: [[17, 24], [0, 9]], w: 150, h: 66, blurb: 'A bed for the night',
    draw(g) {
      g.fillStyle(0x8a94a0, 1).fillRect(-72, 6, 8, 30).fillRect(64, 6, 8, 30);                // metal legs
      g.fillStyle(0x6b7482, 1).fillRoundedRect(-76, 0, 152, 14, 5);                           // the frame
      g.fillStyle(0xd9d4c4, 1).fillRoundedRect(-72, -14, 144, 18, 8);                         // a thin mattress
      g.fillStyle(0xf1ebdc, 1).fillRoundedRect(-68, -22, 40, 14, 7);                          // a flat pillow
    },
  },
  servery: {
    name: 'Meal Line', cat: 'town', mount: 'floor', behaviour: 'none', hardOnly: true, hardActions: ['queue'], hours: [[7, 8], [18, 19]], w: 190, h: 112, blurb: 'A free hot meal',
    pool: ['rice', 'potato', 'bread', 'carrot'],
    draw(g) {
      g.fillStyle(0xb5835a, 1).fillRoundedRect(-95, -4, 190, 54, 6);                         // the counter
      g.fillStyle(0xaab4c0, 1).fillRoundedRect(-80, -34, 56, 32, 8).fillRoundedRect(-14, -34, 56, 32, 8);   // the big pots
      g.fillStyle(0xe8913a, 1).fillEllipse(-52, -34, 46, 10).fillStyle(0xf5c14a, 1).fillEllipse(14, -34, 46, 10);
      g.fillStyle(0xe8e2d0, 1).fillRoundedRect(54, -22, 28, 20, 4);                          // a stack of bowls
      g.fillStyle(0x6b7482, 1).fillRect(-92, -60, 6, 56).fillRect(-92, -64, 40, 6);          // a sign post
    },
  },
  labourboard: {
    name: 'Day Labour Board', cat: 'town', mount: 'floor', behaviour: 'none', hardOnly: true, hardActions: ['labour'], hours: [[6, 9]], w: 130, h: 150, blurb: 'Cash-in-hand work',
    draw(g) {
      g.fillStyle(0x8a5e3b, 1).fillRect(-50, 20, 10, 56).fillRect(40, 20, 10, 56);          // posts
      g.fillStyle(0xd9aa72, 1).fillRoundedRect(-60, -64, 120, 90, 6);                       // the board
      g.fillStyle(0xfff4e0, 1).fillRect(-46, -52, 34, 28).fillRect(-4, -48, 36, 32).fillRect(-30, -12, 40, 28);   // notices
      g.fillStyle(0xe5685c, 1).fillCircle(-44, -54, 4).fillCircle(30, -50, 4).fillCircle(-26, -10, 4);
    },
  },
  begspot: {
    name: 'Cardboard Sign', cat: 'town', mount: 'floor', behaviour: 'none', hardOnly: true, hardActions: ['beg'], w: 96, h: 70, blurb: 'Ask for change',
    draw(g) {
      g.fillStyle(0xc99466, 1).fillRoundedRect(-34, -22, 68, 46, 4);                         // a scrap of cardboard
      g.fillStyle(0x4a3426, 1).fillRect(-24, -12, 48, 5).fillRect(-18, 0, 36, 5);            // scrawled words
      g.fillStyle(0x6b4a3a, 1).fillEllipse(0, 34, 52, 14);                                    // the hat for change
      g.fillStyle(0xf0c868, 1).fillCircle(-8, 32, 4).fillCircle(8, 33, 4);
    },
  },
  paydesk: {
    name: 'Post Office Counter', cat: 'town', mount: 'floor', behaviour: 'none', hardOnly: true, hardActions: ['pay'], hours: [[9, 17]], w: 170, h: 110, blurb: 'Pay your bills',
    draw(g) {
      g.fillStyle(0x8a5e3b, 1).fillRoundedRect(-85, -2, 170, 56, 6);                         // the counter
      g.fillStyle(0x6aaee8, 1).fillRoundedRect(-74, -46, 148, 40, 6);                        // the glass window
      g.fillStyle(0xdcecf8, 1).fillRoundedRect(-66, -40, 132, 28, 4);
      g.fillStyle(0xf5c14a, 1).fillRoundedRect(-34, -64, 68, 16, 4);                         // a little sign
      g.fillStyle(0x4a3426, 1).fillRect(-24, -60, 48, 3);
    },
  },
  frontdesk: {
    name: 'Motel Front Desk', cat: 'town', mount: 'floor', behaviour: 'none', hardOnly: true, hardActions: ['rent'], hours: [[8, 22]], w: 150, h: 110, blurb: 'Rent a room',
    draw(g) {
      g.fillStyle(0x7a5a3a, 1).fillRoundedRect(-75, -4, 150, 54, 6);                         // the desk
      g.fillStyle(0xe8913a, 1).fillRoundedRect(-52, -50, 104, 36, 6);                        // a big "MOTEL" sign
      g.fillStyle(0xfff4e0, 1).fillRect(-40, -42, 80, 8).fillRect(-30, -30, 60, 6);
      g.fillStyle(0xf5c14a, 1).fillCircle(48, -14, 7);                                       // the bell
      g.fillStyle(0xb0a090, 1).fillRect(-62, -26, 8, 22).fillRect(-50, -22, 8, 18);          // keys on hooks
    },
  },
  computer: {
    name: 'Computer', cat: 'town', mount: 'floor', behaviour: 'none', hardOnly: true, hardActions: ['use'], w: 110, h: 100, blurb: 'Bills and jobs',
    draw(g) {
      g.fillStyle(0xb98657, 1).fillRoundedRect(-52, 18, 104, 14, 5).fillRect(-44, 30, 8, 24).fillRect(36, 30, 8, 24);   // the desk
      g.fillStyle(0x4a5368, 1).fillRoundedRect(-34, -40, 68, 52, 8);                         // the monitor
      g.fillStyle(0x9ad0f0, 1).fillRoundedRect(-28, -34, 56, 40, 4);
      g.fillStyle(0x6b7482, 1).fillRect(-6, 12, 12, 8).fillRoundedRect(-24, 8, 48, 10, 3);
      g.fillStyle(0xdddddd, 1).fillRoundedRect(-22, 14, 44, 8, 3);                           // the keyboard
    },
  },
  newsstand: {
    name: 'Newsstand', cat: 'town', mount: 'floor', behaviour: 'none', hardOnly: true, hardActions: ['news'], hours: [[6, 22]], w: 110, h: 110, blurb: 'Today\'s paper',
    draw(g) {
      g.fillStyle(0x8a5e3b, 1).fillRoundedRect(-48, -4, 96, 58, 6);                          // the stand
      g.fillStyle(0xf1ebdc, 1).fillRoundedRect(-40, -44, 38, 44, 3).fillRoundedRect(-4, -48, 38, 48, 3).fillRoundedRect(28, -40, 30, 40, 3);   // papers
      g.fillStyle(0x4a3426, 1).fillRect(-36, -38, 30, 4).fillRect(0, -42, 30, 5).fillRect(32, -34, 22, 3).fillRect(-36, -30, 28, 3).fillRect(2, -32, 28, 3);
      g.fillStyle(0xe5685c, 1).fillRect(-40, -44, 38, 6);
    },
  },
  phonekiosk: {
    name: 'Phone Kiosk', cat: 'town', mount: 'floor', behaviour: 'none', hardOnly: true, hardActions: ['buyphone'], hours: [[9, 20]], w: 96, h: 120, blurb: 'Buy a phone',
    draw(g) {
      g.fillStyle(0x6aaee8, 1).fillRoundedRect(-40, -52, 80, 106, 8);                        // the kiosk
      g.fillStyle(0xdcecf8, 1).fillRoundedRect(-32, -44, 64, 34, 4);                         // the display window
      g.fillStyle(0x233a5a, 1).fillRoundedRect(-14, -40, 28, 26, 4);                         // a phone in it
      g.fillStyle(0x9ad0f0, 1).fillRect(-10, -36, 20, 14);
      g.fillStyle(0xf5c14a, 1).fillRoundedRect(-30, -2, 60, 14, 4);                          // a price tag
    },
  },
  worksite: {
    name: 'Work Site', cat: 'town', mount: 'floor', behaviour: 'none', hardOnly: true, hardActions: ['work'], w: 130, h: 96, blurb: 'Where the work is done',
    draw(g) {
      g.fillStyle(0xc99466, 1).fillRoundedRect(-58, -6, 50, 40, 4).fillRoundedRect(2, -6, 50, 40, 4);        // crates
      g.fillStyle(0xb5835a, 1).fillRoundedRect(-44, -42, 50, 38, 4);
      g.fillStyle(0xf5c14a, 1).fillRect(-58, 34, 112, 8);                                                    // a hazard stripe
      g.fillStyle(0x4a3426, 1).fillRect(-50, 34, 10, 8).fillRect(-26, 34, 10, 8).fillRect(-2, 34, 10, 8).fillRect(22, 34, 10, 8);
      g.fillStyle(0x6b7482, 1).fillCircle(-46, 46, 6).fillCircle(46, 46, 6);
    },
  },
  firebarrel: {
    name: 'Fire Barrel', cat: 'town', mount: 'floor', behaviour: 'none', hardOnly: true, hardActions: ['warm'], w: 80, h: 110, blurb: 'Warm your hands',
    draw(g) {
      g.fillStyle(0x6b5648, 1).fillRoundedRect(-28, -6, 56, 60, 8);                           // the barrel
      g.fillStyle(0x4a3a30, 1).fillRect(-28, 8, 56, 5).fillRect(-28, 30, 56, 5);
      g.fillStyle(0xf0902f, 1).fillTriangle(-20, -6, 0, -50, 20, -6);                          // flames
      g.fillStyle(0xf7d24a, 1).fillTriangle(-10, -6, 4, -32, 12, -6);
      g.fillStyle(0xffe27a, 0.3).fillCircle(0, -20, 50);
    },
  },
  dealer: {
    name: 'The Contact', cat: 'town', mount: 'floor', behaviour: 'none', hardOnly: true, hardActions: ['deal'], hours: [[18, 24], [0, 5]], w: 90, h: 170, blurb: 'Only after dark',
    draw(g) {
      g.fillStyle(0x3a3440, 1).fillRoundedRect(-30, -50, 60, 100, 22);                         // a hooded coat
      g.fillStyle(0x2c2733, 1).fillPoints([{ x: -26, y: -42 }, { x: 0, y: -84 }, { x: 26, y: -42 }, { x: 14, y: -26 }, { x: -14, y: -26 }], true);   // the hood
      g.fillStyle(0x15121a, 1).fillEllipse(0, -46, 30, 24);                                    // a face in shadow
      g.fillStyle(0xf5c14a, 1).fillCircle(-6, -48, 2.5).fillCircle(6, -48, 2.5);               // two eyes
      g.fillStyle(0x2c2733, 1).fillRoundedRect(-24, 48, 18, 34, 6).fillRoundedRect(6, 48, 18, 34, 6);
    },
  },
  mailbox: {
    name: 'Mailbox', cat: 'town', mount: 'floor', behaviour: 'mail', hardActions: ['mail'], w: 84, h: 136,
    draw(g, flag) {
      g.fillStyle(0x8a5e3b, 1).fillRect(-6, 4, 12, 62);                               // the post
      g.fillStyle(0x6aaee8, 1).fillRoundedRect(-34, -58, 68, 60, 16);                 // the box
      g.fillStyle(0x4a8fd8, 1).fillRoundedRect(-24, -34, 48, 10, 4);                  // the slot
      g.fillStyle(0xe0453d, 1).fillRect(32, -50, 6, 34);                              // the flag
      g.fillStyle(0xe0453d, 1).fillRoundedRect(30, flag ? -66 : -50, 22, 14, 3);
    },
  },
  cart: {
    name: 'Delivery Cart', cat: 'town', mount: 'floor', behaviour: 'mail', fee: true, w: 120, h: 100,
    draw(g, open) {
      g.fillStyle(0xd0d4dc, 1).fillRoundedRect(-50, -26, 100, 56, 8);                 // the basket
      g.lineStyle(3, 0).lineBetween(-50, -26, -62, -50).lineBetween(-62, -50, -40, -50);   // the handle
      for (const x of [-30, -10, 10, 30]) g.lineStyle(2, 0).lineBetween(x, -24, x, 28);
      g.fillStyle(0x4a5368, 1).fillCircle(-34, 40, 9).fillCircle(34, 40, 9);          // wheels
      if (open) { g.fillStyle(0x7bd88f, 1).fillEllipse(-14, -30, 30, 18); g.fillStyle(0xe0453d, 1).fillCircle(16, -32, 10); }
    },
  },
  petbasket: {
    name: 'Pet Basket', cat: 'play', mount: 'floor',
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
    name: 'Picnic Basket', cat: 'play', mount: 'floor',
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
    name: 'Lamp Post', cat: 'play', mount: 'floor',
    behaviour: 'switch', w: 36, h: 210,
    draw(g, lightsOn) {
      g.fillStyle(0x3b3f4a, 1).fillRect(-5, -80, 10, 185).fillRoundedRect(-14, 92, 28, 14, 4);
      g.fillStyle(lightsOn ? 0x777777 : 0xffe066, 1).fillRoundedRect(-16, -105, 32, 34, 8);   // lit at night
      if (!lightsOn) g.fillStyle(0xfff3a0, 0.35).fillCircle(0, -88, 40);
      g.fillStyle(0x3b3f4a, 1).fillTriangle(-20, -105, 20, -105, 0, -122);
    },
  },
  register: {
    name: 'Shop Register', cat: 'town', mount: 'floor',
    surface: { top: -6 },
    behaviour: 'bell', w: 100, h: 76,
    draw(g) {
      g.fillStyle(0x8a5e3b, 1).fillRoundedRect(-50, -6, 100, 44, 6);                 // counter
      g.fillStyle(0xdddddd, 1).fillRoundedRect(-30, -34, 60, 30, 6);                 // register
      g.fillStyle(0x4a8f5a, 1).fillRoundedRect(-22, -30, 28, 12, 3);                 // screen
      g.fillStyle(0xffd166, 1).fillCircle(18, -22, 6);                               // bell button
    },
  },
  pantry: {
    name: 'Pantry Crate', cat: 'home', mount: 'floor',
    hardActions: ['eat', 'store'],
    surface: { top: -4 },
    behaviour: 'dispenser', w: 112, h: 78, sfx: 'creak',
    pool: ['flour', 'tomato', 'potato', 'corn', 'meat', 'rice', 'fish', 'chocolate', 'egg', 'milk', 'broccoli', 'pepper', 'lemon', 'melon'],
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
    name: 'Cabinet', cat: 'storage', mount: 'floor', behaviour: 'storage', w: 136, h: 200, accepts: null,
    surface: { top: -100 },
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
    name: 'Closet', cat: 'storage', mount: 'floor', behaviour: 'storage', w: 132, h: 224, accepts: ['hat', 'glasses', 'shoes'],
    surface: { top: -112 },
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
    name: 'Bookcase', cat: 'storage', mount: 'floor', behaviour: 'storage', w: 160, h: 190, accepts: null,
    surface: { top: -95 },
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
    name: 'Trunk', cat: 'storage', mount: 'floor', behaviour: 'storage', w: 124, h: 76, accepts: null,
    slots: [{ x: -36, y: -22 }, { x: 0, y: -22 }, { x: 36, y: -22 }],
    draw(g) {
      g.fillStyle(0x6b4423, 1).fillEllipse(0, -2, 108, 22);                              // open top, dark inside
      g.fillStyle(0xb5835a, 1).fillRoundedRect(-62, 0, 124, 38, 6);
      g.lineStyle(3, 0x8a5e3b, 1).strokeRoundedRect(-62, 0, 124, 38, 6);
      g.fillStyle(0xffd166, 1).fillRect(-6, 0, 12, 38).fillCircle(0, 14, 5);
      g.fillStyle(0xc99466, 1).fillRoundedRect(-62, -30, 124, 12, 5).fillPoints([{ x: -62, y: -18 }, { x: -52, y: -2 }, { x: -62, y: 0 }], true);
    },
  },

  // --- Stocked furniture: a limited supply you can move around, restock and carry from room to room ---------
  shelf: {
    name: 'Wall Shelf', cat: 'storage', mount: 'wall', behaviour: 'storage', w: 300, h: 56, accepts: null,
    slots: [{ x: -112, y: -3 }, { x: -37, y: -3 }, { x: 37, y: -3 }, { x: 112, y: -3 }],       // items stand on the board
    draw(g) {
      g.fillStyle(0xb98657, 1).fillTriangle(-110, 28, -80, 28, -110, 52).fillTriangle(110, 28, 80, 28, 110, 52);     // brackets
      g.fillStyle(0xe3c291, 1).fillRect(-150, 14, 300, 14);                                                          // the board
    },
  },
  sandbox: {
    name: 'Sandbox', cat: 'storage', mount: 'floor', behaviour: 'storage', w: 190, h: 70, accepts: ['toy'],
    slots: [{ x: -52, y: -6 }, { x: 0, y: -6 }, { x: 52, y: -6 }],
    draw(g) {
      g.fillStyle(0xb5835a, 1).fillRoundedRect(-95, -2, 190, 38, 8);                    // the frame
      g.fillStyle(0xf0d58a, 1).fillEllipse(0, 2, 168, 24);                               // sand
      g.fillStyle(0xe0c070, 1).fillEllipse(-30, 4, 40, 8).fillEllipse(44, 0, 30, 7);
      g.fillStyle(0x8a5e3b, 1).fillRect(-95, 30, 190, 6);
    },
  },
  picnictable: {
    name: 'Picnic Table', cat: 'storage', mount: 'floor', behaviour: 'storage', w: 220, h: 96, accepts: ['food'],
    surface: { top: -8 },
    slots: [{ x: -66, y: -26 }, { x: -22, y: -26 }, { x: 22, y: -26 }, { x: 66, y: -26 }],
    draw(g) {
      g.fillStyle(0x8a5e3b, 1).fillTriangle(-80, -2, -50, -2, -90, 44).fillTriangle(80, -2, 50, -2, 90, 44);     // legs
      g.fillStyle(0xb5835a, 1).fillRoundedRect(-100, 32, 200, 10, 4);                                           // the bench
      g.fillStyle(0xc99466, 1).fillRoundedRect(-110, -8, 220, 14, 4);                                           // the table top
      g.fillStyle(0xe5484d, 1);                                                                                  // gingham cloth
      for (let x = -104; x < 100; x += 26) g.fillRect(x, -10, 13, 8);
    },
  },
  // --- Playground gear ------------------------------------------------------------------------------------------
  bench: {
    name: 'Park Bench', cat: 'play', mount: 'floor', behaviour: 'play', w: 170, h: 86, blurb: 'Sit and chat',
    hardActions: ['sit', 'rough'],
    surface: { top: -4, people: false },
    ride: { parts: [{ pivot: { x: 0, y: 0 }, seats: [{ x: -40, y: 0 }, { x: 40, y: 0 }] }] },
    draw(g) {
      g.fillStyle(0x8a5e3b, 1).fillRect(-72, 10, 10, 34).fillRect(62, 10, 10, 34);             // legs
      g.fillStyle(0xc99466, 1).fillRoundedRect(-80, -4, 160, 14, 4);                           // the seat
      g.fillStyle(0xb5835a, 1).fillRoundedRect(-80, -36, 160, 12, 4).fillRoundedRect(-80, -20, 160, 10, 4);   // the back slats
      g.fillStyle(0x8a5e3b, 1).fillRect(-72, -36, 8, 40).fillRect(64, -36, 8, 40);
    },
  },
  swing: {
    name: 'Swing Set', cat: 'play', mount: 'floor', behaviour: 'play', w: 240, h: 230, blurb: 'Swing high!',
    ride: {
      parts: [-56, 56].map(x => ({
        pivot: { x, y: -96 }, seats: [{ x, y: 60 }], motion: { kind: 'swing', amp: 0.5, hz: 0.55, phase: x < 0 ? 0 : 0.35 },
        draw(g) {                                                                              // coords relative to the pivot
          g.lineStyle(4, 0x5e4630, 1).lineBetween(-13, 0, -15, 150).lineBetween(13, 0, 15, 150);
          g.fillStyle(0xe0605a, 1).fillRoundedRect(-24, 150, 48, 10, 4);                       // the seat
        },
      })),
    },
    draw(g) {
      g.fillStyle(0x6f7f94, 1).fillRect(-122, -104, 244, 12);                                  // the top bar
      g.fillStyle(0x6f7f94, 1).fillTriangle(-122, -98, -108, -98, -140, 112).fillTriangle(-108, -98, -94, -98, -78, 112);   // legs
      g.fillStyle(0x6f7f94, 1).fillTriangle(122, -98, 108, -98, 140, 112).fillTriangle(108, -98, 94, -98, 78, 112);
    },
  },
  seesaw: {
    name: 'Seesaw', cat: 'play', mount: 'floor', behaviour: 'play', w: 280, h: 110, blurb: 'Up and down!',
    ride: { parts: [{
      pivot: { x: 0, y: 28 }, seats: [{ x: -108, y: -8 }, { x: 108, y: -8 }], motion: { kind: 'swing', amp: 0.2, hz: 0.45, phase: 0 },
      draw(g) {
        g.fillStyle(0xe0a43a, 1).fillRoundedRect(-136, -30, 272, 16, 6);                       // the plank (the pivot is its middle)
        g.fillStyle(0xe0605a, 1).fillRect(-126, -42, 8, 14).fillRect(118, -42, 8, 14);          // handles
      },
    }] },
    draw(g) {
      g.fillStyle(0x6f7f94, 1).fillTriangle(-26, 52, 26, 52, 0, 22);                           // the fulcrum
    },
  },
  springhorse: {
    name: 'Spring Horse', cat: 'play', mount: 'floor', behaviour: 'play', w: 110, h: 110, blurb: 'Giddy up!',
    ride: { parts: [{
      pivot: { x: 0, y: 46 }, seats: [{ x: -4, y: -14 }], motion: { kind: 'swing', amp: 0.16, hz: 0.7, phase: 0 },
      draw(g) {
        g.fillStyle(0xb98657, 1).fillEllipse(0, -34, 70, 40).fillEllipse(34, -62, 28, 30).fillEllipse(-40, -40, 14, 26);   // body, head, tail
        g.fillStyle(0x6f4a2f, 1).fillTriangle(24, -78, 34, -90, 38, -72).fillRect(-26, -22, 8, 36).fillRect(18, -22, 8, 36);   // mane/ears, legs
        g.fillStyle(0xe0605a, 1).fillRect(-14, -54, 28, 8);                                    // the saddle
      },
    }] },
    draw(g) {
      g.fillStyle(0xe0605a, 1).fillRoundedRect(-44, 40, 88, 12, 5);                            // the base
      g.lineStyle(5, 0x6f7f94, 1).lineBetween(-20, 40, -8, 20).lineBetween(20, 40, 8, 20);     // the spring (it flexes with the horse)
    },
  },
  slide: {
    name: 'Slide', cat: 'play', mount: 'floor', behaviour: 'play', w: 250, h: 190, blurb: 'Wheee!',
    ride: { slide: { base: { x: -92, y: 74 }, top: { x: -70, y: -56 }, end: { x: 94, y: 76 } } },
    draw(g) {
      g.lineStyle(5, 0x5e4630, 1).lineBetween(-108, 88, -108, -70).lineBetween(-80, 88, -80, -70);         // the ladder rails
      for (let y = 70; y > -60; y -= 26) g.lineStyle(5, 0x5e4630, 1).lineBetween(-108, y, -80, y);
      g.fillStyle(0x6aaee8, 1).fillRoundedRect(-104, -80, 54, 12, 4);                                       // the platform
      g.fillStyle(0xe0605a, 1).fillPoints([{ x: -56, y: -70 }, { x: -44, y: -80 }, { x: 118, y: 62 }, { x: 118, y: 80 }, { x: 96, y: 80 }], true);   // the chute
      g.fillStyle(0x6f7f94, 1).fillRect(-54, -70, 8, 154);                                                  // the support
    },
  },
  tree: {
    name: 'Tree', cat: 'play', mount: 'floor', behaviour: 'none', w: 150, h: 300, blurb: 'Shady and green',
    draw(g) {
      g.fillStyle(0x8a5e3b, 1).fillRoundedRect(-16, -20, 32, 170, 8);                           // the trunk
      g.fillStyle(0x4f9d56, 1).fillCircle(0, -88, 68).fillCircle(-46, -50, 46).fillCircle(46, -52, 46);   // the leaves
      g.fillStyle(0x62b46a, 1).fillCircle(-16, -108, 34).fillCircle(30, -80, 26);
    },
  },
};
