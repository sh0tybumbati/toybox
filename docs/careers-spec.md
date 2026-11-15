# Careers and jobs — spec (slice 5)

Version: 1.2 · Status: ready · 2026-11-10 · owner: designer · builder: developer
Changes in 1.2: **all pay rungs scaled by about 0.675** (food was costed wrongly in 1.0/1.1; see 3). Only numbers changed.
Changes in 1.1: public-service pay rungs 2 and 3 lowered to 2700 and 3700 (to sit in the section 3 bands); new buildings **Council Hall** and
**College** are decided (see 2.5); employers per career fixed for the adult town (see 2.5).
Decided with the user (2026-11-10): bosses and coworkers stay **abstract** until the citizens slice; every ladder has **4 rungs**;
higher rungs need **skill and paid courses**. Anything marked *(balance)* is a first guess to be tuned after a playtest.

## 1. Player-facing behaviour

1. **Work is a job you hold, not a gig you grab.** You apply for a job from the classifieds (paper, computer, phone). You are hired or
   turned down at once (see 4). A hired person has **one job** (`person.job = { career, rung, employer, shifts, skill... }`).
2. **A job has a fixed weekly rota** (days + start time, 8 h unless the rung says otherwise). The phone shows "Next shift: Tue 09:00,
   Corner Shop". You walk to the workplace (existing `travelMinutes`) and start the shift at the work site (a queued `work` action,
   same as day labour). The shift plays a **work mini-game** (reuse `stack` for physical jobs; see 6) or, for desk/service rungs,
   a short auto-shift that only drains needs and passes time.
3. **Pay** = rung base for the shift × performance (70–130%, from the mini-game or a flat 100% for auto-shifts) × lateness.
   Paid **weekly** into cash with a payslip in the mailbox (the existing bill/mail flow, reversed: a "Payslip" item that adds cash when read).
4. **Tardiness:** on time = full pay. Up to 60 min late = 70% and a "strike". 60–120 min late = 40% and a strike. Over 120 min or
   no-show = no pay, two strikes. Three strikes in 14 days = **sacked** (job removed, 7-day no-rehire at that employer). Strikes fall off after 14 days.
5. **Skill** (0–100 per career, not per job) rises with every shift worked (+3 on a good shift, +1 on a poor one, +0 if late over 60 min) and
   from hobbies listed in 5. It never falls while you are jobless; it falls 1/week after 4 weeks away (cap at the last rung's entry skill).
6. **Promotion:** at the end of each week, if you have the **skill**, the **shifts** (counted at this rung) and the **course** for the
   next rung, the boss offers it on the phone. You may accept or stay. Pay rises from the next shift. Demotion never happens; sacking does.
7. **Courses:** a paid, scheduled block (a day class of 6 h at a named building, once per course) that gives a **certificate**.
   Courses cost cash and a day of work, so they are the cash sink and the goal. Certificates live on the person and survive job loss.
8. **Quitting** is allowed any time (confirm). Notice is not modelled yet.

## 2. The four careers

Pay is cash per 8-hour shift at 5 shifts a week *(balance, see 3)*. "Shifts" = shifts worked at that rung. Skill = career skill needed to be offered the rung.

### 2.1 Retail & service — Corner Shop, Post Office, Shelter kitchen
| Rung | Title | Pay/shift | Skill | Shifts | Course |
|---|---|---|---|---|---|
| 1 | Shelf stocker / Kitchen hand | 1350 | 0 | 0 | — |
| 2 | Cashier / Cook | 1800 | 25 | 10 | Food hygiene (1500) |
| 3 | Supervisor | 2500 | 55 | 25 | Team leading (4000) |
| 4 | Store manager | 3500 | 80 | 50 | Retail management (9000) |

### 2.2 Trades & makers — Workshop, Post Office depot, building sites
| Rung | Title | Pay/shift | Skill | Shifts | Course |
|---|---|---|---|---|---|
| 1 | Labourer's mate | 1400 | 0 | 0 | — |
| 2 | Apprentice | 1900 | 25 | 10 | Site safety (2000) |
| 3 | Tradesperson (joiner / electrician / plumber, chosen at promotion) | 2700 | 55 | 25 | Trade certificate (8000) |
| 4 | Foreperson | 3650 | 80 | 50 | Contracting licence (12000) |

### 2.3 Farming & food — Garden Centre, farm lots, market
| Rung | Title | Pay/shift | Skill | Shifts | Course |
|---|---|---|---|---|---|
| 1 | Picker | 1300 | 0 | 0 | — |
| 2 | Grower | 1750 | 25 | 10 | Plant care (1500) |
| 3 | Head grower | 2350 | 55 | 25 | Crop planning (4000) |
| 4 | Farm manager | 3300 | 80 | 50 | Agri-business (9000) |

### 2.4 Public service — Council hall (clerk track only in v1)
| Rung | Title | Pay/shift | Skill | Shifts | Course |
|---|---|---|---|---|---|
| 1 | Filing clerk | 1400 | 0 | 0 | Basic office skills (1000) *(entry needs it)* |
| 2 | Records officer | 1850 | 25 | 10 | — |
| 3 | Department head | 2500 | 55 | 25 | Public administration (7000) |
| 4 | Councillor | 3900 | 80 | 50 | Election: win a short vote against two named rivals *(see 7, out of scope for v1: rung 4 is "Senior officer" at 3900 until then)* |

### 2.5 Where people work and learn (decided 1.1)
The adult town has only Corner Shop, Post Office, Shelter, Garden Centre, Park, Motel, Bank and Alley, so:
| Career | Employers (v1) |
|---|---|
| Retail & service | Corner Shop, Post Office, Shelter (kitchen) |
| Trades & makers | Post Office depot only (a Workshop employer comes when the player-owned workshop can hire out; out of scope) |
| Farming & food | Garden Centre |
| Public service | **Council Hall** (new, hard-mode only: a clerk desk and the filing auto-shift) |
All courses are held at a new hard-mode-only **College** (a classroom; courses open 09:00, 6 hours). Both new buildings go on empty
lots of the adult town and do not appear in kid mode. Where a rung's title names a place that does not exist yet (building sites,
joiner's shop), the job is simply "at the depot"; the title is flavour.

Police, paramedic and nurse ladders are **not** in this spec (they need combat/health, slices 8–9). The classifieds and the
data format below must make adding them a data-only change.

## 3. Balance targets *(balance)*
Real weekly living cost (checked against the game's own tables, v1.2): a flat is 4200 rent + 700 utilities = **4900**; the cheapest sensible food is
about **150-250** a week (a day's eating needs roughly 3.5 cheap items at 5-8 each); phone, bus and odd costs about **300-500**. A bare week in a flat is therefore about **5,500**; a motel is about **3,900**.
(Version 1.0/1.1 assumed 3,150 for food, which was wrong; the pay table has been scaled by about 0.675 to correct it.)
- Rung 1 at 5 shifts ≈ **6,750/week**: covers a flat and food with about **1,000-1,300 spare**; nothing for a house.
- Rung 2 ≈ **9,000** · rung 3 ≈ **12,500** · rung 4 ≈ **17,500-19,500** (retail 17,500; trades 18,250; farming 16,500; public 19,500).
  A house costs about 7,300/week averaged (28-day cycle) plus food: rung 2 can only just carry it, rung 3 comfortably.
- Day labour (about 1200 for 3 h = 400/h) pays better per hour than any rung 1 shift (1350 for 8 h = 169/h): emergency money, limited to one gig a day, not on a shift day. Five gigs a week (6,000) roughly equal a rung 1 week, but have no ladder, no rota and no sick pay.
- Time to rung 4 ≈ 85 shifts ≈ **17 game weeks ≈ 6.5 hours of real play** at full attendance, plus about 8 course days. Courses (1,000-12,000) now cost 0.15-1.9 weeks of the pay at their rung.
- Put all numbers in the game's career data table; the pay-band test must be able to recompute the bands above from it (±10%).

## 4. Applying and being hired
- Each day `listings(day)` (existing) shows 4 openings, now drawn from **career rungs the player qualifies for plus two they do not** (greyed, "needs Food hygiene"). A listing carries `career`, `rung`, `employer` (a building id), `rota`, `pay`.
- **Hiring check:** the player must hold the rung's certificate and skill. They must also have a **phone or a number** (landline at home) and **hygiene ≥ 40 and no "dirty clothes" flag** at the moment of applying. Failure gives a one-line reason ("Come back clean."). No interview mini-game in v1.
- Entry rungs (skill 0, no course) are hired **always** except: sacked there in the last 7 days, or a criminal record on file for public service.
- A record (`hard.record`, existing) of a conviction blocks rung 2+ of public service and halves the pool of listings (data flag `record: 'block' | 'ok'` per career).

## 5. Skill sources besides shifts *(small, optional for the developer to ship in v1)*
Hobbies already in the game raise career skill slowly: cooking (retail/food), gadget bench (trades), garden beds (farming), reading the paper/computer (public service) — +1 per full session, max +10 from hobbies per career. Data-only table `HOBBY_SKILL`.

## 6. Work mini-games
| Career | Shift play |
|---|---|
| Retail & service | rung 1: existing `stack`; rung 2+: till/cashier play already built for shops (`cashier.js`) or an auto-shift |
| Trades & makers | `stack` with heavier crates at rung 1–2; rung 3+ auto-shift with a quality roll from skill |
| Farming & food | garden bed tending at the workplace beds (reuse garden actions); auto-shift above rung 2 |
| Public service | auto-shift always (a 20 s filing count-up screen is fine) |

Auto-shift: performance = clamp(70 + skill × 0.4 ± 10 random, 70, 130)%. Needs drain as for day labour (`SHIFT_DRAIN`).

## 7. Out of scope (v1)
Named bosses/coworkers, interviews, notice periods, overtime, unions, sick days, holiday pay, multiple jobs per person, the election mini-game, police/medical ladders, being headhunted, and moving the business-staff system onto careers.

## 8. Data (all in `data/hard/careers.js`, pure logic in `systems/hard/careers.js`)
```
CAREERS[id] = { label, employers: [buildingId...], record: 'ok'|'block',
  rungs: [{ title, pay, skill, shifts, course|null, play: 'stack'|'till'|'beds'|'auto', rota: { days:[1..7], start:'09:00', hours:8 } }] }
COURSES[id] = { label, price, venue: buildingId, hours: 6, opens: '09:00' }
LATE = [{ upTo:0, pay:1, strike:0 }, { upTo:60, pay:.7, strike:1 }, { upTo:120, pay:.4, strike:1 }, { upTo:Infinity, pay:0, strike:2 }]
STRIKES_TO_SACK = 3; STRIKE_DAYS = 14; REHIRE_BLOCK_DAYS = 7; SKILL_PER_SHIFT = { good:3, poor:1, late:0 }
```
Person fields: `job`, `skills: { career: n }`, `certs: [courseId]`, `strikes: [day...]`, `sackedAt: { employerId: day }`, `pendingPay`.
**Save:** a new `SAVE_VERSION`; `migrate()` gives older hard saves `skills: {}`, `certs: []`, no job. Kid saves are untouched; every careers
code path is behind `scene.hard`. Existing day labour stays as is (a separate, job-less gig).

## 9. Acceptance checks (developer-testable)
Unit tests (pure, `npm test`):
1. Every rung's `course` exists in `COURSES`, every `employer` is a real building id in all scenario cities, and every `play` value is a known mini-game or `auto`.
2. `weeklyPay(career, rung)` at 5 shifts and 100% performance lands in the bands in 3 (±10%), and is strictly increasing by rung.
3. Lateness table: 0/30/90/130 minutes late gives 100/70/40/0% and 0/1/1/2 strikes; the third strike within 14 days sacks, the same strikes 15 days apart do not.
4. Promotion offered only when skill, shifts and certificate all hold; missing any one gives no offer; accepting changes pay from the next shift.
5. Hiring refuses: missing certificate, skill too low, no phone/number, hygiene < 40, sacked there < 7 days ago, a record on a `block` career; entry rungs otherwise always hire.
6. Skill: +3/+1/+0 per shift; decay -1/week only after 4 weeks without a shift; hobby bonus capped at +10.
7. Migration: a pre-careers hard save loads with empty skills and no job; a kid save has no `job` field and unchanged behaviour.
8. Listings are deterministic from the day and always include at least one entry-rung job.

E2E step (`npm run e2e`, hard mode): start as *Cheap flat*, apply for Shelf stocker on the phone, see the rota, walk to the shop at shift time,
finish a shift, check the payslip arrives in the mailbox and cash goes up by the shift pay ±30%; skip a shift and check a strike shows on the phone.

Done when: all of the above pass; the phone shows job, rota, strikes, skill bar and the next promotion's missing requirements; a screenshot
of the phone job page and the work site is in the report; the developer lists what they could not verify (real touch, sound).

## 10. Open for the user later
Whether a second household member's job should be required for the later "family" scenarios; the election mini-game; whether the
cashier's till should become a bigger shared mini-game with the shop-owner business.
