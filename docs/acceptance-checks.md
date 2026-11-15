# Acceptance checks for the built hard-mode slices

Version: 1.0 · Status: ready · 2026-11-10 · owner: designer · for: QA (and the developer)
These are the testable expectations for what is already built. Where the build differs, that is a finding: say whether it is a **bug** (build
does not do what this says) or a **spec problem** (this says something wrong), and I will fix the spec. Numbers are from the "as built" notes
in `docs/hardcore-mode.md`. Time: 1 real second = 1 game minute at speed 1; a day = 24 real minutes; cash is dollars; 1 coin = 100 cash.

## 1. Slice 2: survival (Park bench start)
1. **Start state:** cash 0, no phone, no home, at the Park; needs start hunger 70, energy 80, hygiene 80, warmth 80, mood 70.
2. **Needs drift (awake):** hunger −5/h, energy −4/h, hygiene −2.8/h, mood −2/h; each need under 25 costs 3 mood/h. A person doing nothing starves in about 20 h and is exhausted in about 25 h.
3. **Seasons:** 28 days each, a 112-day year; the same day always gives the same weather (clear, cloudy, rain, snow) and temperature; temperature follows season, a daily warm/cold spell and time of day.
4. **Warmth:** indoors +10/h; outdoors falls by 0.55 per degree under 16 °C, −3 in rain, −4 in snow, worse asleep outside; below 25 it drains mood; at 0 the person collapses ("frozen") for up to 90 game minutes, then is rescued. With the **Harsh survival** switch off, none of this happens.
5. **Sleep places:** bed +14 energy/h; shelter cot +14 (open 17:00-09:00); bench +8/h; floor after collapse +6/h. Rough sleep outside, small hours (00:00-05:00), public place, **Police and crime** on: 25% an hour of being moved on (−8 mood). Theft while asleep outside: 10% an hour, takes 30% of cash, 40% chance the phone goes too (only with **Harsh survival** on and cash > 0).
6. **Opening hours:** meal line 07:00-08:00 and 18:00-19:00 (free); labour board 06:00-09:00; closed places say "Closed until HH:00".
7. **Scavenging:** a bin gives scraps (+6 to +15 hunger, hygiene falls) or $50-250 or nothing. **Begging:** 30 s mini-game, costs an hour, three annoyed ends it.
8. **Day labour:** one gig a day from the board (06:00-09:00). Deadline 150 game minutes to arrive; late is allowed up to 120 more minutes; beyond that the gig is gone. Pay = base × quality (70-130%) × lateness (full on time, 60%-40% late, nothing if >2 h late). Base pay $1100-1300; the work is a 3-hour shift. Crossing the city costs 5-30 game minutes.
9. **Free will:** an idle person waits 10 game minutes, then does the most urgent thing they can (thresholds 40/30/30/35 for eat/sleep/wash/sit); hungry with no fridge uses the meal line, under 15 a bin; tired with no bed uses a bench.
10. **Pause and speed:** pause stops needs and the clock; x1/x3/x6 scale everything equally.
11. **Never softlocked:** with $0 and no home a person can always eat (meal line or bin), sleep (cot or bench), and earn (labour board).

## 2. Slice 3: food, shops, bills
1. **Prices:** cash prices are in the food price table ($5-22 for ingredients); a day's cheap food is about **$20-30**, a week about **$150-250**.
2. **Shops:** open 07:00-22:00; each item starts with 6 in stock; the weekly van is due Monday 07:00 (usually 0-30 min late, sometimes 1-6 h, now and then 1-2 days; the sign shows the *due* time). Taking an item pays and removes one; out of stock cannot be bought.
3. **Larder:** fridge + pantry hold 24; a bag holds 8; "Put away" fills the larder. Food spoils by shelf life (burger 1 day … rice 90 days; a fridge doubles it); oldest is eaten first. Fridges and pantries no longer give free food.
4. **Housing:** motel room weekly $3,200; flat weekly $4,200 + $700 utilities; house every 28 days $24,000 + $5,200 utilities. First period is paid when renting.
5. **Bills:** issued each cycle, due 2-10 days later (motel 2, flat 3, house 10); **+10%** when late; after the grace days (motel 3, flat 4, house 7) the person is **evicted**: the home is locked, its furniture is unusable, what was owed becomes debt. Bills arrive in the mailbox (flag goes up; check mail) and are paid at the post office counter (09:00-17:00), a computer, or the phone.
6. **Phone:** lost in a robbery (40%); not owned at the *bench* and *jail* starts; the kiosk sells one for $3,500; the burner (alley) costs $1,800 and gets no bills. The computer works at home and at the post office (09:00-17:00).
7. **Never softlocked:** an evicted person can still use the shelter and the labour board.

## 3. Economy closure: what "a minimum-wage week" means (§3.8)
Definitions the test must use:
- **Minimum wage week:** five **entry-rung shifts** (rung 1 of any career, after the careers slice; before it, five **day-labour gigs** at the average pay, about $1,200 each = $6,000).
- **Rent:** a flat, $4,200 + $700 utilities = **$4,900** (a motel is $3,200).
- **Food basket:** 3.5 cheap items a day (bread, rice, potato, egg, milk mix), about **$200** a week.
- **Odds and ends:** phone, bus and small repairs, about **$400** a week.
Expected outcome (balance): a minimum-wage week in a flat covers rent + food + odds and ends with **$800-1,500 spare**; in a motel with $2,000-3,000 spare; a **house** cannot be carried at the minimum wage. "Nothing to spare" means the spare is under one extra shift, not a loss.
**Check:** simulate a person for 8 weeks (soft mode) living in a flat on five rung-1 shifts a week with the cheapest sensible diet: cash must never go negative, no bill goes late, no eviction. The same person on **three** shifts a week must go into arrears within 4 weeks. A day-labour-only person doing five gigs a week must cover a motel but not a flat plus a fridge replacement.

## 4. Crime versus jail (plant trade + police)
Built numbers: nightbloom seed $900, yields 3 per plant, 14 days to grow, street value about $1,200 per unit at base potency/purity (scaled by potency and purity); additives amber $200, mint $120, cut $60 (cut doubles units, lowers purity); lawyer $6,000; false-bottom bag $900; hidden safe $3,000; sentences up to 28 days.
**What crime should pay** *(balance)*: a small, careful operation (2 plants in a tent, one batch a fortnight, no additives) nets about **$2,500-3,500 a week** after seed, power and gear amortised once the gear is bought; a bigger one (4-6 plants, cut) up to **$7,000-10,000 a week** but with heat rising 3-4× faster. So crime beats rung 1 pay (6,750/week) only when scaled, and is **worse than a rung 3 job** (12,500/week) once you count risk.
**What jail should cost:** jail days pass for real (bills arrive and go late, a flat is lost after the grace days, the gig lapses). A typical possession charge (1-3 units): 1-2 days; dealing (8+ units or $20k): 12+ days plus a fine of 25% of the value; cultivation +5 days; resisting +3; bribery +2; a record +2; cap 28. Plea = 60% of the days; public defender 20-30% to walk, 140% if lost; lawyer $6,000, +30% to walk.
**Checks:**
1. Expected value test: simulate 12 weeks of the small and large operations with the default police rolls; the small one must end ahead of day labour but behind the best job at rung 3; the large one must have at least a 50% chance of one arrest in 12 weeks.
2. Heat: calm <20, noticed 20-39, watched 40-69, hunted 70+; fades 8 a day; each sale +4; a patrol stop chance rises with heat, ×1.5 carrying, ×1.5 at night.
3. A stop: comply, bribe or run each give the outcomes in the "as built" notes (search finds a carried batch 80%, 35% with the bag; bribe cost $600 + 20% of the load, ×1.5 with a record; run succeeds about 50% minus heat/300).
4. A raid is possible only at heat 40+ with something at home; finds home batches 90% (30% with the safe); plants are always found.
5. Sentencing: reproduce each charge row above exactly; leaving jail: 08:00, record on file, heat 25, at the park.
6. Jail pile-up: serve 14 days from a flat with the rent due on day 3: the person must be evicted after the grace days and come out with debt.
7. District multipliers (after districts-spec): all rates above are for Old Town.

## 5. Careers
Use `docs/careers-spec.md` §9 for the unit-level checks. Scenario-level checks:
1. **Rota:** hire at the entry rung; the phone shows "Next shift: day time, place"; arriving on time starts the shift (work-site prompt spec); pay arrives with the weekly payslip.
2. **Lateness:** 30 min late = 70% pay and 1 strike; 90 min = 40% and 1 strike; 130 min or no show = nothing and 2 strikes; three strikes in 14 days = sacked and blocked 7 days at that employer.
3. **Promotion:** needs skill, shifts and the certificate; no offer without all three; pay rises from the next shift.
4. **Courses:** held at the College 09:00, 6 hours, cost as listed; the certificate stays after a job is lost.
5. **Money:** rung 1 week (5 shifts) lands in 6,500-7,500; rung 2 8,000-10,000; rung 3 11,000-13,500; rung 4 16,000-20,000 (the pay table in the spec).
6. **Day labour stays** as a job-less gig and cannot be taken on a shift day.

## 6. What the four content toggles must hide when off
The setup screen shows four switches (all on by default). Off means the player never meets that content and cannot find it by accident.
| Toggle | Off must remove |
|---|---|
| **Violence** | fights, the slapstick collector scuffle, any combat scene or stun; weapons in the catalogue; the combat skill tree. (Combat is not built yet: today this toggle has nothing to remove and must not remove anything else.) |
| **Substances and addiction** | the back-alley contact's dark stock (seeds, additives, mixing bench), dark plants (nightbloom) and their seeds, the lab bench, the corner and its named customers' orders, the Texts about orders, the "Use" action, hooks, cravings and rough days, recovery storylines, and any heat caused by selling. The alley still exists and still sells the burner phone and cheap food. |
| **Police and crime** | patrol stops, raids, arrest, courts, jail, "moved on" while sleeping rough, bribery, and the record. Heat is not shown. Crimes that would be charged simply have no consequence. |
| **Survival harshness** | weather effects on warmth, collapse from cold, theft while asleep, and loss of the phone by robbery. Cold weather is still drawn but harmless. |
- **Gambling** (casino-spec) has a fifth switch when that slice ships; off removes stakes, chips, habit, markers and collectors.
- Switching a toggle off in a running game is only possible from the PIN-guarded settings; it never deletes the player's items, only hides and disables.
**Known state (from the code, 2026-11-10):** only **Police and crime** (move-on) and **Survival harshness** (weather, theft) are wired. **Substances** and **Violence** do not yet hide anything: that is a **bug against this section** for Substances (the alley contact, plants, lab, customers, addiction, and heat from selling should all disappear). Please test and report which of those still show with the switch off.

## 7. Cross-cutting checks (every slice)
1. **Kid mode:** a kid save never sees any of the above; coins, rooms and the kid town are unchanged.
2. **Saves:** versioned; an old save loads; a kid save and a hard save are separate and neither overwrites the other.
3. **Adult-only:** no child body or child character ever exists in a hard-mode game.
4. **Art:** hand-inked wobbly outlines, flat matte fills, no gradients, no gloss, no emoji in new art.
5. **Honesty:** report what was and was not tested (real touch, sound, other devices, real-GPU performance).
