# Districts and the big map (slice 7, part 1)

Version: 1.0 · Status: ready · 2026-11-10 · owner: designer · builder: developer
Decided with the user (2026-11-10): **one big scrolling map**; **4 districts of 10 lots each** (40 lots); districts differ in **prices and land
value, police presence and heat, who lives and shops there, and safety/theft risk**; the **60 named citizens are a separate follow-up spec**
(this spec only reserves their homes). Numbers marked *(balance)* are first guesses.

## 1. Scope and modes
1. **Hard mode only.** Kid mode keeps its current 20-lot town and map exactly as they are.
2. The hard-mode city becomes a single wide hand-inked landscape holding four districts side by side, west to east:
   **The Verge** (slums and park), **Old Town**, **Downtown**, **The Docks** (industrial waterfront). A river and the shoreline run along the bottom edge and the sea closes the east end.
3. Same ink style as today (wobbly uneven outlines, flat matte fills, crooked organic paths, no gradients or gloss); each district has its own
   moodier palette and landmark silhouettes (see 5). Lots keep today's size and look; buildings keep their chubby-model art.

## 2. Player-facing behaviour
1. **Moving around the map:** drag to pan (one finger on touch, mouse drag on desktop), with a little inertia and a soft stop at each end. No zoom in v1.
2. **District chips** along the top (The Verge, Old Town, Downtown, The Docks, the current one highlighted): tapping one glides the map to that district (about 0.6 s). The map opens on the district of the person's current building.
3. Tapping a lot does what it does today (visit, buy, build, decorate, let, manage) and the same lot sheets apply. A lot's sheet shows its **district name**, **land value** and **walk/bus time from the person**.
4. **Travel costs game time** (and, by bus, money). It is shown before you go: "Walk 28 min · Bus 12 min, $100".
   - Within a district: 5–15 min walking, no bus needed.
   - Neighbouring districts: about 30 min walking, 12 min by bus.
   - Across the whole map (Verge ↔ Docks): about 90 min walking, 30 min by bus.
   - The **bus** runs 06:00–23:00 with a wait of 0–10 min added; fare **$100 per district boundary crossed**. No bus at night: you walk.
   - Walking at night through some districts carries risk (see 4).
   *(balance)* These are targets; the developer sets the distances to meet them.
5. A person already in a building who chooses another building in a different district travels there as one queued action; needs drain on the way as for walking today. Day-labour and career shifts use the same travel times for lateness.
6. The map shows **people walking and vans** as today, scaled to the new size.
7. **Navigating to a place by name** is available from the phone (Map app) — a list of public places with a "Go" button.

## 3. The four districts and their lots (10 each)
Public places are never bought or built; houses and empty lots are the only things the player buys. Each public place exists **exactly once**.

| District | Look and mood | Public places (count) | Houses / empty lots |
|---|---|---|---|
| **The Verge** (west) | patchy grass, scrap, fences, a smoky fire barrel, washing lines; the poor, busy edge of town | Park, Shelter, Back Alley, Motel, Pond, Campsite (6) | 2 cheap houses, 2 empty lots |
| **Old Town** | crooked terraces, cobbled tracks, shopfronts with awnings; the lived-in middle | Corner Shop, Supermarket, Post Office, Garden Centre (4) | 3 houses, 3 empty lots |
| **Downtown** | tall narrow buildings, signs, wet pavement; dear and watched | Bank, Council Hall, College, Casino (the arcade lot), Furniture Store (5) | 2 houses, 3 empty lots |
| **The Docks** (east) | cranes, crates, warehouses, gulls, water on two sides; cheap and ignored | Shirt Factory, Toy Workshop (2) | 2 houses, 6 empty lots (business-friendly) |

Totals: 17 public places, 9 houses, 14 empty lots = 40. (Council Hall and College are new hard-mode buildings from careers-spec; the casino is casino-spec.)
- **Houses for sale** keep today's listings logic, now drawn from each district's house lots; the whole map starts with 9 houses, 3 owned or rented depending on the scenario.
- **Businesses** (shop, workshop, farm) may be built on any empty lot; district affects lot price (see 4) and the footfall note: a Shop gets a **trade modifier** by district (4).
- The Park, Pond and Campsite keep their outdoor-room behaviour (rain, snow, open-air) and flow together as one outdoor stretch.

## 4. What makes districts different *(balance)*
All multipliers apply on top of today's numbers (1.0 = today).

| | The Verge | Old Town | Downtown | The Docks |
|---|---|---|---|---|
| Lot price | 0.5 | 1.0 | 1.8 | 0.7 |
| House price (and mortgage size) | 0.5 | 1.0 | 1.8 | 0.7 |
| Market rent and tenant quality (the landlord slice): rent ×, reliable-tenant share | 0.5 · 55% | 1.0 · 70% | 1.8 · 85% | 0.7 · 60% |
| Shop prices (what things cost in public shops there) | 0.85 | 1.0 | 1.25 | 0.95 |
| Business trade modifier (takings of a Shop/Workshop/Farm) | 0.7 | 1.0 | 1.3 | 0.9 |
| Police patrol frequency | 0.6 | 1.0 | 1.6 | 0.7 |
| Heat gained from crime | 0.8 | 1.0 | 1.5 | 0.7 |
| Raid risk on a stash at home | 0.8 | 1.0 | 1.4 | 0.6 |
| Robbery chance (outdoors/asleep rough, by day · by night) | ×1.3 · ×1.6 | ×0.8 · ×1.0 | ×0.5 · ×0.7 | ×1.0 · ×1.5 |
| "Moved on" frequency (sleeping rough) | 0.5 | 1.0 | 2.0 | 0.5 |
| Customer wallet (what a dealer's buyers there will pay: multiplier on price) | 0.7 | 1.0 | 1.5 | 0.9 |
| Landlord deposit and screening difficulty | easy | normal | strict | easy |

- **Land value** (shown 1–5 stars on each lot sheet) is the lot price multiplier mapped: 0.5→1★, 0.7→2★, 1.0→3★, 1.8→5★.
- Existing rules are not changed otherwise; "robbery 10%/h, 30% of cash" becomes 10% × the multiplier.
- The Alley stays where it is (The Verge) and its hours stay 18:00–05:00; its contact does not move. Police patrol frequency also applies to the Alley's heat: a corner in The Verge draws less heat but fewer big buyers.

## 5. Who lives and shops there
- **Shop stock and prices:** every public shop sells what it sells today at its district's shop-price multiplier; stock levels and delivery days unchanged.
- **Jobs:** employers sit in their buildings' districts (careers-spec 2.5), so Council Hall and College are in Downtown, the Post Office in Old Town, the Shelter in The Verge, the Garden Centre in Old Town. Expect long commutes from The Verge to Downtown: that is the point.
- **Residents (reserved for the citizens spec):** each district reserves home slots for named citizens: **The Verge 12, Old Town 18, Downtown 14, The Docks 16 = 60**. The six existing customers are among them and get a home district now:
  Jo Kerr — The Verge · Marta Vell — Old Town · Rufus Teague — Old Town · Pip Halloran — Downtown (the College) · Odalys Brandt — Downtown · Dex Okoro — The Docks.
  Until the citizens spec ships they still come to the corner and text as today, but the price they pay uses their home district's wallet multiplier.
- Districts have **names, a short flavour blurb and a mood line** shown on the district chip's long-press and on the first visit ("The Docks: cheap, cold, and nobody's looking.").

## 6. Starting positions and saves
| Scenario | Start |
|---|---|
| Park bench | The Verge, in the Park; the Shelter, Alley and Motel are next door |
| Cheap flat | a flat in Old Town (an owned-by-landlord lot) |
| Inherited house | a house in Old Town, at the edge facing The Verge |
| Just out of jail (later) | The Verge, at the Shelter |
- **Existing adult saves** (the old 20-lot city) are migrated, not reset: every building and everything the player owns keeps existing and keeps its owner and state. Each is placed on a lot of the correct district for its kind (public places by the table in 3; the player's home and other houses go to Old Town house lots first, then other districts' house lots); any building that does not fit goes to the nearest empty lot. The person's current building is unchanged. Missing public places (Council Hall, College, Casino) are added as new lots. Nobody loses a building, a lease, a mortgage or a business.
- Kid saves are untouched; kid mode never loads the big map.

## 7. Out of scope (v1)
Zoom, a minimap, cars/bikes/taxis, bus routes with stops, gentrification or land value that changes over time, district events (strikes, fairs),
district-specific weather, new districts, scrolling interiors, the 60 citizens themselves and their routines (next spec), faction territory per district (slice 10), per-district laws.

## 8. Acceptance checks
Data/unit tests:
1. The city has 4 districts × 10 lots = 40; each public place appears once in the whole map; the table in 3 is reproduced (17 public, 9 houses, 14 empty).
2. Every lot belongs to one district; every district has all fields in 4; multipliers reproduce the table.
3. Travel: within-district 5–15 min, neighbouring about 30 walking / 12 bus, across about 90 / 30 (±20%); bus only 06:00–23:00; fare $100 per boundary crossed, so Verge→Docks costs $300.
4. Lot, house, rent, shop, business and customer prices are multiplied by the right district numbers (spot-check one value per column).
5. Police patrol, heat gain, raid risk, robbery (day/night) and move-on rates change by district as stated, with the base rates unchanged in Old Town.
6. Residents: home slots per district total 60; the six customers have the stated home districts.
7. Migration: an old 20-lot adult save loads with everything owned intact, houses in Old Town first, missing public places added; the current building unchanged; a kid save is unchanged.
8. Scenarios start in the stated districts.
E2E (hard mode): open the map, drag to pan, tap each district chip, tap a far lot and read the travel line, travel by bus (assert fare and time), open a lot sheet and check district name and stars. Screenshots: the full map in each district's palette, a lot sheet, the district chips.
Done when all pass plus those screenshots; the developer lists what could not be verified (real touch panning, real-device performance of a 4-district scroll, sound).

## 9. Open for the user later
District names and flavour text (placeholders until you pick); whether Downtown should get tram art; whether faction territory should map exactly to districts (slice 10); whether the casino belongs in Downtown or the Docks.
