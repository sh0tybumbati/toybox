// Customers (pure): who wants something today, who turns up at the corner, what they will pay for a product, selling (cash or on credit),
// and how they get hooked. Every number is invented and is meant to be tuned in the balance pass.
import { hash01 } from './weather.js';
import { CUSTOMERS, CUSTOMER_IDS, TRUST_MAX } from '../../data/hard/customers.js';
import { unitValue } from './lab.js';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const seedOf = id => [...id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) % 9973, 7);

export const newCust = () => ({ trust: 0, hook: 0, owes: 0, bought: { day: -1, units: 0 }, last: -99 });
export const newCusts = () => Object.fromEntries(CUSTOMER_IDS.map(id => [id, newCust()]));

export const stageOf = hook => (hook < 20 ? 'fine' : hook < 40 ? 'regular' : hook < 70 ? 'hooked' : 'desperate');
export const STAGE_NOTE = { fine: 'Just now and then', regular: 'A regular', hooked: 'Hooked: looks rough, needs it', desperate: 'Desperate: thin, shaking, will pay anything' };

// How many units they want today (0 = nothing), and how many are still wanted after buying.
export function wants(id, st, day) {
  const p = clamp(0.4 + st.hook / 150 + st.trust * 0.02, 0, 0.95);
  if (hash01(day * 13 + seedOf(id)) > p) return 0;
  return 1 + (hash01(day * 7 + seedOf(id) + 3) > 0.6 ? 1 : 0) + (st.hook >= 40 ? 1 : 0);
}
export const stillWants = (id, st, day) => Math.max(0, wants(id, st, day) - (st.bought.day === day ? st.bought.units : 0));

// Who texts the burner: people who know you (trust 2+) or are hooked, and want something today.
export const texters = (custs, day) => CUSTOMER_IDS.filter(id => stillWants(id, custs[id], day) > 0 && (custs[id].trust >= 2 || custs[id].hook >= 30));
// Who is at the corner after dark: the texters (if you have a phone), plus about half of the others who want something.
export const atCorner = (custs, day, phone) => CUSTOMER_IDS.filter(id => {
  if (stillWants(id, custs[id], day) <= 0) return false;
  return (phone && texters(custs, day).includes(id)) || hash01(day * 29 + seedOf(id) + 9) < 0.5;
});

// What `id` would pay per unit for `prod`, or why not: { ok, price } | { ok: false, why }.
export function offer(id, st, prod) {
  const c = CUSTOMERS[id];
  if (prod.purity < c.minPurity) return { ok: false, why: `${c.name.split(' ')[0]} wants it purer (${c.minPurity}%+)` };
  const mult = { potency: clamp(0.6 + (prod.potency - 5) * 0.12, 0.6, 1.5), purity: clamp(0.5 + prod.purity / 100, 0.5, 1.5), calm: prod.effects.includes('calm') ? 1.4 : 0.9, cheap: 0.7 }[c.likes];
  return { ok: true, price: Math.max(10, Math.round(unitValue(prod) * mult * (1 + st.trust * 0.02 + (st.hook >= 40 ? 0.15 : 0)) / 10) * 10) };
}

export const creditLimit = id => Math.round(CUSTOMERS[id].wallet * 1.2);

// Sell `units` of `prod` to `id` today. Cash covers what the wallet can; with `credit` the rest goes on their tab (up to the limit).
// Returns { st, sold, cash, owed } (sold may be fewer than asked).
export function sell(id, st, prod, units, day, credit = false) {
  const c = CUSTOMERS[id], o = offer(id, st, prod);
  if (!o.ok) return { st, sold: 0, cash: 0, owed: 0 };
  const n = Math.min(units, stillWants(id, st, day));
  const room = Math.max(0, c.wallet - 0), byCash = Math.min(n, Math.floor(room / o.price));
  let sold = byCash, owed = 0;
  if (credit) {
    const more = Math.min(n - byCash, Math.floor(Math.max(0, creditLimit(id) - st.owes) / o.price));
    sold += more; owed = more * o.price;
  }
  if (!sold) return { st, sold: 0, cash: 0, owed: 0 };
  const calm = prod.effects.includes('calm') ? 0.7 : 1;
  const next = {
    ...st, trust: Math.min(TRUST_MAX, st.trust + 1), owes: st.owes + owed, last: day,
    hook: clamp(st.hook + Math.round(sold * prod.potency * 1.2 * c.hookRate * calm), 0, 100),
    bought: { day, units: (st.bought.day === day ? st.bought.units : 0) + sold },
  };
  return { st: next, sold, cash: byCash * o.price, owed };
}

// Collect what they owe: they pay what the wallet allows. Returns { st, cash }.
export function collect(id, st) {
  const cash = Math.min(st.owes, CUSTOMERS[id].wallet);
  return { st: { ...st, owes: st.owes - cash }, cash };
}

// A day passes: someone who has not had any for a few days slowly comes down.
export function customersDaily(custs, day) {
  return Object.fromEntries(Object.entries(custs).map(([id, st]) => [id, day - st.last >= 3 && st.hook > 0 ? { ...st, hook: Math.max(0, st.hook - 2) } : st]));
}

export function cleanCusts(raw) {
  const out = newCusts();
  if (!raw || typeof raw !== 'object') return out;
  for (const id of CUSTOMER_IDS) {
    const s = raw[id];
    if (!s || typeof s !== 'object') continue;
    const num = (v, lo, hi, d = 0) => (Number.isFinite(v) ? clamp(Math.floor(v), lo, hi) : d);
    out[id] = { trust: num(s.trust, 0, TRUST_MAX), hook: num(s.hook, 0, 100), owes: num(s.owes, 0, 1e6), last: num(s.last, -99, 1e6, -99), bought: s.bought && Number.isFinite(s.bought.day) ? { day: num(s.bought.day, -1, 1e6, -1), units: num(s.bought.units, 0, 99) } : { day: -1, units: 0 } };
  }
  return out;
}
