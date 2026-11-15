# Work-site arrival prompt — spec

Version: 1.0 · Status: ready · 2026-11-10 · owner: designer · builder: developer
Origin: the user arrived at a day-labour site and "nothing happened". Applies to **day labour now** and to **every career shift** (careers-spec) later.

## 1. Behaviour
1. When a person who has a pending work obligation (a day-labour gig, or a career shift whose start time has come) **arrives at the work site**, a prompt appears over them: "Start your shift?" with **Start** and **Not yet**.
2. **Start** begins the work mini-game (or the auto-shift) at once. **Not yet** closes the prompt; the obligation stays pending and the clock keeps running (lateness rules apply as before). The prompt reappears when the person walks away and back, or when they tap the work-site marker.
3. While the obligation is pending and the person is **not** at the site, the work site's marker (the crates for stacking jobs, the desk or bench for others) **pulses gently** (a squash-and-stretch wobble, no glow) so the player can see where to go. It stops once the shift starts or the obligation ends.
4. Wording shows the job: "Start your shift? Unload a delivery, Corner Shop, due 11:30". If late, it adds "You are 25 min late: pay 70%".
5. A person who is **not** supposed to be working here (no gig/shift) who taps the work-site marker gets: "Nothing for you here right now" with the next shift time if they have a job.
6. The same prompt serves the household's controlled person; other household members only get it if the player has selected them.
7. Kid mode never shows it.

## 2. Out of scope
Auto-start with no prompt, a setting to turn the prompt off, sounds beyond the existing button click, a map arrow to the site.

## 3. Acceptance checks
1. Arriving with a pending gig opens the prompt once; **Start** begins the game; **Not yet** leaves the gig pending.
2. Arriving without a gig or shift opens nothing but tapping the marker shows the "Nothing for you" line.
3. The marker pulses only while an obligation is pending and the person is elsewhere.
4. The lateness text appears when and only when the person is past the start/deadline, and the percentage matches the lateness table.
5. Kid mode: no prompt, no pulse.
E2E: take a gig, walk to the site, assert the prompt, press Start, assert the mini-game opens. Screenshot of the prompt and the pulsing crates.
