# Arcade → casino, and the kid coin economy — spec

Version: 1.0 · Status: ready (Part A2 is held until the user confirms) · 2026-11-10 · owner: designer · builder: developer
Decided with the user (2026-11-10): **same building, mode reskin** (the arcade lot is the casino in hard mode); v1 games are **slots and
blackjack-style cards**; gambling comes with a **habit risk**, is **gated by a setup toggle**, uses **fictional chips and cash only**, and
losing can lead to **casino debt and collectors**. Numbers marked *(balance)* are first guesses.

## Part A — Kid mode: the arcade as the coin earner

Kid mode never gambles and never loses coins. This part is the "tighter coin economy" the user asked for earlier.

A1. **Arcade pays.** Each cartridge in `ARCADE_GAMES` (Star Catcher, Bubble Pop, Memory Match, Hopper) ends with a result of **1–8 coins**
    (score bands: 0–2 → 1, 3–5 → 2, 6–9 → 4, 10+ → 6, perfect/new best +2). A play takes about 40–60 s.
A2. **Passive earning slows.** `COIN_RULES` cooldowns grow ×10 (eat 30 s, hug 60 s, mail 30 s, play 50 s); `pickup` stays. `cook` 2 and
    `discover` 5 and `combo` 3 stay (they are real discoveries).
A3. **Target feel:** a first premium pet (6 coins) is about 3 arcade plays; the whole premium list (about 120 coins) is a few evenings.
    No coin is ever taken away; nothing blocks play.
A4. **Needs the user's nod:** A2 is the only change that alters what a child sees in an existing save. Ship A1 first; A2 only after the user
    confirms in the room.
A5. **Acceptance:** unit tests for the score→coin table; `earnAmount` cooldown values; a kid save with coins loads unchanged; e2e: play one
    cartridge, coins rise by 1–8.

## Part B — Hard mode: the casino

### B1. Behaviour
1. In hard mode the arcade lot (`arcade`) is **Lucky Star Casino** (same building and lot, new name/sign, moodier ink palette and a worn
   carpet/neon-tube look; no gradients). Kid cabinets are replaced by 4 slot machines, 2 card tables, a **cashier cage** and a **pit boss** (a
   named adult NPC, abstract; see B7).
2. **Hours:** 18:00–04:00. Closed signs say "Opens 18:00". Entry needs an **adult** only (all hard-mode characters are).
3. **Chips:** the cage swaps cash ↔ chips at **1 chip = $100**, both ways, no fee. Chips are an item type in the person's wallet (not bag slots); chips you walk out with are cash on the way out, automatically, at 1:1.
4. **Time passes:** a slot spin costs 1 game minute, a blackjack hand 3. Playing drains energy/hunger as sitting (`sit` rates) and mood moves by luck (B4).
5. Tapping a machine/table opens a bet picker: **1, 2, 5, 10, 25 chips** (slots), **1, 5, 10, 25, 50** (cards). Max bet per person is the lower of
   their chips and the table limit.

### B2. Slots (`systems/hard/slots.js`, pure)
The reels are for show; the **outcome is drawn first** from this table (seeded RNG, injectable for tests), then three reels are drawn to match it
(a loss must never show three matching symbols; a win shows the matching symbol set for its row). Net return to player for a bet of `b`:

| Outcome | Chance | Pays (× bet, stake included) | Symbols shown |
|---|---|---|---|
| No win | 0.66036 | 0 | mixed, no pair line |
| Match small | 0.18 | 1 | cherry-pair |
| Two-for-one | 0.10 | 2 | bar-bar |
| Five | 0.04 | 5 | star-star-star |
| Ten | 0.015 | 10 | bell ×3 |
| Twenty-five | 0.004 | 25 | clover ×3 |
| Hundred | 0.0006 | 100 | seven ×3 |
| Jackpot | 0.00004 | 500 | crown ×3 |

Chances sum to 1.0; **return to player = 0.91** (house edge 9%). A test recomputes both from the table. Symbols are drawn as inked doodles
(`data/ink.js` helpers), no emoji. Squash/stretch on the lever and a reel wobble on stop; win = a small coin-spill, no gloss.
Big wins (≥25×) fire the existing toast and a +mood.

### B3. Blackjack-style cards (`systems/hard/cards.js`, pure)
- Cartoon deck: four inked **suits** (acorn, moon, wave, flame) × 13 ranks, **4-deck shoe**, reshuffled at 25% left. Art in ink, not a real-brand deck.
- Rules: 21 beats the dealer; face cards 10; ace 1/11; dealer **stands on all 17**; natural pays **3:2**; **double** on any first two cards;
  **no split, no insurance, no surrender** in v1; a push returns the bet; hit/stand/double buttons with squash.
- **Test:** a seeded simulation of 200,000 hands with a basic hit/stand/double bot must show a player return between **96.5% and 99.5%**.
- The dealer is shown as a cartoon pair of hands and a chip tray; the pit boss watches (B7).

### B4. Gambling habit ("tilt", `systems/hard/gambling.js`, saved `hard.gamble[personId]`)
A 0–100 **habit** meter per person, shown in the name chip like the substance hook (a small inked die icon, no emoji) once ≥ 15.
- **Raises:** +1 per 10 chips lost in a session; +4 when a session passes a net loss of 50 chips; +6 when the person bets again within 30 game minutes of a loss ≥ 10 chips ("chasing"); +2 on a big win (the thrill).
- **Falls:** −3 per day without gambling; −10 for each day spent sleeping at home after a loss day; −20 from a recovery action (B6).
- **Effects (≥ 30 "chasing"):** the game offers "one more" prompts; mood −6 on leaving down; skipping a job shift to play has a 25% chance per shift day at ≥ 50.
  **(≥ 60 "hooked"):** mood and energy drain while away from the tables (as `habit.js`); bets under 5 chips feel "flat" (mood −2 per spin).
  **(≥ 85 "dependent"):** a rough day without playing (mood −12), like the substance habit.
- Free will: a hooked person with chips or cash and the casino open will try to go there when idle, after needs (below 30), before sitting.
- Honest by design: the meter is visible; the game never hides the 91% return (the cage has a sign "Return to player: 91%").

### B5. Markers, debt and collectors
- **Markers** (casino credit): at the cage, if the person has paid a previous marker back in full, they may borrow chips up to **marker limit = 10 chips × credit-score tier** (tier 1–6 from `credit.js`; new players get tier 2 → 20 chips, $2000)  *(balance)*.
- A marker is **due in 7 days**; interest is **+20% per week** after that. It is an entry in the existing bills/debt flow (kind `marker`), not a card.
- **Unpaid after 7 days past due:** the **collector** event: a named adult NPC (abstract, cartoon, no violence) shows up when the person is at home or in town:
  warning (a note and −10 mood) → **takes 50% of cash on hand** → takes carried product and stash from home (feeds heat/police via `police.js` if
  the "Police and crime" toggle is on) → the debt is sold on and becomes ordinary **old debt** (existing `DEBT_PAYMENT`, credit score −60).
  With the "Violence" toggle on there is a **slapstick scuffle stub** (stars, a bruise tag for 2 days) *once slice 8 exists*; until then the collector only takes things. No gore in any case.
- Casino ban: a person with unpaid markers cannot play on credit; a person who owes more than 50 chips is refused tables until they pay.

### B6. Recovery
- **Self-exclusion** at the cage (free): banned from the casino for 7/28/90 days; the habit falls 2×/day faster while excluded. Breaking it is not possible in v1 (the door says no).
- **Support group** (a Tuesday/Thursday 19:00 meeting at the Shelter, 2 h, free): −20 habit, +mood. Needs a venue prop (Shelter, `support` prop). Same venue will serve addiction recovery later.
- Both only appear when the "Gambling" toggle is on.

### B7. Setup toggle and the people
- Add a setup toggle **`gambling`** (default **on** for new hard games, like the others; labelled "Gambling and casino debt"). Off: the casino lot stays the **old arcade** with its cartridges, but they pay nothing (they are mood-only: +3 mood per 10-min play), there is no chip cage, marker, collector or habit. The toggle is read at setup and in the PIN-guarded settings (same as `substances`).
- Adults-only wording for the setup screen: plain, says it simulates losing money and developing a habit, that it uses invented chips and no real-money features, not for children.
- **Pit boss** `Vera Lund` (cage/pit boss, polite, reads people), **Collector** `Mr Quill` (shown on screen only as "someone from the cage"). Both are placeholders for slice 7's citizen roster; keep them in `data/hard/casino.js`.
- All characters are adults; fictional brand names; no real casino/game licences or brands.

### B8. Data and save
`data/hard/casino.js`: `CHIP = 100`, `HOURS = [[18, 28]]` (18:00–04:00 as a wrap), `BETS`, `SLOT_TABLE`, `CARD_RULES`, `MARKER`, `HABIT` tuning, `PEOPLE`.
Save: new `SAVE_VERSION`; `migrate()` adds `hard.gamble = {}`, `hard.markers = []`, `hard.setup.toggles.gambling = true`. Kid saves untouched.
Code paths behind `scene.hard && toggles.gambling`. Lot `arcade` keeps its id; only its hard-mode label/art/props change. Coins in kid saves are not touched.

### B9. Out of scope (v1)
Roulette, poker, craps, split/insurance, a rigged back-room game against named people, jackpot linking between machines, a loyalty card, comps,
online/phone betting, owning the casino, sports betting, any real-money or real-brand feature, loan-shark violence before slice 8.

### B10. Acceptance checks
Unit tests:
1. Slot table: chances sum to 1 (±1e-9), return = 0.91 (±0.0005); 1,000,000 seeded spins land within ±2.5% of 0.91; a "no win" outcome never shows a winning symbol set; a "win" row always does.
2. Cards: a natural pays 3:2, push returns the bet, double doubles the stake, the dealer stands on 17; 200,000-hand basic-strategy simulation returns 96.5–99.5%.
3. Chips: cash↔chips round trip is lossless at $100; walking out converts the remainder; you cannot bet more than you hold or above the table limit.
4. Habit: each raise/fall rule in B4 on a scripted session; thresholds 15/30/60/85 set the right effects; a day without play eases the meter.
5. Marker: limit from credit tier; interest after due; the collector steps (warn → take 50% → take stash → old debt) occur in order and only after the stated days; paying in full clears it and the credit hit.
6. Toggle: with `gambling` off the arcade pays no coins/cash, has no cage, and no habit is ever created; a kid save never gets any of this.
7. Hours: closed outside 18:00–04:00, including the midnight wrap.
8. Migration: a pre-casino hard save loads with empty `gamble` and `markers`; kid save unchanged.
E2E (hard mode): at 20:00 enter the casino, buy 10 chips, play 5 spins and one hand, cash out, assert cash change equals chip delta × 100; run once with the toggle off and see the arcade.
Done when all pass plus screenshots of: the casino room, the slot machine mid-spin, a blackjack table, the cage's "Return to player: 91%" sign, the habit chip on a person. The developer lists what they could not verify (real touch, sound, other devices).
