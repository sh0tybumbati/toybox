# Room layout practices (living document)

Started 2026-11-15 with the **layout refinement** pass: existing buildings are audited and fixed in batches (homes first). Every audit adds
to the lists below, so new rooms start from what we already learned. Each batch has an entry in section 5.

## 1. How a batch runs

1. **Look first.** Capture every room of the batch with a real browser (e2e harness, HUD hidden, one screenshot per room) and put them on a
   contact sheet. Do this in kid mode and in adult mode, since adult mode adds a front door, mailbox and computer to the same rooms.
2. **Write down what is wrong** (section 3) before changing anything. A finding is a rule, not a one-off.
3. **Fix the data** (`data/rooms.js`, `data/buildings.js`, blueprints/scenarios), not the saves, then add a **migration that only touches rooms
   the player has not arranged** (`systems/layout.js`: compare the saved furniture with the old default).
4. Re-capture, add or update tests, then record the batch in section 5.

Room coordinates are in a 960 px design space: the back lane is `y 434`, the front lane `y 520-548`, wall shelves `y 309`, wall decor above `y 200`.
A half-width room scales every x by `w / 960`.

## 2. Good practices (keep doing / start doing)

- **One room, one job.** A bathroom is its own small room; a kitchen has cooking, washing, storing and eating; a kids' room differs from a main bedroom
  by what is in it, not just its name.
- **Furniture you can use beats furniture painted on the wall.** If it looks like a sofa, a person should be able to sit on it and a toy should be
  able to land on it. Painted `decor` is for rugs, windows, pictures and signs.
- **Pair things that belong together:** a chair stands at its table, a TV faces a sofa, a sink is in the kitchen.
- **Use both lanes.** Large furniture against the wall on the back lane (`y 434`), small things and seats on the front lane, so the floor stays walkable.
- **Leave the left 130 px of the first room free.** In adult mode the front door (x 70, 112 wide) goes there. The mailbox goes just inside it
  (x 170, front lane).
- **Keep wall shelves clear of stairs and doors.** Stairs sit at x 860 (170 wide, 232 tall) in the room that has them, so a shelf there ends at x 770.
- **Stock shelves with things that fit the room** (toys in a kids' room, food in the kitchen, parcels at the post office) and make sure a shelf
  sits at a height where its items are visible and not behind furniture.
- **Public places read from the doorway:** a counter, a sign, something to wait on and something to look at (bank: vault door and teller; council:
  banner and noticeboard; college: blackboard and bookcases).
- **Give each building a purpose that matches its name**, and one unmistakable prop for it (teller, classroom desk, till, bed).
- **Test the default layout with the placement rules** (`tests/furniture.test.mjs`): every piece must sit where `clampPlacement` allows, and a
  storage piece's slots must not overlap.

## 3. Bad practices found in the audits (avoid)

| # | Found in | Problem | Rule |
|---|----------|---------|------|
| 1 | homes, flat | A shower stood in a kitchen or bedroom (added to "the last room") | Bathrooms are their own half-width room. |
| 2 | bank, council, college, garden centre | Rooms with only a light switch, or a dumpster in a garden centre and a supermarket | Every public room gets furniture that fits its purpose; bins belong in alleys, parks and back yards. |
| 3 | motel | The front desk stood in the guest room | The lobby is a separate room from the guest room. |
| 4 | post office | Food on the shelves of a post office | Stock to the building's purpose. |
| 5 | homes | A chair parked in front of the oven, a table far away | Seats belong at tables, not at stoves. |
| 6 | living rooms | A sofa and rug **painted** into the wall art; an armchair overlapping it | Real furniture for anything people use. |
| 7 | homes | Stairs drawn over the right-hand wall shelf, cutting its items off | Keep shelves out of stair footprints. |
| 8 | adult homes | The front door covered the end of the left shelf; the mailbox overlapped the pantry; the computer overlapped the sofa | Reserve the entry zone; place hard-mode extras in the same pass as the room. |
| 9 | bedrooms | Every bedroom was an identical copy (same shelves, wardrobe, chest, bed) | Vary rooms by role (main bedroom, kids' room). |
| 10 | homes | A kitchen with no sink | A room's defining fixture must exist (sink, bed, till). |
| 11 | bedroom | A floor lamp hid one of the shelf's items | Check that tall furniture does not stand in front of a stocked shelf. |
| 12 | all | Showing HUD buttons that scrolled with the room: HUD hit areas did not follow the camera | UI pinned to the screen must be pinned when added, not only when created. |

Open observations, not yet fixed: a blue panel appears behind some light switches (state of the switch panel, to be traced); every room has a
bin in its bottom-right corner (by design, but it can sit in front of a plant or table); wallpapers meet the extended wall past the room edge with a
slightly different pattern phase; wall pictures are the same three pictures everywhere.

## 4. Research: Toca Boca World and Avatar World (what a kid's dollhouse game does)

Evidence is thin: neither studio publishes layout rules, so these come from the studios' own pages, store listings, a university game review
and press interviews. Treat them as design cues, not specs.

**Toca Boca / Toca Life World**
- No rules, scores, timers or levels; the studio calls its apps digital toys and the only goal is play
  ([Toca Boca on open-ended play](https://tocaboca.com/magazine/open-ended-play/), [Kidscreen interview](https://kidscreen.com/?p=49360),
  [Qz](https://qz.com/613098/a-new-kind-of-game-for-kids-encourages-creativity-by-eliminating-goals)).
- Interaction cues, from the official page ([Toca Boca parents page](https://tocaboca.com/for-parents/toca-life-world/)): drag objects into a
  character's hands (held things travel to other locations); drag food to the mouth; drag clothes onto the body; tap objects to toggle them
  (candles, a radio, faucets, doors); **every location keeps its state when you leave it**; day/night with one tap; a map you spin to pick a district.
- Locations are dense with small details, most draggable, stationary ones react to touch, and combining objects gives cause and effect
  ([Toy Insider review](https://thetoyinsider.com/toca-life-city-review/), [Tampere University review](https://blogs.tuni.fi/playlab/game-reviews/toca-boca-world-a-whole-new-level-of-dollhouse/): 90 locations, "from big furniture to small decorative ornaments", drag-and-drop simple enough for a four-year-old).
- Home Designer: a house is built from a blue button on the map; furniture comes from an inventory opened inside the house; unfurnished
  "building" shells are separate from furnished houses.

**Avatar World (Pazu)**
- A "world" of many themed places (hotel with floors of rooms, salon, vet, garage, school) and a house maker; quests, hidden treasures and secrets in
  every map are praised ([App Store listing](https://apps.apple.com/us/app/avatar-world/id1635318586)).
- Recurring complaints worth designing against: glitches that make items vanish when changing floors, build mode stuck or timed, furniture ending
  up in a storage room, props with no use ("frosting and soap have no use", things sold in a bakery that cannot be baked), paid content.

**What this suggests for Toybox**
1. **Everything on screen should do something.** A prop that cannot be used (an unusable bakery item) is a reported disappointment: our painted
   sofa was the same fault.
2. **Tap-to-toggle and drag-to-use are the language.** Lights, doors, taps, a radio or TV should respond to a tap; things should be draggable to
   hands, mouths and bodies. Add a reaction (sound, wobble, state change) to every fixture we place.
3. **Persist what the player does.** Rooms keep their state when you leave. (We do this; keep migrations from wiping it, as in
   `systems/layout.js`.)
4. **Density with order.** Rooms are full of small detail, but a role-defining fixture is always obvious. Aim for one big shape, two to four
   medium pieces, a handful of small objects per room.
5. **Floors and building must never lose the player's things** (Avatar World's biggest complaint). Any layout change goes through a migration that
   keeps arranged rooms and items.
6. **Variety from role, not from palette.** Same room type, different job (kids' room vs main bedroom) gives variety for free.

## 5. Batch log

### Batch 0 (2026-11-15): bank, college, motel, bathrooms
Findings 1-4 above. Added the bathroom room type, a motel lobby, furniture for the bank, council hall, college and garden centre. Save v15.

### Batch 1 (2026-11-15): homes (Home, Flat, Cottage, Apartments, adult houses)
Audited: Home (5 rooms), Starter Flat, The Old House, Brick Cottage, River Apartments (12 rooms), in kid and adult mode.
Findings 5-11 above. Changes:
- **Kitchen:** new Kitchen Counter prop with a sink and three slots (replaces the left wall shelf); fridge, oven, a pantry on the back lane, table with its
  chair beside it. Left 130 px kept clear for the front door.
- **Living room:** a real sofa and a TV and console (it launches the TV game), bookcase, armchair; the painted sofa is gone (the rug stays);
  the wall shelf moved clear of the stairs; the left shelf removed.
- **Bedrooms:** the main bedroom keeps wardrobe, chest and bed with its shelf moved clear of the stairs; a new **Kids room** (sky-dot wall, play rug,
  toy trunk, small bookcase, toy shelves) replaces the second bedroom in Home and the apartments' top floor.
- **Adult extras:** the mailbox is at x 170 (just inside the door); the computer sits in a bedroom (x 720), not the living room.
- **Saves (v16):** only rooms still exactly at their old default are redone (`isOldDefault`); rooms you arranged stay as they are.
  Second bedrooms become kids' rooms only when untouched and without stairs.
- Tests: counter slots, migration cases (`tests/layout.test.mjs`).

Deferred from batch 1: apartment halls could share a corridor feel (a hall has a rug, two lamps and a picture: fine); the cottage has no
real "front room" entry; rugs in bedrooms; a wall clock in more rooms.

### Next batches (proposed)
2. Shops and stores: Corner Shop (supermarket), Toy Shop, Furniture Store, Garden Centre, Post Office.
3. Public services: Bank, Council Hall, College, Shelter, Motel (a second look with the new practices), Arcade.
4. Work and play: Shirt Factory, Toy Workshop, Fishing Pond, Campsite, Park, Playground, Back Alley, Garden.
