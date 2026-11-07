// The risks of living rough (pure): being moved on by a patrol and having your pockets gone through while you sleep.
// `toggles` are the setup's content switches; each risk only exists if its switch is on.
export const HARSH = { moveOn: { from: 0, to: 5, chance: 0.25 }, theft: { chance: 0.1, take: 0.3 } };      // per game hour asleep outside

// What happens during one game hour asleep outdoors? Returns a list of events:
// { type: 'moveOn' } | { type: 'theft', amount }. `rand` is 0..1 (injectable for tests).
export function roughHour({ hour, cash, publicPlace = true, toggles }, rand = Math.random) {
  const out = [];
  if (toggles.police && publicPlace && hour >= HARSH.moveOn.from && hour < HARSH.moveOn.to && rand() < HARSH.moveOn.chance) out.push({ type: 'moveOn' });
  if (toggles.survival && cash > 0 && rand() < HARSH.theft.chance) out.push({ type: 'theft', amount: Math.max(1, Math.floor(cash * HARSH.theft.take)) });
  return out;
}

// What you find searching a bin: { kind: 'food', nutrition } | { kind: 'cash', amount } | { kind: 'nothing' }.
export function scavengeFind(rand = Math.random) {
  const r = rand();
  if (r < 0.45) return { kind: 'food', nutrition: 6 + Math.floor(rand() * 10) };
  if (r < 0.7) return { kind: 'cash', amount: 50 + Math.floor(rand() * 200) };
  return { kind: 'nothing' };
}
