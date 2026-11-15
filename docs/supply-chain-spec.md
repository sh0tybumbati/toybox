# Supply chains — wholesale legal goods (first build)

Version: 1.0 · Status: ready (the walk-in cap in section 3 awaits the user's OK) · 2026-11-10 · owner: designer · builder: developer
Decided with the user (2026-11-10): **wholesale legal goods first**. Farm and workshop output sells to shops through supplier contracts; the
dark trade (stash houses, hired street sellers, rival crews, territory) is **not** in this spec but must be able to reuse its pipeline model.
Numbers marked *(balance)* are first guesses. This spec **changes one rule in the built business model** (see 4, "walk-in cap").

## 1. Player-facing behaviour
1. A **Farm** or **Workshop** you own now makes **goods**, counted in **loads**, and keeps them in its **store** (a number of loads, capacity 20).
2. The Business screen gets a **Trade** tab: goods in store, open contracts, offers from buyers, and a delivery log.
3. **Buyers** are the town's own shops (Corner Shop, Supermarket, Post Office gift stand, Furniture Store, Garden Centre) plus **your own Shop business**.
   Each buyer posts at most one **offer** per good it wants, refreshed each Monday.
4. An offer says: good, loads per week, price per load, delivery day, length (4 weeks), the penalty for a miss, and the **supplier rank** needed.
   Accept it and it becomes a **contract**. You can hold up to **4 contracts** at once, at most 2 per buyer.
5. Each delivery day the contract's loads leave the store **by courier** (the Post Office service: 8% of the load value, arrives the next morning) and the
   money goes into the business till when they arrive. Not enough in store → a **short delivery**: you are paid only for what went, and a **penalty** applies.
6. **Supplier rank** (0–3 per buyer: *Unknown, Listed, Trusted, Preferred*) rises with on-time, full deliveries (+1 per 4 clean deliveries) and
   falls with shorts (−1 per short, never below 0). Higher rank unlocks bigger offers and a better price (see 6).
7. Selling in **walk-in** channel (existing business model) still works for what contracts do not take. **No new needs, no new time sink for the player**:
   the whole chain runs from the Business screen and the daily tick; the player can still work shifts and set prices as today.

## 2. Goods, loads and spoilage (`data/hard/goods.js`)
One **load** = goods worth **$1000 at the going retail rate**. This keeps the existing business `base`, `cogs` and till numbers untouched.

| Producer | Goods | Category | Keeps (days) | Face price/load |
|---|---|---|---|---|
| Farm | carrot, tomato, potato, berry, corn (the legal `CROPS`) | produce | = `SHELF_LIFE` of the crop (corn 6, tomato 5, potato 14, carrot 10, berry 5*) | 1000 |
| Farm | eggs, milk (needs "Livestock" fit-out add-on; **out of scope**, listed so the data can grow) | produce | 14 / 5 | 1000 |
| Workshop | clothes, toys, furniture | made | never | 1000 (toys 1000, clothes 1100, furniture 1500) |

\*berry has no shelf life in `food.js`; set `berry: 5` in `SHELF_LIFE` (data change for the developer).
- A farm picks its **crop focus** (one good) and a workshop its **line** (one good); changing it costs a day of lost output.
- **Output** per day = capacity (0–1.3, existing) × **7 loads** for a farm, × **5 loads** for a workshop *(these match the existing `base` / face value; balance)*.
- **Quality** 0–100 per load: `35 + staff-skill-average × 0.4 + (focus bonus 10 if the same good was made 7 days in a row)`; owner shift adds +5. Quality ≥ 70 earns **+10%** on contract price; < 40 earns −15%; and a buyer with a stated floor (see 3) refuses it.
- **Spoilage:** each day produce in store older than its shelf life is **lost** (a message in the log). Made goods do not spoil. Store over capacity: the oldest is lost.

## 3. Offers (`systems/hard/trade.js`, pure and tested; data in `data/hard/trade.js`)
- **Buyer demand** `BUYERS[buildingId] = { wants: { good: { loads, floor? } }, ranks }`. Starting values *(balance)*:

| Buyer | Wants (loads/week) | Quality floor |
|---|---|---|
| Corner Shop | carrot 2, tomato 2, potato 2 | 40 |
| Supermarket | all five crops, 4 each | 50 |
| Post Office stand | toys 1 | 40 |
| Furniture Store | furniture 2 | 55 |
| Garden Centre | berry 1, corn 1 | 40 |
| Your Shop (internal) | whatever you set; at most its weekly sales | — |

- **Price per load** = face × price index; **price index** = `0.78 + 0.07 × rank` (rank 0 → 0.78, rank 3 → 0.99) × the **market factor** for the week.
  Market factor = 0.9–1.1, drawn deterministically from the day (`hash01`), and a **glut** (all players supply the same good) is not modelled.
- **Offer size** by rank: rank 0 → 1× the weekly wants, rank 1 → 1.5×, 2 → 2×, 3 → 3×.
- **Penalty** for a short = 20% of the unpaid shortfall's value, taken from the till (or from cash if empty).
- **Internal contract** with your own Shop: price index **0.60**, **no courier fee**, same-day delivery; it replaces the Shop's stock cost (cogs 60%→ the shop pays this to your producer's till). No rank, no penalty, can be set to any loads/week up to what the Shop sells.
- **Walk-in cap (change to the built model):** walk-in takings can only absorb **60% of the day's output** in loads; the rest is stored (made goods) or spoils (produce) unless it is contracted. Today a producer sells everything walk-in: adjust the farm's
  and workshop's day tick to `walkinLoads = min(output + store, 0.6 × output)`, keep existing takings maths per load sold, and show the
  cap on the Business screen ("Walk-in customers will take about 4 loads a day"). **A save made before this** keeps its day tick unchanged until the player opens the Trade tab for the first time (flag `bizv`).
- Expected shape *(balance)*: a full farm (7 loads) makes about **5000/day** both ways, so contracts do not beat walk-in by themselves; they win by being **steady while you are away**, by using
  quality and rank for +10–15%, and by letting you run two producers feeding a Shop for a big saving (the internal contract cuts the Shop's stock bill without a till visit).

## 4. Delivery
- Courier: 8% of the load value, 1 game-day lag, never lost. If the buyer's building is closed (day off) they still take it; delivery times are not modelled.
- Delivery day is a weekday chosen by the buyer; the **van leaves at 06:00**. If the player is mid-shift at the producer it still goes.
- The log shows: sent, arrived, paid, short, penalty, spoiled.

## 5. Data model (`hard.biz[lotId]` gains)
```
store: [{ good, qty, quality, day }],          // oldest first
focus: 'carrot' | 'furniture' | ...,
contracts: [{ id, buyer, good, loads, price, day, weeks, left, penalty, delivered, shorts }],
offers: { buyerId: [{ id, good, loads, price, day, weeks, rank }] },   // refreshed Mondays
rank: { buyerId: 0..3 },  clean: { buyerId: n },
log: [last 40 entries]
```
Pure functions: `makeOffers(day, ranks)`, `produce(biz, day)`, `spoil(store, day)`, `deliver(biz, contract, day)`, `priceIndex(rank, factor)`, `quality(staffSkills, streak, shift)`.
**Pipeline model for later reuse:** a unit of goods is `{ good, qty, quality, day, legal: true, at: 'store'|'van'|'shelf' }`; the five stages **source → process → pack → move → sell**
map to *grow/make → (lab bench, later) → load → courier/van → buyer/customer*. The dark trade will add `legal: false`, heat, stash locations and hired sellers using the same shape; v1 only builds the legal side.

## 6. Save and rules
- New `SAVE_VERSION`; `migrate()` adds the empty fields above to every business; existing farms/workshops get `focus` set to their first legal crop / toys. Kid saves untouched; code behind `scene.hard`.
- Everything is data: `GOODS`, `BUYERS`, `PRICE_STEP = 0.07`, `WALKIN_CAP = 0.6`, `COURIER = 0.08`, `PENALTY = 0.2`, `MAX_CONTRACTS = 4`, `CLEAN_FOR_RANK = 4`.

## 7. Out of scope (v1)
Livestock; buying inputs for a workshop (materials remain the abstract 45% cogs); the farm feeding the Supermarket's retail shelf stock directly
(the NPC shops' weekly van is not changed: a contract is paid extra stock that the shop adds on the shelf the day it arrives, as +6 per load for display only);
a van you own; storage buildings; selling a business; hiring a manager; price fluctuation by supply; player-set offers; the dark trade; named buyers.

## 8. Acceptance checks (developer-testable)
Unit tests:
1. `GOODS`: every crop is a real `CROPS` id with a shelf life; every buyer wants only goods some producer can make; load face value is 1000.
2. `produce`: output = capacity × 7 (farm) / 5 (workshop); quality formula matches, with streak and shift bonuses; capacity cap 1.3.
3. `spoil`: produce older than its shelf life is removed with a log entry; made goods never are; over-capacity drops the oldest.
4. `priceIndex`: rank 0→0.78 … 3→0.99 (×market factor in 0.9–1.1); quality ≥ 70 +10%, < 40 −15%; below a buyer's floor the load is refused and counted short.
5. `deliver`: full delivery pays loads × price − 8% courier; a short pays only what went and applies the 20% penalty; rank rises after 4 clean deliveries and falls on a short, never below 0 or above 3.
6. Offers: at most 4 contracts and 2 per buyer; offer size by rank; offers refresh on Mondays only; deterministic from the day.
7. Internal contract: price index 0.60, no courier fee, same-day, capped by Shop sales; a Shop with an internal supply pays its producer's till instead of the abstract stock cost.
8. Walk-in cap: a farm with no contracts at capacity 1.0 sells 4.2 loads walk-in and stores or spoils the rest; a save with `bizv` unset keeps the old behaviour until the Trade tab is opened.
9. Migration: pre-chain hard saves load with the new fields; kid saves unchanged.
E2E (hard mode, a scenario with money for a farm): buy a farm lot, set a crop focus, accept the Corner Shop's offer, advance to the delivery day, assert the till rises by about loads × price × 0.92, and see the delivery log.
Done when all pass plus screenshots of the Trade tab (store, offers, contracts, log) and the walk-in cap line; the developer lists what could not be verified (real touch, sound, other devices).

## 9. Open for the user later
Whether the farm should feed the NPC shops' visible shelf stock; livestock and the Livestock add-on; whether the dark trade reuses the same Trade tab or gets its own screen; named buyers from the citizens slice.
