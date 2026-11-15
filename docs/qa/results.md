# QA results log (newest first)

## 2026-11-10 — re-test of QA-002 and QA-003
Both fixed as far as tested (see bugs.md for what was and was not re-checked). Scripts: `tests/qa/toggles.qa.mjs`, `tests/qa/toggles2.qa.mjs`. Not run again: `npm test` / `npm run e2e` after the fix.

## 2026-11-10 — content toggles (partial)
Ran `tests/qa/toggles.qa.mjs` for substances / police / survival off (headless Chromium, desktop size, flat scenario).
- Substances off: nothing hidden (QA-002). Police off: patrol stops still happen (QA-003). Survival off: the script did not exercise weather or theft; code read only shows `survival` gating `env` in needs and theft in `street.js`, so **not verified in play**. Violence: nothing to hide yet.
- Not verified: toggles switched off in a running game from settings (the spec says PIN-guarded settings can do this; I only tested at setup), kid mode with toggles.

## 2026-11-10 — baseline automated run
Scope: working tree at ff4d39d plus uncommitted careers code/tests and the harness cleanup change.

- `npm test`: 334 tests, 334 pass, 0 fail, 0.45 s.
- `npm run e2e`: smoke 31/31, hard mode 24/24 (incl. the uncommitted *careers* step). One run, no failures, no reruns needed. Wall time 6 m 55 s.
- Chromium leftovers: after the run, `pgrep -af chromium` showed (a) the user's desktop Chromium (non-headless, user profile) and (b) a different set of `toybox-e2e-*` headless processes started ~30 s earlier than my check, i.e. a run from another session, not mine. My run's processes were gone. (An earlier note here about leftover profile directories was wrong: those were screenshot PNGs. See QA-001, withdrawn.)

Verified: the suites above pass. Not verified: anything not asserted by those suites (visuals, balance, migration, toggles, kid-mode leaks) — see test-plan.md.
