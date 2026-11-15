# Content toggles: Substances gating

Version: 1.1 · Status: ready · 2026-11-10 · owner: designer · builder: developer
Changes in 1.1: corrected the note that Police was already wired (only move-on was; the developer gated stops, raids and heat too); with Substances off, buying the burner phone or food from the contact adds **no heat**.
Origin: QA/designer review found the setup switches `substances` and `violence` store a value but gate nothing. This spec makes **Substances and
addiction** real. **Violence** waits for combat (nothing to gate yet). Police and Survival are already wired and are not changed.

## 1. Behaviour when "Substances and addiction" is OFF
The player must never meet the fictional-substance content, and cannot stumble into it.
1. **Back Alley:** the contact stays (he still sells the burner phone and the cheap food) but sells **no seeds, additives or gear for dark plants**. The corner prop ("Meet buyers") is absent. The alley's lines never mention the trade.
2. **Dark plants:** the Garden Centre and the alley list only legal crops. Dark seeds cannot be bought, planted, kept or shown in the catalogue, bags, stash or tips. Grow gear that exists only for dark plants (grow tent, lamp) may stay in the catalogue only if legal crops can use it; otherwise hidden.
3. **Lab / mixing bench:** not available; the prop is absent from rooms and the catalogue.
4. **Customers and Texts:** no dealing customers visit the corner, text the phone, appear as "wants" or build trust/hook; the six named people stay in town as ordinary citizens (no purchase behaviour).
5. **Addiction:** no "Use" action, no hooks, cravings or rough days for the substance. Gambling habit (casino-spec) is a separate toggle.
6. **Heat from selling:** none, because nothing can be sold. Buying the burner phone or the cheap food from the contact also adds **no heat** while the switch is off. Other heat sources (if any) are unchanged.
7. **Police:** patrol stops, raids and arrests still exist if "Police and crime" is on, but with nothing to find they only happen for other future crimes; searches find nothing.
8. **UI and tips:** no mention in tips, the phone Texts tab, the newspaper, the shopping lists or the HUD. The heat chip is hidden when heat is always 0.

## 2. Turning the toggle OFF in a running game (from PIN-guarded settings)
- It **hides and disables only**; nothing is deleted. Existing dark seeds, plants, batches, stash, customer trust/hooks and debts are kept in the save, unusable and invisible.
- Plants already growing are **frozen** (not harvestable, not found by a raid, not growing). Product carried or at home cannot be seen or sold, and police searches ignore it.
- A hooked person is no longer affected by cravings or rough days while it is off.
- Customers' owed credit is paused (no collection).
- **Turning it back ON** restores everything exactly as it was, with the clock moving on normally (plants resume from where they froze; no catch-up).
- Changing the switch asks for confirmation ("This hides the substance trade. Your progress is kept.").

## 3. At setup
The switch is on the setup screen as today (default on). A new game created with it off never creates dark seeds, customer states, hooks or the corner. Scenarios must still start and reach every non-trade feature without it.

## 4. Out of scope
Violence gating (when combat ships), gambling gating (casino-spec), per-content-type switches (e.g. only hide addiction), age verification beyond the existing adults-only gate.

## 5. Acceptance checks
1. New hard game with Substances off: the alley has no corner and no dark stock; no dark crop appears in any shop, catalogue, bag or tip; no lab prop in any room.
2. Same game: no dealing customers, no Texts about orders, no Use action, no hook values ever created in the save.
3. Police on, Substances off, a person carrying nothing: stops and raids end with "nothing found" and add no charge.
4. Turn it off mid-game with batches, plants, a hook and a customer debt: all are hidden and inert; none are deleted from the save; a raid does not find them.
5. Turn it back on: batches, plants, hooks and debts are restored exactly; plant growth resumes from the freeze.
6. Survival and Police toggles behave exactly as before; kid mode unaffected.
7. Saves: a hard save from before this spec loads with Substances on and behaves as today.
E2E: new game with Substances off, visit the alley at night: no corner, burner phone still for sale; screenshot. Toggle on mid-game: the corner appears.
