# Bugs (newest first)

Format: id, title, severity (blocker / major / minor / polish), steps, expected vs actual, frequency, screenshot, status (open / fixed / won't fix).

## QA-003 — "Police and crime" switch off still gives patrol stops (and heat, raids, arrest by the same code)
- Severity: major (a setup switch that promises a pure economy game does not deliver)
- Steps: new adult game (Cheap flat), uncheck "Police and crime" in setup. Go to a public room with 90 heat and carried product (set via `r.hard.heat=90; r.hard.goods=[...at:'carry']`), pass six game hours (`r.passTime(60)` x6).
- Expected (acceptance-checks §6): no patrol stops, raids, arrest, courts, jail, bribery, record; heat not shown. Actual: a patrol stop was queued every hour (6 of 6, with `policeRng` forced low = worst case, so the real frequency is lower); heat stays 82 afterwards. Only the sleeping-rough "moved on" respects the switch (`systems/hard/street.js:9`); nothing else in `src` reads `toggles.police`.
- Frequency: always. Screenshot: none. Spec: acceptance-checks §6 already says this is only half wired, so this is a **bug against the spec**, not a spec problem. **Status: fixed, re-tested 2026-11-10.** `toggles.qa.mjs police`: 0 stops in 6 h (was 6). Not re-tested: raids, arrest and jail with the switch off (no stop can start them, but I did not force a raid), and the claim that the heat figure is hidden (read from the log, not seen on screen).

## QA-002 — "Substances and addiction" switch off hides nothing
- Severity: major
- Steps: new adult game, uncheck "Substances and addiction". Go to the Back Alley at 22:00; use the contact.
- Expected: no dark stock, no corner, no plants/lab/customers/hooks/heat from selling; the alley keeps the burner phone and cheap food (acceptance-checks §6). Actual: `dealer` and `corner` props are present, the Deal scene opens and its "Dark supplies" page lists Nightbloom seeds, Amber resin, Cooling mint, Cut powder, False-bottom bag, Hidden floor safe, Mixing bench. Nothing in `src` reads `toggles.substances`. Not checked past the contact (no run of corner/lab/hooks with the switch off), because the entry points all exist.
- Frequency: always. Screenshot: /tmp/claude-1000/-home-ad/2db6df4f-5b8f-48a2-9303-bbe6a6576fe3/scratchpad/deal-substances-off.png (supplies page text was captured; screenshot shows the goods page). Spec: bug against §6 (designer already notes it). **Status: fixed, re-tested 2026-11-10** through the Deal scene as a player sees it (`toggles2.qa.mjs`): only the burner phone and three hot-food lines are offered, no Dark supplies tab, the corner is hidden and invisible and does not open a Sell scene. Not re-tested: the bench and plants being frozen/hidden in a home, the Texts tab, the catalogue, the Settings button (the developer's own e2e covers some of it), turning the switch back on and getting everything back. Note: with heat forced to 90 and hidden product carried, patrol stops still happen; that is heat, not product, and is fine if that heat is reachable with substances off (it is: the contact's food purchases add heat).
- Note: "Violence" has nothing to hide yet (combat is unbuilt), nothing to test.

## QA-001 — e2e leaves temp profile directories in /tmp
- Severity: polish. **Status: won't fix (my error, withdrawn).** The six `/tmp/toybox-e2e-*` entries I counted were screenshot PNGs written by the e2e steps, not profile folders. Re-checked: no profile directories remain, and the current `harness.mjs` removes its profile on teardown.
