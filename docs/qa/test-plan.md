# QA test plan — hard mode, slices 0–6e (baseline)

Written 2026-11-10 by toybox-game-qa, before testing. Spec: `docs/hardcore-mode.md`.
Note: the spec has no acceptance checks. For now the "as built" sections are the checklist; asked the designer for real ones.

## Automated
| Suite | Command | Status |
|---|---|---|
| Unit | `npm test` | 334/334 pass (2026-11-10) |
| E2E | `npm run e2e` | 31/31 smoke + 24/24 hard pass, one run, ~7 min (see results.md) |

Cannot tell from the e2e: whether anything *reads well*, feels fair, or balances. It asserts state, not feel.

## Manual / scripted checks (planned order)
1. **Save migration** — load old kid save and old adult saves (pre-v13: no bank/listings, no bags/alley corner) in headless Chromium via IndexedDB; expect no crash, no lost fields, the migrations the spec names. Tool: `tests/qa/`.
2. **Child mode untouched** — fresh kid save: no hard-only props (bank, alley, corner, gardenbed, labour board), no dark items anywhere in catalogue/shops/tips, coin economy unchanged, no `hard` block read. Also after a round trip kid → adult → kid.
3. **Setup toggles gate content** — violence / substances / police-crime / harsh survival: for each off, confirm the content is absent (e.g. substances off: no contact seeds, no corner, no hooks; harsh off: no weather effects, no theft; police off: no stops/raids/move-on).
4. **Economy bot** — pure-module bot over N game weeks per scenario (bench / flat / house / jail): can a minimum-wage week cover rent + food (spec §3.8 claim)? Bench -> out of the park by gigs alone? Nightbloom loop: seed cost vs yield vs heat vs expected jail cost; business profit vs rates/wages; landlord yield vs mortgage; card interest spiral; credit score recovery. Report numbers.
5. **Visual playtest** — screenshots at 390x844 (phone) and 1280x720 (desktop): HUD, player card, clock panel, phone/computer scenes, bank, sell scene, police scene, landlord, business. Check overlap, clipped text, tap target size.
6. **Guardrails** — adults only in hard (creator, sanitize, customers, applicants, tenants, staff); substances invented; no real compound names; no gore in art/text.
7. **Careers (uncommitted, slice 5 in progress)** — only once the developer commits or asks; spec `docs/careers-spec.md`.

## Cannot check
Real touch devices (only emulated touch events), real audio, other OSes/browsers (only Chromium on Linux), real-GPU performance (SwiftShader software render), long play sessions by a human, the child-safety of art by anything but my own eyes on screenshots.

## Flake policy
Rerun a failed e2e once; if it passes, record as flaky with the step name.
