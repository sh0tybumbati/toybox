# Hardcore mode — design

A hidden, adults-only mode of Toybox: the same world, rooms, buildings, items, mini-games and art, but run as a
survival-capitalism life sim (Sims × Schedule 1). **Child mode stays the default and stays exactly as it is.**
This document is the plan; nothing here is built yet.

## 0. Decisions so far (user, 2026-11-08)

- **Clock:** 1 real minute = 1 game hour (a day = 24 real minutes), like The Sims.
- **Money:** coins <-> cash is **two-way at 1 coin = 100 cash** (cash is the smaller denomination).
- **Failure:** chosen **per save** at unlock: *Soft* (debt + recovery path) or *True hard* (permadeath, and true homelessness:
  you can lose everything and work up from sleeping in parks).
- **Police:** **full escalation** - patrols, wanted levels, witnesses, evidence, arrest/jail as scheduled time, trials, fines, bribes,
  corrupt vs honest officers, raids.
- **Combat:** **side-view brawler** in the rooms (punch, dodge, grab, throw; item physics become weapons).
- **Household:** **one shared household** (up to 6 people, shared cash) for now.
- **Starts:** **pick a scenario** (flat, park with nothing, inherited house with debts...).
- **Citizens:** **full factions** - schedule-driven named NPCs plus gangs, rival crews, territory, a changing town.
- **Tone:** **cartoon ink, no gore** - slapstick-scale injuries (stars, bruises, knock-outs), dark themes, soft visuals.
- **Survival:** **full survival** - weather and seasons, safe places to sleep, being moved on, theft, begging, scavenging, health.
- **Trade:** **supply chain** in the fictional plants (grow, process, package, stash, distribute, suppliers, customers, debts, rivals).

Consequences: sections 3.7/3.8 grow into their own systems (see 3.9-3.13 below); the build order in section 6 is re-cut for them.

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

1. **Mode + clock + cash:** the flag, hidden unlock + PIN, `hard` save block, game clock driving day/night, cash chip,
   coins→cash bank. *(no needs yet)*
2. **Needs + food stock:** hunger/energy/hygiene, nutrition and spoilage, finite shop stock, pantry/fridge stock.
3. **Bills + mail + home costs:** bills in the mailbox, rent, power, late fees, recovery path.
4. **Wear + maintenance:** wear model, peeling/wear visuals, repair/repaint with supplies and time.
5. **Jobs:** job board, shifts as scheduled blocks, tardiness, cashier and one more career, skills.
6. **Making and selling:** quality model, market demand, gadget bench, stalls.
7. **Growing:** plots, crop data, legal crops, then the fictional restricted line with heat/inspection.
8. **Cars and the garage**, careers 3+, balance pass and a "does a normal week survive" simulation test.

## 7. Open questions still to settle
Asked in conversation; answers get folded into section 0. (Pending: combat depth and weapons, how factions and territory work on the
map, scenario list, the legal-career ladder vs crime balance, multiplayer/sharing, accessibility and content-warning wording.)
