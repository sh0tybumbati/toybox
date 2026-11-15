# Wear and maintenance (slice 4)

Version: 1.0 · Status: ready · 2026-11-10 · owner: designer · builder: developer
Decided with the user (2026-11-10): first build covers **furniture, room looks (paint and floors) and clothes**; **cars and the garage are
out**. Repairs are **cheap do-it-yourself first**, with a tradesperson as the faster, dearer option. The *Inherited house* starts
**run-down but livable**. Hard mode only; kid mode has no wear and must not change. Numbers marked *(balance)* are first guesses.

## 1. Player-facing behaviour
1. Things you **own** and use wear down over game time. A thing's **wear** is 0–100%. Its **condition** has four steps, shown on the item and in the tap menu:

| Condition | Wear | What the player sees | What it does |
|---|---|---|---|
| Good | 0–39 | clean ink | works normally |
| Worn | 40–69 | extra scuffs, a slightly more crooked outline | works normally; counts against comfort |
| Shabby | 70–99 | cracked-line overlay, dull colours, a small "needs fixing" tag | works, but 25% of uses fail (nothing happens, 5 min lost) |
| Broken | 100 | slumped, tilted drawing and a "broken" tag | cannot be used (a broken fridge no longer doubles shelf life; a broken shower washes nothing; a broken bed gives floor-sleep rest) |

2. **Repair** from the item's tap menu. Options for furniture: **Fix it yourself** or **Call a tradesperson**, or **Replace** (buy new). See 4.
3. **Room looks** (walls and floor) wear separately. Tapping a room's decorate/maintenance control shows "Walls: Worn · Floor: Good" and offers **Repaint** and **Re-lay floor** (using the existing decorate flow for the colours).
4. **Comfort** (0–100, shown on the home's info line): the average of the room's walls, floor and its furniture's condition, where Good = 100, Worn = 65, Shabby = 30, Broken = 0.
   Effect at home (awake or asleep, own or rented): comfort below 40 → mood −1/h; 40–69 → no effect; 70+ → mood +0.5/h while resting (sit or sleep).
5. **Clothes:** each person wears one **outfit** with its own wear and a **dirty** flag. See 6.
6. **Rented homes:** the landlord owns the fixtures that came with the home, so those do **not** wear for you. Furniture you bought and brought wears normally. Painting a rented place is not allowed (as today).
7. **The player is never softlocked:** a broken fridge, bed or shower can always be replaced for cash, and in the worst case the shelter and the park fountain still work.

## 2. How fast things wear *(balance)*
Wear is added at the end of each game day (a per-day amount) and per use. 1 use = one completed action on that item.

| Class | Items | Per day | Per use |
|---|---|---|---|
| Appliance | fridge, oven, shower, computer, TV | 0.4% | 0.5% |
| Seat / bed | sofa, chairs, beds | 0.3% | 0.4% |
| Storage / decor | wardrobe, shelves, tables, plants in pots | 0.1% | 0 |
| Garden gear | garden beds, grow gear | 0.2% | 0.3% |
| Walls | each room | 0.15% | 0 |
| Floor | each room | 0.15% | +0.02% per person-hour walking in it |

Examples: a fridge in a flat with 6 uses a day breaks in about 130 days from new (≈ 4.5 game months); a bed slept in nightly lasts about 250 days; walls last about 660 days. A **leaking roof** (only the *Inherited house*, see 7) adds 0.6%/day to walls and floor of the affected room until fixed.
**Seasons:** rainy or snowy days add +0.05% to walls and floor of any room with a leak or an open-air connection; no other weather effect in v1.
**Away time:** wear only moves while the game clock runs (as for everything else).

## 3. Repairing furniture and fixtures
| Option | Cost (share of the item's cash price) | Time | Result |
|---|---|---|---|
| Fix it yourself | **20%** of price | **60 min** of game time, the person is busy | wear to **15%**, but each earlier repair adds +5% (cap 40%) |
| Tradesperson | **35%** of price | arrives **next morning 09:00**; no time spent | same result as DIY, and −5% extra wear removed |
| Replace | **100%** of price (the furniture store) | 15 min to place | new, wear 0%, repair count reset |
| Scrap | 0 (get back 5% of price if Broken) | 5 min | item removed |

- Parts are bought with the repair: no separate shopping trip. If the person has a **trades career at rung 2 or higher** (Apprentice and up), DIY is **−25% cost and half the time**; rung 3+ also repairs *other* people's items (landlord repairs) for a −25% cost. This links to the careers slice but only reads the career rung; if careers is not present, use no discount.
- **Appliance spoilage rule:** a Broken fridge removes the fridge's shelf-life doubling for food stored in it from the day it breaks.
- The item's **price** is its current cash price at the furniture store; if the store has no price for an item, use $1500. Data: one table of price share per class is enough.

## 4. Repainting and floors
| Job | Cost | Time | Result |
|---|---|---|---|
| Repaint walls (one room) | **$400** | 3 h | walls wear 0 |
| Re-lay floor (one room) | **$600** | 5 h | floor wear 0 |
| Same, by a tradesperson | ×1.8 cost | next morning, no time | same |
- Done from the room's decorate control (existing colour picker). Changing colours without fresh paint costs nothing in kid mode and **needs the repaint** in hard mode; a colour change on Good/Worn walls with no repaint is not allowed (the picker says "needs paint").
- Out of scope: wallpaper patterns by wear, partial repaints.

## 5. Dirt, mess and hygiene of the home
Not in v1. (A "dirty" home, cleaning chores and pests are a later slice; do not add them to wear.)

## 6. Clothes
| Thing | Rule |
|---|---|
| Wear | +0.8%/day while worn, +0.3% per work shift or day-labour gig, +0.5% per night slept outside or per scavenge action |
| Dirty flag | set after 3 days since the last wash, or after any scavenge, day-labour gig or night outside; cleared by **Wash clothes** (any washing machine prop or any shower: 40 min, uses the same wear class as the shower, adds +0.2% wear) |
| Shabby (70+) | mood −2 while worn; hiring checks fail for **retail rung 2+ and all public service** ("Come back in decent clothes"); work performance −10% |
| Worn (40–69) | no effect except the Worn drawing (patches) |
| Patch | at the Shirt Factory: **$200**, 30 min, wear to 30% (max 2 patches per outfit, then must be replaced) |
| New outfit | Supermarket clothes rack, **$1200**, wear 0, dirty 0; the existing shirt/design choices still apply |
- Dirty clothes also fail the hiring hygiene check already described in careers-spec (hygiene < 40 *or* dirty).
- If a person has **no clothes** (rare) they are treated as Shabby and dirty, and the shelter hands out a **free basic outfit** once per 14 days (wear 50%).

## 7. Scenarios (starting states)
Generated deterministically from a fixed per-scenario seed, so tests can assert them.

| Scenario | Furniture wear | Walls / floor | Specials |
|---|---|---|---|
| Park bench | none owned | n/a | clothes wear 55%, dirty |
| Cheap flat (rented) | landlord's fixtures do not wear; own bought items 20–45% | landlord's | the **fridge is yours at 85%** (a first-week decision: DIY repair at 20% of its price, or replace, see 3) |
| Inherited house (owned, debts) | average **60%**: 3 items ≥ 90% (fridge, oven, one bed), the rest 40–75% | walls 70%, floor 65% | a **leaking roof** in one room (see 2); comfort starts about 30, so mood drops at home until the player fixes things |
| Just out of jail (when built) | as Cheap flat | — | clothes 70%, dirty |
- Inherited house targets: a thrifty player can lift comfort above 40 in the first 7 days for about **$5000** of DIY parts plus 6–8 game hours; reaching 70+ takes about $15,000 and most of the first month. The leaking roof repair is a **one-off $3000 DIY (4 h)** or $5000 tradesperson.
- Existing saves from before this slice: homes start at **wear 10–20%** (seeded), clothes at 20%, nothing near breaking, so nobody loses their home or fridge to a patch.

## 8. Interactions with other systems
- **Landlord:** the existing repair requests stay. Wear does **not** apply to tenants' homes in v1 (out of scope), but a rental the player owns shows the same condition tags on fixtures when visited.
- **Businesses:** business premises do not wear in v1.
- **Credit/debt, police, customers:** no interaction.
- **Careers:** read-only (repair discounts, shabby clothes block hiring).
- **Weather:** only the leak rule.

## 9. Out of scope (v1)
Cars and garage; dirt and cleaning chores; pests, damp and mould; insurance; furniture resale value; repair mini-games; electricians and plumbers as separate trades;
wear for business premises and for tenants' homes; wallpaper by wear; fire or flood events.

## 10. Acceptance checks
Unit tests (pure):
1. Per-day and per-use wear matches the table for each class; the fridge example (6 uses/day) reaches 100% between day 125 and 135.
2. Condition steps at exactly 40, 70, 100; Shabby fails 25% of uses over a seeded 10,000-use run (±2%); Broken blocks use.
3. Comfort = the stated average and the mood effects at <40, 40–69, 70+.
4. Repair: DIY 20% / 60 min / result 15% + 5% per earlier repair (cap 40%); tradesperson 35% next 09:00; replace 100%; scrap refund 5% if Broken; trades rung 2+ discount and half time.
5. Repaint $400/3 h and floor $600/5 h reset wear to 0; hard-mode colour change needs the repaint.
6. Rented fixtures do not wear for the tenant; owned items do.
7. Clothes: wear and dirty rules; Wash clears dirty, adds 0.2%; Shabby blocks the listed hiring checks and cuts performance 10%; patch caps at 2; free shelter outfit once per 14 days.
8. Scenario starts: the table above (counts, thresholds, the leaking roof) is reproduced from the fixed seed; comfort of the Inherited house starts between 25 and 35.
9. Migration: an older hard save loads with seeded wear 10–20% and clothes 20%, nothing Broken; a kid save has no wear data and unchanged behaviour.
10. Broken fridge ends the shelf-life doubling on that day; replacing it restores it.
E2E (hard mode): start *Inherited house*, open the fridge menu, repair it yourself, assert cash drops by 20% of its price and wear goes to about 15%; screenshot the Worn and Shabby drawings and the comfort line.
Done when all pass plus those screenshots; the developer lists what could not be verified (real touch, sound).

## 11. Open for the user later
Cars and the garage (its own slice); whether messes and cleaning chores should come next; whether tenants' homes should decay once citizens exist.
