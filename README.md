# Little Toybox

A Toca-style sandbox: no win or lose, just dragging, dressing, feeding and tossing things around.
Phaser 3 from a CDN, plain ES modules, no build step.

```bash
npm start        # python -m http.server 8000, then open http://localhost:8000
npm test         # node --test: physics, walking, social, pets, saves, recipes, furniture, tips, import check (no browser)
npm run e2e      # plays the real game in headless Chromium (mouse + touch emulation); needs Chrome/Chromium
```
Tap 🎨 in the room to open the character creator. Tap the floor to walk, drop a friend next to another to hug, tuck them into a bed, and adopt pets from the basket in the park. Build a city (🗺️ Map → empty lot), then fill it: arcade, shirt factory, toy workshop, post office, supermarket, fishing pond, campsite. Furniture mode → Decorate repaints rooms and moves windows.

## Layout
```
main.js                  Phaser.Game config + scene list
src/config.js            constants (screen, floor band, gravity, bin, save version)
src/ui.js                touch-friendly hit areas and icon buttons
src/data/                art + content as data: ink.js (wobbly hand-inked shapes), body.js (kid/adult layouts + noodle-limb maths), face.js (dot-eye faces), decor.js/style.js/exterior.js (rooms, buildings), tips.js (guided start), items.js, rooms.js, props.js, recipes.js, economy.js, pets.js, look.js (hair/palettes), expressions.js, characters.js
src/entities/            Character (container rig: boneless ink-drawn people, kid + grown-up bodies), Item (emoji Text with physics state), Prop (furniture)
src/systems/             physics.js + expression.js + slots.js (pure), cooking.js (oven minigame),
                         storage.js (items in furniture), save.js (versioned, IndexedDB), sfx.js (WebAudio),
                         interactions.js (eat / wear / cuddle / bin / combos, effects),
                         props.js (fridge, oven, switch, bed, pet basket behaviours),
                         walk.js (walking + step-cycle pose), social.js (hug + bed maths), pets.js (where pets go)
src/scenes/              BootScene (loads save + emoji font) -> RoomScene (lifecycle + update loop),
                         room/ (mixins: hud, economy, world, saving, furniture, party, objects, dragdrop, tips, walking, social, pets),
                         CreatorScene (looks, party), HubScene (world map), BookScene (recipes),
                         CatalogScene (furniture) — all overlays on a paused RoomScene
tests/                   node:test suites; tests/e2e/ = the headless-browser smoke test
```

## Mini-games
A *station* (furniture with `behaviour: 'station'` and a `game`) launches a mini-game as an overlay (`src/scenes/minigames/`); its result (coins, items, a shirt design, a sculpted toy) comes back to `RoomScene.onGameResult`. Register a game in `data/minigames.js` and `main.js` (a test checks every game has a scene). Rules live in pure modules (`systems/fishing.js`, `arcade.js`, `camp.js`) so they're unit-tested; the scenes only draw.
Games: Fishing (dock), Star Catcher (TV), Shirt Factory (sewing machine), Toy Workshop (clay table), Marshmallows (campfire). The Post Office's mailboxes post any item to another building (`systems/mail.js`).

## Adding things
- **Item:** add an entry to `CATALOG` in `data/items.js`, draw it in `data/itemart.js` (a function of the ink pen, 128px box, standing on y≈118), then list its key on a shelf in `data/rooms.js`. A test checks every item has art.
- **Furniture:** add a type to `PROP_TYPES` in `data/props.js` (`name`, `mount`, `behaviour`, size, `draw`; storage also needs `slots`). It appears in the catalogue automatically; list it in a room's `props` to have it there from the start.
- **Recipe:** add to `RECIPES` in `data/recipes.js` (1–3 ingredients, any order; ingredients and result must exist in `CATALOG`). It shows up in the recipe book automatically; the tests check that it's cookable.
- **Item combo** (drop one item on another): `COMBOS` in the same file.
- **Room:** add an entry to `ROOMS` (`label`, `map` spot, `shelves`, `props`, `draw(g)`) and to `ROOM_ORDER`; it appears on the map automatically.
- **Premium shop item:** add it to `CATALOG`, give it a price in `PREMIUM` (`data/economy.js`) and put it on a shop shelf.
- **Pet:** add an entry to `PETS` in `data/pets.js` (emoji + the sfx it makes); the basket hands it out.
- **Hair style / palette colour:** `HAIR_STYLES` and the colour lists in `data/look.js`.
- **Face or food reaction:** `EXPRESSIONS` / `REACTIONS` in `data/expressions.js`, then `reaction: '...'` on a food in `CATALOG`.

Saves are versioned (`SAVE_VERSION`); add a step to `migrate()` in `systems/save.js` when the shape changes.

`window.__toybox` is the Phaser game, for poking around from the console (`__toybox.scene.getScene('Room')`).

## Notes
- Emoji use the Noto Color Emoji web font (loaded in `index.html`) so they look the same on every device; offline it falls back to the system emoji.
- One finger at a time on touch screens (`activePointers: 1`); the page asks phones held upright to rotate.
- If the game doesn't start, the page says why after a few seconds (offline, opened from a file, or an error).
