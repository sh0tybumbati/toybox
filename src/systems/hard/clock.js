// The game clock (pure). 1 real second = 1 game minute at speed 1, so 1 real minute = 1 game hour and a day is 24 real minutes.
export const DAY_MIN = 1440;
export const SPEEDS = [0, 1, 3, 6];                       // pause, normal, fast, fastest (game minutes per real second)
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const NIGHT_FROM = 20 * 60, NIGHT_TO = 6 * 60;

export const newClock = () => ({ day: 0, minute: 8 * 60 });                       // Monday, 08:00

// `minutes` of game time pass (fractions fine). Returns the clock.
export function advance(c, minutes) {
  const total = c.minute + Math.max(0, minutes);
  c.day += Math.floor(total / DAY_MIN);
  c.minute = total % DAY_MIN;
  return c;
}

export const hourOf = c => Math.floor(c.minute / 60);
export const isNight = c => c.minute >= NIGHT_FROM || c.minute < NIGHT_TO;
export const dayName = c => DAYS[c.day % 7];
export const pad = n => String(n).padStart(2, '0');
export const timeLabel = c => `${pad(hourOf(c))}:${pad(Math.floor(c.minute % 60))}`;
export const label = c => `${dayName(c)} ${timeLabel(c)}`;

export function cleanClock(raw) {
  const ok = v => Number.isFinite(v);
  return raw && typeof raw === 'object' && ok(raw.day) && ok(raw.minute)
    ? { day: Math.min(1e6, Math.max(0, Math.floor(raw.day))), minute: Math.min(DAY_MIN - 0.001, Math.max(0, raw.minute)) }
    : newClock();
}

// How many game minutes pass in `dt` real seconds at a speed index (0..3).
export const gameMinutes = (dt, speedIndex) => dt * (SPEEDS[speedIndex] ?? 1);
