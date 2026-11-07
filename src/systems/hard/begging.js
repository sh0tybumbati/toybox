// The begging mini-game's rules (pure). People walk past; now and then one glances your way: ask at that moment.
// Asking someone who isn't looking (or who already said no) annoys people, and three annoyed passers end the session.
export const DURATION = 30;                 // seconds of play (it costs an hour of game time)
export const PATIENCE = 3;
export const GLANCE = 1.1;                  // how long a passer is looking your way (s)

// By kind of passer: how likely they are to give when asked at the right moment, and about how much.
export const KINDS = {
  kind:    { give: 0.7,  amount: [80, 220], speed: 0.16 },
  neutral: { give: 0.3,  amount: [40, 140], speed: 0.2 },
  hurried: { give: 0.08, amount: [20, 80],  speed: 0.32 },
};

// How presentable you are changes how people react (clean and cheerful helps; filthy and miserable doesn't).
export const presentability = ({ hygiene = 60, mood = 60 } = {}) => 0.45 + 0.35 * (hygiene / 100) + 0.2 * (mood / 100);

export function newGame(needs = {}, rand = Math.random) {
  return { t: 0, patience: PATIENCE, earned: 0, passers: [], nextAt: 0.6, id: 0, look: presentability(needs), asked: 0, given: 0, rand };
}

const pickKind = r => (r < 0.3 ? 'kind' : r < 0.75 ? 'neutral' : 'hurried');

// Advance by `dt` seconds: move passers, start glances, spawn new ones. Returns the state.
export function step(g, dt) {
  g.t += dt;
  while (g.t >= g.nextAt && g.t < DURATION - 3) {
    const kind = pickKind(g.rand()), dir = g.rand() < 0.5 ? 1 : -1;
    g.passers.push({ id: ++g.id, kind, x: dir > 0 ? -0.05 : 1.05, dir, glanceAt: 0.25 + g.rand() * 0.5, looking: false, asked: false, done: false });
    g.nextAt += 0.9 + g.rand() * 1.3;
  }
  for (const p of g.passers) {
    p.x += p.dir * KINDS[p.kind].speed * dt;
    const progress = p.dir > 0 ? p.x : 1 - p.x;
    p.looking = !p.asked && progress >= p.glanceAt && progress < p.glanceAt + GLANCE * KINDS[p.kind].speed;
  }
  g.passers = g.passers.filter(p => p.x > -0.1 && p.x < 1.1);
  return g;
}

// You ask passer `id`. Returns { result: 'coin', amount } | { result: 'no' } | { result: 'annoyed' }.
export function ask(g, id) {
  const p = g.passers.find(q => q.id === id);
  if (!p) return { result: 'none' };
  g.asked++;
  if (p.asked || !p.looking) { p.asked = true; g.patience--; return { result: 'annoyed' }; }
  p.asked = true; p.looking = false;
  const k = KINDS[p.kind];
  if (g.rand() < k.give * g.look * 1.25) {
    const amount = Math.round(k.amount[0] + g.rand() * (k.amount[1] - k.amount[0]));
    g.earned += amount; g.given++;
    return { result: 'coin', amount };
  }
  return { result: 'no' };
}

export const over = g => g.t >= DURATION || g.patience <= 0;
