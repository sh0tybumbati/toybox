// Seasons and weather (pure, deterministic from the day, so a save always sees the same weather). A season is 28 game days.
export const SEASON_DAYS = 28;
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
export const YEAR_DAYS = SEASON_DAYS * SEASONS.length;
export const seasonOf = day => SEASONS[Math.floor(Math.max(0, day) / SEASON_DAYS) % SEASONS.length];
export const dayInSeason = day => (Math.max(0, day) % SEASON_DAYS) + 1;

const BASE_TEMP = { Spring: 11, Summer: 22, Autumn: 9, Winter: 0 };         // deg C, day average
const WET = { Spring: 0.35, Summer: 0.15, Autumn: 0.45, Winter: 0.3 };       // chance a 6-hour block has rain (or snow when freezing)
export const WEATHER_ICONS = { clear: '☀️', cloudy: '☁️', rain: '🌧️', snow: '❄️' };

// A repeatable pseudo-random number in 0..1 from an integer.
export function hash01(n) {
  let h = (Math.imul(Math.floor(n) ^ 0x9e3779b9, 0x85ebca6b) ^ 0x1b873593) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

// The weather on `day` at `minute`: { season, temp (deg C), kind: clear | cloudy | rain | snow }.
export function weatherAt(day, minute) {
  const season = seasonOf(day), block = Math.floor(minute / 360);
  const spell = (hash01(day * 31 + 5) - 0.5) * 8;                              // a warm or cold day
  const diurnal = 4 * Math.sin(((minute / 60 - 9) / 24) * Math.PI * 2);         // warmest mid-afternoon, coldest before dawn
  const temp = Math.round(BASE_TEMP[season] + spell + diurnal);
  const wet = hash01(day * 4 + block + 777) < WET[season];
  const kind = wet ? (temp <= 1 ? 'snow' : 'rain') : hash01(day * 4 + block + 1313) < 0.35 ? 'cloudy' : 'clear';
  return { season, temp, kind };
}

export const weatherLabel = w => `${WEATHER_ICONS[w.kind]} ${w.temp}°C`;
