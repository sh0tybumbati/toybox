# Hardcore mode — design

A hidden, adults-only mode of Toybox: the same world, rooms, buildings, items, mini-games and art, but run as a
survival-capitalism life sim (Sims × Schedule 1). **Child mode stays the default and stays exactly as it is.**
This document is the plan; nothing here is built yet.

## 0. Decisions (user, 2026-11-08)

**Time and money**
- 1 real minute = 1 game hour (a day = 24 real minutes), like The Sims. **Time pauses when the game is closed** (no offline catch-up).
- Coins <-> cash is two-way at **1 coin = 100 cash** (cash is the smaller denomination).
- One shared **household** (up to 6, shared cash) for now.

**Failure, goals, starts**
- Chosen per save at unlock: *Soft* (debt + recovery path) or *True hard* (permadeath, true homelessness: lose everything, work up from the park).
- **Open sandbox with life goals**: Sims-style aspirations per person (own a home, run a business, kingpin, honest cop, retire) and a legacy score on death/retirement. No fixed ending.
- **Scenarios** to build first: *Park bench, nothing* / *Cheap flat, first job* / *Inherited house, debts* / *Just out of jail*.
- People **age (adult -> older adult -> elder), no children, no births**; new adults join (roommates, partners, friends, recruits). Old age can end a life.

**Characters (content safeguard)**
- Hard mode is **adult-bodied only**: child characters never exist in hard mode. **Separate casts**: the kid-mode cast stays in the kid save;
  hard mode has its own household made in an adult-only creator. Only coins carry over (to cash).

**World**
- A **bigger map with districts** (3-4: park/slums, old town, downtown, docks/industrial; ~40 lots), each with its own rent, police presence, factions, vibe.
- **Full factions**: ~**60 named citizens** with routines and memories, gangs, rival crews, territory; only nearby ones are simulated in detail, the rest abstracted.
- The player is **free**: join a crew, found one, stay civilian, or ally with police/council.
- **Full survival**: weather and seasons, safe places to sleep, being moved on, theft, begging, scavenging, hygiene and health.

**Crime, police, combat, health**
- **Police: full escalation** - patrols, wanted levels, witnesses, evidence, arrest, bribes, corrupt vs honest officers, raids.
- **Justice**: arrest -> choose fight / flee / bribe / surrender; **jail is scheduled time** with prison jobs and contacts; **plea and trial are short
  choice-based events** shaped by lawyer, evidence, reputation.
- **Combat: side-view brawler** in the rooms: melee + improvised weapons (bottles, chairs, bats, bricks via the item physics), **cartoon firearms**
  (stylised, no gore), and **skill-tree fighters** (martial-art styles, combos, gear, training). Police carry batons and tasers.
- **Health**: injuries (bruised, sprained, concussed) heal over days; clinics/hospitals cost money; illness from sleeping rough; medicine.
  **Addiction** to the fictional substances (with a recovery storyline).
- **Tone: cartoon ink, no gore** (stars, bruises, knock-outs, slapstick-scale injuries), dark themes with soft visuals.
- **Content toggles at setup**: granular switches for violence, substances/addiction, police/crime and survival harshness, so someone can play a pure
  economy/survival game without the rest.

**Economy and work**
- **Supply chain** in the fictional plants: grow, process, package, stash, distribute via street sellers, suppliers, customers, debts, rivals.
- **Careers** first: *retail & service*, *trades & makers*, *farming & food*, *public service* (police, paramedic, nurse, council clerk, politician).
- **Business ownership, deep**: buy a lot, fit it out, hire staff from the town, set prices, manage stock/wages/taxes; legit shops can be fronts.

**Control and interface**
- **Sims-style free will plus queued orders**: pick a person and queue actions; the others act on their needs and schedules; pause + 3 speeds.
- A hand-inked **phone** in the HUD (bank, jobs, messages, contacts, map, orders, bills) **plus** walk-in buildings; the phone can be lost, stolen,
  run out of credit, or be tracked by police.

## 1. Principles

1. **One game, one save, a mode flag.** `save.mode: 'kid' | 'hard'` (default `'kid'`). Hard-mode state lives in a
   separate `hard` block of the save, so flipping back to child mode loses nothing and child mode never reads it.
2. **Hidden, deliberate unlock.** No visible menu entry. Tap the version text in the sound/settings panel 7 times →
   an "Adults only" screen (plain wording: what changes, that progress is separate, that it is not for children) →
   confirm. Switching back needs the same confirm. Optional 4-digit PIN so a child cannot flip it (set on first unlock).
3. **Layered, not forked.** Hard mode wraps existing systems with rules (cost, decay, schedules). Child-mode code paths
   keep working; each hard rule is a small module in `src/systems/hard/` behind `if (scene.hard)`.
4. **Data-driven and tested.** Rules live in `src/data/hard/*.js` (prices, careers, crops, bills, wear rates) and pure
   `src/systems/hard/*.js` modules with unit tests, the same split as `systems/market.js` and `systems/cashier.js`.
5. **Fictional substances only.** Restricted crops and products are invented (names, effects, art). No real drugs, no
   real-world production detail; processing is an abstract "recipe" like the oven's.

## 2. What changes between modes

| Thing | Child mode (today) | Hardcore mode |
|---|---|---|
| Money | coins, cosmetic | 🪙 coins stay as the *child* currency; **cash** is the real one. A bank converts coins → cash at a poor, changing rate (a way to carry progress over). |
| Time | free-running, night toggle | game clock, calendar, seasons; night follows the clock |
| Food | endless shelves, free | food is stock: bought, stored, cooked, eaten; hunger is a need |
| Home | everything is free, never wears | rent or mortgage, bills, maintenance decay |
| Items | endless shelves in shops | finite shop stock, restocks daily, prices move |
| Play | mini-games = coins | mini-games = **jobs** (paid, scheduled), plus hobbies that make sellable goods |
| Failure | none | debt, eviction, hunger, illness, fines (never a hard game-over: a "rough patch" recovery path) |

## 3. Systems

### 3.1 Game clock (`systems/hard/clock.js`)
- `clock = { day, minute }`; 1 real second = 1 game minute by default (a day ≈ 24 real minutes; setting for 0.5×–4×).
- Pauses in menus and mini-games (they are scheduled blocks, see jobs). Sleeping fast-forwards.
- Drives `night` (replaces the toggle), shop opening hours, job shifts, bills due dates, crop growth, wear.
- HUD: a clock chip beside the coin chip (shows day, time, next obligation).

### 3.2 Needs (`systems/hard/needs.js`)
- Each character: `hunger`, `energy`, `hygiene`, `mood` (0–100). Decay per game-hour; rates in data.
- **Food is quantified:** each food item gets `nutrition` and `spoils` (hours). A pantry/fridge holds stock;
  the existing recipes become the way to raise nutrition per cash. Eating from a shelf in a shop is stealing.
- Bed restores energy (the bed station already exists), a bath/shower prop restores hygiene, hobbies restore mood.
- Neglect → debuffs (slow walking, jobs fail), never instant death; a free "charity meal" hostel keeps a player alive.

### 3.3 Cash, bank and bills
- `cash` in the `hard` block. A **Bank** building: exchange coins → cash, deposit, loans (interest, due dates).
- **Bills arrive in the mailbox**, reusing `systems/mail.js` (parcels): a `bill:<kind>` key. The home mailbox shows a
  flag; opening mail lists bills with amount and due date. Pay at the bank or the post office counter.
- Kinds: rent/mortgage, power, water, food-shop loyalty card, car insurance, fines. Late = fee, then service cut off
  (lights flicker off = night forced, oven dead), then eviction warning with a recovery path.

### 3.4 Maintenance (`systems/hard/wear.js`)
- Every prop, room look, vehicle and wearable gets `wear` 0–1, rising with game time and use.
  - **Paint / wallpaper / flooring** (`room looks`): wear shows as peeling (a darker wobbly overlay on the ink art)
    and lowers home "comfort"; repaint costs paint (bought supply) and time using the existing Decorate UI.
  - **Furniture:** breaks at 1.0 (a broken fridge spoils food); repair with parts or replace (the furniture store).
  - **Clothes:** wear lowers mood and job performance; wash (hygiene prop) and repair at the shirt factory (the
    shirt designer becomes tailoring: patch, dye).
  - **Cars** (new): a vehicle prop/van with fuel and wear; needed for commutes and deliveries (the delivery van
    becomes yours to run). Garage building with a repair mini-game.
- All wear rates and repair costs in `data/hard/wear.js`.

### 3.5 Jobs and careers (`systems/hard/jobs.js`)
- A **job board** (town hall prop / building) lists careers; each has shifts (start time, length, workplace), pay,
  a skill, and promotion tiers. Examples that reuse what exists:
  - **Cashier** (supermarket): the checkout game is the shift; pay scales with accuracy/speed.
  - **Seamstress / designer** (shirt factory), **toymaker** (workshop), **courier** (post office/van),
    **angler** (pond: sell the catch), **cook** (kitchen), **furniture assembler** (furniture store).
- **Tardiness:** you must be at the workplace at `start`. Late 1–15 game-minutes = docked pay, more = written
  warning; three warnings = fired. Commute time is real (walk across the map, or drive).
- Skills (`cooking`, `crafting`, `charm`, `fitness`, `horticulture`) raise pay and unlock tiers; train via hobbies.
- Shifts are *scheduled blocks*: a shift runs the relevant mini-game(s) in a compressed form, then pays out.

### 3.6 Making and selling goods
- **Paint / sculpt / tinker:** the shirt, toy and (new) gadget workshops produce a unique item with `quality` computed
  from the design (colour balance, part count, neatness) and `skill`. Sold at a market stall / shop buyer;
  price = base × quality × current demand (demand drifts and recovers; flooding the market lowers price).
- **Tinker bench** (new mini-game): wire up small gadgets (match parts to a diagram) → gadgets that sell.
- Saved designs (`shirtDesigns`, `toyDesigns`) become reusable blueprints with a materials cost.

### 3.7 Growing
- **Garden plots** (home yard, park allotments): `plot = { crop, planted, water, health }`; growth by game time,
  watering, weeds, seasons (data: grow hours, yield, sell price).
- **Legal crops:** vegetables and herbs (feed you or sell at the supermarket/farmers market).
- **Restricted crops (fictional):** invented plants — e.g. "dreamvine", "glowcap" — grown in a hidden grow room
  (lights, ventilation, power bill spikes). Processed at a lab bench (abstract recipe: crop + supply → product
  with `potency` and `purity`, invented effect names) and sold only to night-time buyers on the map.
- **Heat:** selling restricted goods raises `heat` (0–100, decays). High heat → inspections (hide stock in
  containers — the new boxes/backpacks — or lose it and pay a fine). Never graphic; art stays in the same cartoon ink.
- All of this is clearly fictional: made-up names, made-up chemistry, no real compounds or methods.

### 3.8 Economy (`systems/hard/market.js`)
- Prices per item follow `base × season × demand × your reputation`; shop stock is finite and restocks overnight.
- Rent, wages and food costs are tuned so a minimum-wage week roughly covers rent + food with nothing to spare.
- Everything priced in one table (`data/hard/prices.js`) with a balance test that checks the survival loop closes.

## 4. Data and save

```
save.mode: 'kid' | 'hard'
save.hard: {
  clock: { day, minute }, cash, debt, loans: [...],
  needs: { [charId]: { hunger, energy, hygiene, mood } },
  skills: { [charId]: { cooking, crafting, charm, fitness, horticulture } },
  job: { career, tier, shiftsLate, warnings } | null,
  bills: [{ kind, amount, due }], mail: [...],
  wear: { [propOrRoomId]: 0..1 }, vehicles: [{ id, fuel, wear }],
  plots: [{ slot, crop, planted, water, health }], stock: { [shopSlot]: { [itemKey]: n } },
  demand: { [goodKey]: 0..2 }, heat, reputation,
}
```
Additive; `SAVE_VERSION` bump with a migration that just adds `mode: 'kid'`. `sanitize` clamps everything like today.

## 5. UI and tone
- Same hand-inked style. Hard mode swaps the cheerful palette accents for slightly muted ones and adds a **status
  strip** (cash, clock, hunger/energy bars, next obligation). Needs have faces: the existing expressions (sleepy,
  hungry, grumpy) map onto them.
- Child-facing content, tips and the creator are unchanged in child mode; hard mode gets its own first-time tips.
- Mature themes (restricted crops) only exist behind the mode flag: not in the catalogue, shops, tips or art atlas
  of child mode, and never reachable from a child-mode save.

## 6. Build order (each slice shippable and tested)

0. **Hard-mode shell (BUILT, 2026-11-08):** the flag, hidden unlock + PIN + setup (failure mode, content toggles, scenario), `hard` save block, adult-only creator,
   separate saves, coins <-> cash at 1:100.
1. **Clock + needs (BUILT, 2026-11-08):** 1 min = 1 hour clock driving day/night, pause + 3 speeds, hunger/energy/hygiene/mood, free-will autonomy and an action queue.
2. **Survival home-less core (BUILT, 2026-11-08):** the *Park bench* scenario: weather/seasons, places to sleep, being moved on, scavenging/begging, shelter, day labour.
3. **Food, shops and bills (BUILT, 2026-11-08):** finite shop stock and prices, pantry/fridge stock and spoilage, rent/bills in the mailbox, the phone.
4. **Wear + maintenance** (paint, floors, furniture, clothes, cars) and the *Cheap flat* + *Inherited house* scenarios.
5. **Jobs:** job board, shifts as scheduled blocks, tardiness, skills, retail/service then trades/makers and farming/food careers.
6. **Making and selling:** quality + demand, gadget bench, stalls, farming plots (legal crops).
7. **Districts + citizens:** bigger scrolling map, 60 named citizens with routines, relationships and memory, abstracted off-screen.
8. **Combat + health:** the side-view brawler, injuries, clinics, addiction hooks; skill trees.
9. **Police + justice:** patrols, wanted levels, witnesses/evidence, arrest, jail as scheduled time, plea/trial, bribes, the *Just out of jail* scenario.
10. **Factions + the fictional trade:** crews, territory, grow/process/package/distribute, suppliers, customers, debts, raids.
11. **Business ownership + public-service careers + life goals/legacy + aging.**
12. **Balance + simulation tests:** "a normal week survives", economy closure, faction stability, performance budget for the NPC population.

### Slice 0 as built
- Two separate saves: kid = IndexedDB key `main`, hard = key `hard`; `metaStore` (localStorage `toybox-meta`) holds the active mode and the PIN hash.
- Hidden unlock: hold the sound button -> Settings -> tap the version text 7 times -> Adults-only gate -> PIN (made on first use) -> setup (failure mode, content toggles, scenario) -> reload into the new game.
- Hard-save block: `hard = { setup, cash, debt, record, fresh }`; characters are forced adult in `sanitize`; the creator is adult-only in hard mode.
- Money: hard mode shows cash; the old coin prices are paid in cash at 1 coin = 100 cash (a stand-in until slice 3). The Bank swaps kid-save coins <-> cash.
- Settings in hard mode has "Back to kid mode" behind the PIN; wiping an adult game returns to the kid world.
- Code: `systems/mode.js`, `data/hard/{scenarios,start}.js`, `scenes/hard/*`, `tests/mode.test.mjs`, `tests/e2e/hard.e2e.mjs`.

### Slice 1 as built
- Clock (`systems/hard/clock.js`): 1 real second = 1 game minute at speed 1 (1 real minute = 1 hour); pause + x1/x3/x6; night is 20:00-06:00 and drives the day/night overlay; the light switch is disabled ("the lights follow the clock").
- Needs (`systems/hard/needs.js`, tuning in `data/hard/needs.js`): hunger -5/h, energy -4/h, hygiene -2.8/h, mood -2/h awake ("tight like the Sims": starving in ~20 h, exhausted in ~25 h); each need below 25 costs mood. Sleeping in a bed +14 energy/h; on the floor (collapse at 0 energy) +6/h with hygiene and mood loss.
- Actions: eat (fridge/pantry; filling by food, `NUTRITION`), sleep (bed), wash (shower; fountain in parks), sit/relax (any seat). Each person has a queue (max 5) and a current action; tapping a piece of furniture opens its action menu; the queue bar of icons sits under the clock (tap an icon to cancel it).
- Free will (`wantsToDo`): an idle person (no queue/goal) waits 10 game minutes, then does the most urgent thing they can (needs below 40/30/30/35). Switch in `hard.autonomy`.
- No coin rewards, no park coins and no mini-game coins in hard mode (money comes from work, later).
- Saved: `hard.clock`, `hard.needs` per person, `hard.autonomy`. Code: `scenes/room/hard.js`, tests `hardclock.test.mjs` and `hard.e2e.mjs`.

### Slice 2 as built
- Seasons: 28 days each (112-day year), weather deterministic from the day (`systems/hard/weather.js`): clear/cloudy/rain/snow and a temperature that follows season, a daily warm/cold spell and the time of day. Rain and snow fall (and the light dulls) in open-air rooms; the HUD shows weather, temperature, season and day.
- **Warmth** is a fifth need: indoors +10/h; outdoors it falls with the cold (0.55 per degree below 16 C), rain (-3) and snow (-4), worse asleep outside; below 25 it drains mood; at 0 you collapse ("frozen") for up to 90 game minutes. Setup toggle "Harsh survival" off = no weather effects and no theft.
- Places to sleep: bed, **shelter cot** (open 17:00-09:00), a bench (sleep rough: +8 energy/h), the floor after a collapse (+6/h). Sleeping rough outside risks being moved on (small hours, public place, "Police and crime" on: -8 mood) and being robbed (10% an hour, 30% of cash; "Harsh survival" on).
- Opening hours (`hours` on props, `openNow`): the shelter meal line (07:00-08:00, 18:00-19:00, free), the day-labour board (06:00-09:00, 4 hours, $1200), cots (evening/night). Closed places say "Closed until HH:00".
- Scavenging bins (dumpsters in the park and behind the shop): scraps (+6..15 hunger, hygiene falls), a little cash ($50-250) or nothing. Begging: a short mini-game (30 s, costs an hour): ask people when the ❗ shows; three annoyed ends it; clean and cheerful earns more.
- **Day labour is a real gig** (changed 2026-11-08 after playtest feedback): the board (06:00-09:00) assigns the day's gig (`data/hard/gigs.js`: unload a delivery at the Corner Shop, sort parcels at the Post Office, haul laundry at the Shelter, move turf in the Park) with a deadline (150 game minutes); you walk there (crossing the city now costs game time, `travelMinutes`: 5-30 min) and at the building's work site you play the crate-stacking game (a three-hour shift). Pay = base x quality (70-130% by performance) x lateness (full on time, 60%-40% when late, nothing if more than two hours late: 'they found someone else'). This is the pattern slice 5's jobs will follow.
- Free will extends to these: hungry + no fridge = the meal line, then (under 15) a bin; tired + no bed = a bench.
- Every scenario's city now has a Shelter; the park has a fountain, a dumpster, a cardboard sign and the labour board.
- Not yet: real police patrols (move-on is a dice roll), health/death (frozen people are rescued after 90 min), clothes warmth, the shelter's bed limit/queue.

### Slice 3 as built
- **Food economy** (`data/hard/food.js`, `systems/hard/{pantry,stock}.js`): cash prices ($50-$220) decoupled from the kid coin prices; shops have finite stock (6 of each, refilled by a weekly van due Monday 07:00 that is usually 0-30 min late, sometimes 1-6 h, now and then 1-2 days: the sign says when it is *due*) and are open 07:00-22:00. Taking an item pays and removes one from stock; dropping a food item on a person puts it in their bag (8); the household larder (fridge + pantry, 24) is filled with the "Put away" action; food spoils (burger 1 day ... rice 90 days; a fridge doubles it), oldest eaten first. Fridge/pantry no longer give free food: the free sources are the shelter meal line and scraps.
- **Housing and bills** (`data/hard/housing.js`, `systems/hard/bills.js`): motel room (weekly, $3200), flat (weekly, $4200 + $700 utilities), house (monthly = 28 days, $24000 mortgage/tax + $5200 utilities). Bills are issued every cycle, due 2-10 days later; 10% is added when late; past the grace days you are evicted (what you owed becomes debt, the home is locked, its furniture is unusable). The motel front desk (08:00-22:00) rents a room: first period paid now. Bills arrive "in the mailbox" (flag goes up, read it by checking mail) and are paid at the post office counter (09:00-17:00), on a computer or on the phone.
- **Phone / computer / newspaper** (`scenes/hard/DeviceScene.js`): the phone (bills, jobs, bank, time) is lost if you are robbed (40%) and is not owned at the *bench* and *jail* starts (a kiosk at the shop sells one for $3500); the computer (at home, and a public one at the post office 09:00-17:00) does bills and jobs; the paper ($80, stand at the shop) shows the day's classifieds (`systems/hard/jobs.js`: 4 of 7 job types, pay varies a little). The ads are informational until slice 5 makes them real jobs.

### Back alley and park fix (2026-11-08)
- Open-air rooms no longer get a wall divider between them (park + playground flow into one another).
- **Back Alley** (hard mode, on every map): a dark brick outdoor room with a bin, a **fire barrel** (Warm up: +96 warmth/hour, beats the worst winter night) and **the contact**, who only shows up 18:00-05:00. For now he sells a burner phone ($1,800, no bills) and three kinds of "fell off a lorry" food at half price (3 each per day). What you do there draws **heat** (0-100, fades 8/day, shown as 🚨 in the HUD). Heat has no consequences yet: the police (slice 9) will read it. The seeds, supplies and buyers of the fictional plants will use this same place (see the flow below).

## 7. Still open
Asked in conversation as we go: faction/territory mechanics on the map, weapons list and skill trees, the legal-career ladder vs crime balance,
the fictional substance catalogue (names, effects, art), district list and look, phone apps, accessibility and content-warning wording, difficulty presets.
