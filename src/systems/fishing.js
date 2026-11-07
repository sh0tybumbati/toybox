// The rules of fishing, as pure functions (the scene only draws): picking a catch and stepping the cast ->
// wait -> nibble -> bite -> reel cycle. `rand` is injected so it's deterministic in tests.
export const BITE_WINDOW = 1.0;                 // seconds you have to tap once it bites

// What you can catch. `weight` = how often; `power` = how hard it pulls (reeling is harder, strain builds faster).
export const CATCHES = [
  { id: 'sardine', name: 'A little fish', item: 'fish', coins: 1, weight: 52, power: 0.8 },
  { id: 'trout', name: 'A plump trout', item: 'fish', coins: 2, weight: 28, power: 1.1 },
  { id: 'golden', name: 'A GOLDEN fish', item: 'fish', coins: 5, weight: 6, power: 1.5, gold: true },
  { id: 'sock', name: 'An old sock', item: null, coins: 0, weight: 14, power: 0.5 },
];

export function pickCatch(rand = Math.random) {
  const total = CATCHES.reduce((n, c) => n + c.weight, 0);
  let r = rand() * total;
  for (const c of CATCHES) { r -= c.weight; if (r < 0) return c; }
  return CATCHES[0];
}

// Advance the fishing state `s` by dt. Returns an event: 'bite' | 'missed' | 'snap' | 'caught' | null.
// s = { phase: idle | cast | wait | nibble | bite | reel, t, wait, progress, strain, burst, burstIn, catch }
export function stepFishing(s, dt, holding, rand = Math.random) {
  s.t += dt;
  switch (s.phase) {
    case 'cast':
      if (s.t >= 0.5) { s.phase = 'wait'; s.t = 0; }
      return null;
    case 'wait':
      if (s.t >= s.wait) { s.phase = 'nibble'; s.t = 0; }
      return null;
    case 'nibble':
      if (s.t >= 0.5) { s.phase = 'bite'; s.t = 0; return 'bite'; }
      return null;
    case 'bite':
      if (s.t >= BITE_WINDOW) { s.phase = 'idle'; s.t = 0; return 'missed'; }
      return null;
    case 'reel': {
      const power = (s.catch ? s.catch.power : 1);
      s.burstIn -= dt;
      if (s.burstIn <= 0) { s.burst = 0.5; s.burstIn = 0.9 + rand() * 1.2; }          // the fish lunges every second or so
      s.burst = Math.max(0, s.burst - dt);
      if (holding) {
        s.progress += 0.2 * dt * (1 - Math.min(0.6, s.strain * 0.5));
        s.strain += (0.35 + (s.burst > 0 ? 0.9 : 0.05)) * power * dt;
      } else {
        s.strain = Math.max(0, s.strain - 0.8 * dt);
        s.progress = Math.max(0, s.progress - 0.04 * dt);                                // it swims off a little while you rest
      }
      if (s.strain >= 1) { s.phase = 'idle'; s.t = 0; return 'snap'; }
      if (s.progress >= 1) { s.phase = 'idle'; s.t = 0; return 'caught'; }
      return null;
    }
    default:
      return null;
  }
}
