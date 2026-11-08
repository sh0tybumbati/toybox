// Using the product yourself (pure): a lift now, a hook that grows, then needs and mood that suffer until you use again or come down.
// A person's habit is { hook: 0..100, last: game minute of the last use }.
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export const newHabit = () => ({ hook: 0, last: -99999 });

// What using one unit does: needs to add now, and how far the hook goes up.
export function useEffect(prod) {
  const calm = prod.effects.includes('calm') ? 0.7 : 1;
  return { needs: { mood: 18 + prod.potency * 2, energy: prod.potency, hunger: -4 }, hook: Math.round(prod.potency * 2.2 * calm) };
}
export const use = (habit, prod, now) => ({ hook: clamp(habit.hook + useEffect(prod).hook, 0, 100), last: now });

// Needs lost per game minute while hooked (nothing below 15).
export function drain(hook) {
  if (hook < 15) return null;
  const k = hook / 100;
  return { mood: -0.06 * k, energy: -0.03 * k, hunger: -0.02 * k };
}
export const label = hook => (hook < 15 ? '' : hook < 40 ? 'craving' : hook < 70 ? 'hooked' : 'dependent');

// Once a day: a day without using lets the hook ease a little, but a real habit makes the day miserable (withdrawal).
export function habitDaily(habit, now) {
  const clean = now - habit.last >= 1440;
  if (!clean) return { habit, withdrawal: false };
  return { habit: { ...habit, hook: Math.max(0, habit.hook - 3) }, withdrawal: habit.hook >= 30 };
}
export const WITHDRAWAL = { mood: -12, energy: -8 };

export function cleanHabits(raw, ids) {
  const out = {};
  if (raw && typeof raw === 'object') for (const id of ids) {
    const h = raw[id];
    if (h && Number.isFinite(h.hook) && h.hook > 0) out[id] = { hook: clamp(Math.floor(h.hook), 0, 100), last: Number.isFinite(h.last) ? Math.floor(h.last) : -99999 };
  }
  return out;
}
