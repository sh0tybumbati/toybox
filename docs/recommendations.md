# Project Toybox — Recommendations: Visual Style, Systems & Features

Version: 1.0 · Date: 2026-11-19 · Scope: Kid Mode (Dollhouse Sandbox) & Hardcore Mode (Survival Sim)

---

## 1. Executive Summary & Core Identity

Project Toybox has a rare and compelling dual identity:
1. **Kid Mode (Default):** A tactile, friction-free digital toy sandbox in the lineage of *Toca Life World* and *Avatar World*.
2. **Hardcore Mode (Hidden):** A gritty, satirical survival-capitalism sim (*The Sims* × *Schedule 1*) featuring needs, shifts, debt, credit scores, landlords, and police.

The codebase is remarkably clean: plain ES modules, zero build step, 340+ lightning-fast unit tests, WebAudio procedural synthesis, and a pure programmatic ink engine (`src/data/ink.js`) enforcing the "Adventure Time" rubber-hose wonky style.

The recommendations below focus on elevating tactile juice, deepening emergent mechanics, and fixing visual seams without compromising 60 FPS mobile performance or simplicity.

---

## 2. Visual Style & Art Direction

### A. Horizon & Celestial Layering (Fixing Multi-Room Sun Stamping)
* **Finding:** In `src/data/decor.js` (`paintOutdoor()`), celestial bodies and mountain backdrops are stamped at fixed local offsets (e.g., `x = 830` for the sun) within each outdoor room section. When an outdoor area spans multiple sections (such as Park into Playground), camera scrolling exposes two suns on screen simultaneously.
* **Recommendation:**
  * Separate **sky/celestial backdrops** from **room-level foreground geometry**.
  * Render a single continuous sky layer per zone (or attach sun/moon positions to camera scroll with subtle parallax).
  * Reserve section-level rendering for hills, trees, grass lines, and interactive outdoor props.

### B. Tactile Micro-Interactions ("Squishy Props")
* **Finding:** While characters boast expressive rubber-hose bezier limbs and squash-and-stretch on landing (`src/systems/interactions.js`), furniture and architectural fixtures remain mostly static visual boxes.
* **Recommendation:**
  * **Springy Bed & Sofa Cushions:** When characters or items drop onto beds or armchairs, trigger a vertical bounce on the seat cushions using `Phaser.Tweens.Eases.Elastic.easeOut`.
  * **Wobbly Rubber Hinges:** Animate cupboards, fridge doors, and ovens opening with a slight curve/bulge rather than an instant texture swap.
  * **Tug-of-War Resistance:** If two characters grab an item simultaneously, stretch the item and character limbs horizontally with elastic tension before popping loose with a `boing` sfx.

### C. Dynamic Atmospheric Weather Effects
* **Finding:** `src/systems/hard/weather.js` (`weatherAt()`) computes accurate seasonal weather (temperature, rain, snow, clear, cloudy), but it is currently only used to water garden plots in the background.
* **Recommendation:**
  * **Visible Rain:** Animated diagonal wobbly ink streaks falling across outdoor scenes with small splash rings (`puff` circles) upon floor impact.
  * **Window Rain Streaks:** When raining outside, render soft vertical droplet trails running down indoor window panes and mute sunlight beams.
  * **Snow Cover:** Gentle floating snowflake blobs that accumulate as small puffy ink caps on roofs, fences, and outdoor benches.
  * **Audio Ambience:** Add a synthesized low-pass filtered noise bed in `src/systems/sfx.js` for gentle rain and howling winter wind.

### D. Procedural Surface Tactility (Preventing Flat Vector Fatigue)
* **Finding:** Large painted surfaces (plain walls, roads, large counters) can occasionally read as sterile digital vectors compared to the lively character drawings.
* **Recommendation:**
  * Use lightweight procedural detail from `InkPen` (like existing floor plank lines):
    * Organic woodgrain knots on shelves and tables.
    * Subtle diagonal cross-hatching in room corners, under eaves, and behind heavy furniture.
    * Faint, wobbly wallpaper borders or molding trim along baseboards.

### E. Visual Fluid Dynamics for Faucets & Pouring
* **Finding:** Kitchens and bathrooms have sinks, showers, kettles, and milk jugs, but liquid is largely static.
* **Recommendation:**
  * Add a procedural droplet/stream particle emitter for turned-on taps and tilted teapots/bottles.
  * Sinks and bathtubs should visibly fill with foamy water and floating bubble circles when running.

---

## 3. Systems Architecture & Gameplay Depth

### A. Expand Combinatorial Interactions (`COMBOS`)
* **Finding:** In `src/data/recipes.js`, `COMBOS` currently only supports 4 pairs (`bread + jam`, `bread + cheese`, `icecream + cupcake`, `berry + icecream`).
* **Recommendation:** Expand drop-combos into the primary discovery engine:
  * **Culinary Combos:**
    * `bread + meat` → `burger`
    * `bread + friedegg` → `breakfast sandwich`
    * `tortilla/bread + cheese + tomato` → `pizza slice`
  * **Vessels & Drinks:** Dropping a milk carton, juice bottle, or coffee pot onto an empty cup fills the cup.
  * **Gift Wrapping:** Dropping any toy/item into wrapping paper or an open gift box seals it with a ribbon; tapping it bursts confetti and unboxes the surprise.
  * **Arts & Customization:** Dropping a brush onto a paint palette loads it with color; applying the brush to plain furniture or toy figurines recolors them.

### B. Multi-Slot Serving Trays & Plates
* **Finding:** Items can only be held individually, placed on shelves, or tucked into storage slots. Setting a dining table or serving food is cumbersome.
* **Recommendation:**
  * Introduce a `plate` and `tray` item category with 2–4 nested item slots.
  * Items dropped onto a plate snap into place; dragging the plate moves all contained foods together.
  * Facilitates tea parties, dinner table staging, and restaurant order delivery.

### C. Playful Cause-and-Effect for Kid Mode (Zero Penalty)
* **Finding:** Kid mode has no failure states, which is core to the dollhouse philosophy. However, physical actions can still have delightful, non-punishing physical reactions.
* **Recommendation:**
  * **Mess & Bath Time:** Stomping in mud or park dirt leaves muddy splotches on character legs; taking a shower or bath triggers soap suds and leaves them with sparkling star particles.
  * **Food Reactions:**
    * Chili/Spicy food triggers comical fire-breath puffs and frantic hand-flapping.
    * Excessive candy/sugar triggers a temporary 5-second "sugar rush" with doubled walk speed and hyper-bouncy steps.
    * Warm cocoa triggers sleepy `zzz` floaters and an idle yawn.

### D. Closed-Loop Town Economy & Supply Chain (Hardcore Mode)
* **Finding:** Player-owned workshops (shirt factory, toy workshop, farm) operate somewhat in isolation from retail outlets (supermarket, corner shop).
* **Recommendation:**
  * Link production to distribution: allow player-crafted shirts, toys, and crops to be stocked in retail shops or sold wholesale to local merchants.
  * Tie employee rosters to the 60 named citizens: the person you hire as a shelf stocker can also be a tenant renting your starter flat or a customer at the casino.

---

## 4. Feature Recommendations

### For Kid Mode (Dollhouse Creativity & Roleplay)

| Feature | Description | Implementation Concept |
|---|---|---|
| **Playable Musical Instruments** | Turn the `guitar` and potential pianos/drums into playable instruments rather than static cuddle toys. | Tapping an instrument held by a character synthesizes harmonious pentatonic chords in `Sfx`. Nearby characters and pets bob to the beat. |
| **Dress-Up Vanity Mirror** | Dedicated mirror prop offering rapid cosmetic customization. | Tapping the mirror opens a carousel for instant hat, glasses, hairstyle, and outfit swaps without opening the full creator scene. Concludes with applause and confetti. |
| **Instant Polaroid Camera** | Handheld camera item to capture in-game moments. | Dragging the camera snaps a screenshot framed as an instant polaroid photo. Players can stick photos onto the fridge, walls, or into a personal photo scrapbook. |
| **Rideable Vehicles** | Skateboards, scooters, roller skates, and baby strollers. | Snaps character feet to the vehicle; tapping the floor glides them smoothly along the room lane with rolling wheel sound effects. |

---

### For Hardcore Mode (Survival & Society Sim)

| Feature | Description | Implementation Concept |
|---|---|---|
| **Districts & Public Transit (Slice 7)** | Realize the 4-district scrolling map (*The Verge*, *Old Town*, *Downtown*, *The Docks*). | Introduce bus lines ($100 fare, scheduled hours) vs. walking across district borders. Night walks carry exposure fatigue and risk of street encounters. |
| **Dynamic Smartphone Ecosystem** | Expand the in-game phone beyond bills and static job listings. | Add branching SMS dialogues from landlords, employers, and contacts; classified odd jobs; and daily satirical local news updates. |
| **Sanitation, Pests & Health Inspections** | Link maintenance to living conditions. | Leaving rotting food or overflowing bins unattended spawns wobbly cartoon mice/roaches, degrading comfort scores and attracting fines. Cleared using the broom. |
| **Courtroom & Community Service Events** | Deepen the justice loop when caught by police. | Choice-driven courtroom events: post bail, hire a public defender vs. expensive lawyer, or serve community service shifts (sweeping parks, kitchen duty at the shelter). |

---

## 5. Prioritized Implementation Roadmap

```mermaid
flowchart TD
    subgraph Phase 1: Immediate Polish & Visual Fixes
        A1[Fix Multi-Room Sun Repetition in decor.js] --> A2[Wire Atmospheric Rain/Snow to weatherAt]
        A2 --> A3[Add Cushion & Door Elastic Tweens]
    end

    subgraph Phase 2: Core Toybox Juiciness
        B1[Expand COMBOS Matrix in recipes.js] --> B2[Playable Instruments & Pentatonic Synth in sfx.js]
        B2 --> B3[Multi-Item Serving Plates & Trays]
        B3 --> B4[Harmless Kid-Mode Mud & Sugar-Rush Effects]
    end

    subgraph Phase 3: Major Simulation Slices
        C1[Wear & Maintenance Slice 4: wear-spec.md] --> C2[Districts & 40-Lot Big Map Slice 7: districts-spec.md]
        C2 --> C3[Casino & Habit Mechanics: casino-spec.md]
        C3 --> C4[Town Supply Chain Integration]
    end

    Phase 1 --> Phase 2
    Phase 2 --> Phase 3
```

1. **Phase 1: Immediate Polish (Low effort, high visual impact)**
   - Unify sky rendering across multi-room outdoor zones to eliminate duplicate suns.
   - Connect `weatherAt()` to particle overlays for rain and snow.
   - Add elastic bounce tweens to sofas, beds, and cabinet doors.

2. **Phase 2: Core Toybox Juiciness (Medium effort, high gameplay value)**
   - Expand `COMBOS` in `src/data/recipes.js` for food, drinks, and gift wrapping.
   - Turn `guitar` and musical props into playable instruments using WebAudio.
   - Implement multi-slot plates/trays and harmless kid-mode physical reactions (mud, sugar rush).

3. **Phase 3: Major Hardcore Slices (Spec-driven)**
   - Execute the **Wear & Maintenance** spec (`docs/wear-spec.md`).
   - Deliver the **Districts & 40-Lot Map** (`docs/districts-spec.md`) with public transit.
   - Build out the **Arcade → Casino** transition (`docs/casino-spec.md`).
