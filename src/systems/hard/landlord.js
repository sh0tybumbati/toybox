// Letting a house (pure). A building you own can carry `let`:
//   { listed, rent, deposit: 0 | 1 (months), minTier: 'any' | 'fair' | 'good', id, tenant | null, applicants: [], repairs: [] }
//   tenant = { name, job, income, rel (hidden 0-100), score, since, next (next rent day), owed, late, happy, notice (day they go) | null, deposit }
// Everything random takes an `rng` (a function giving 0..1) so it can be tested.
import { APPLICANT_DAYS, DEFAULT_MARKET, FIRST, JOBS, LAST, MARKET_RENT, MAX_APPLICANTS, MAX_REPAIRS, MIN_TIERS, NOTICE_DAYS, REPAIRS, REPAIR_CHANCE, RENT_STEP, TIER_ORDER } from '../../data/hard/landlord.js';
import { CYCLE } from '../../data/hard/credit.js';
import { tierOf } from './credit.js';

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const pick = (list, rng) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
const tierRank = id => TIER_ORDER.indexOf(id);

// What this house would let for, from the blueprint it started as (or its size).
export function marketRent(building, startedAs) {
  if (startedAs && MARKET_RENT[startedAs]) return MARKET_RENT[startedAs];
  const rooms = building.floors.reduce((n, f) => n + f.rooms.length, 0);
  return Math.round((7000 + (rooms - 1) * 5500) / RENT_STEP) * RENT_STEP;
}

export const newLet = market => ({ listed: false, rent: market, deposit: 0, minTier: 'any', id: 0, tenant: null, applicants: [], repairs: [], market });
export const isLet = b => Boolean(b && b.let && b.let.tenant);

export const tierFor = score => tierOf(score);
export const passes = (minTier, score) => minTier === 'any' || tierRank(tierOf(score).id) >= tierRank(minTier);

// A made-up applicant; how reliable they are is hidden, but their credit tier gives a hint of it.
export function newApplicant(rng, day) {
  const [job, income] = pick(JOBS, rng), rel = Math.round(rng() * 100);
  return { name: `${pick(FIRST, rng)} ${pick(LAST, rng)}`, job, income: Math.round(income * (0.85 + rng() * 0.3) / 500) * 500, rel, score: clamp(Math.round(430 + rel * 3.6 + (rng() - 0.5) * 120), 300, 850), day };
}

// How likely a vacant, listed house is to draw an applicant today, from how its rent compares with the market.
export function interest(rent, market, damaged = false) {
  const r = rent / market, base = r <= 0.8 ? 0.6 : r <= 1 ? 0.6 - (r - 0.8) * 1.25 : r <= 1.2 ? 0.35 - (r - 1) * 1 : r <= 1.5 ? 0.15 - (r - 1.2) * 0.4 : 0.03;
  return clamp(base, 0.02, 0.6) * (damaged ? 0.5 : 1);
}

// --- the day -------------------------------------------------------------------------------------
// One day for one house. Returns the events: { type: 'applicant' | 'rent' | 'late' | 'repair' | 'left' | 'notice' | 'damage', ... } and pays nothing itself:
// money moves through `events` ({ type: 'rent', amount } etc.) which the caller adds to the owner's pocket.
export function letDaily(l, day, rng) {
  const events = [];
  l.applicants = l.applicants.filter(a => day - a.day <= APPLICANT_DAYS);
  if (!l.tenant) {
    if (l.listed && l.applicants.length < MAX_APPLICANTS && rng() < interest(l.rent, l.market, l.repairs.length > 0)) {
      for (let tries = 0; tries < 3; tries++) {
        const a = newApplicant(rng, day);
        if (passes(l.minTier, a.score)) { l.applicants.push(a); events.push({ type: 'applicant', name: a.name }); break; }
      }
    }
    return events;
  }
  const t = l.tenant;
  if (t.notice !== null && day >= t.notice) return [...events, ...leave(l, rng)];
  if (day >= t.next) {                                                      // rent day
    t.next += CYCLE;
    if (t.owed > 0 && rng() < 0.3 + 0.5 * (t.rel / 100)) { events.push({ type: 'rent', amount: t.owed, arrears: true, name: t.name }); t.owed = 0; t.late = 0; }
    if (rng() < 0.4 + 0.6 * (t.rel / 100)) { events.push({ type: 'rent', amount: l.rent, name: t.name }); t.late = 0; }
    else { t.owed += l.rent; t.late += 1; events.push({ type: 'late', name: t.name }); }
    if (t.late >= 3 && t.rel < 40 && t.notice === null) return [...events, ...leave(l, rng, true)];          // does a runner
  }
  if (l.repairs.length < MAX_REPAIRS && rng() < REPAIR_CHANCE) {
    const r = pick(REPAIRS, rng), id = ++l.id;
    l.repairs.push({ id, what: r.what, cost: Math.max(100, Math.round((l.rent * r.share) / 100) * 100), day });
    events.push({ type: 'repair', what: r.what });
  }
  const waiting = l.repairs.some(r => day - r.day > 7), over = l.rent > l.market * 1.2;      // happy tenants stay
  t.happy = clamp(t.happy + (waiting ? -3 : over ? -1 : 1), 0, 100);
  if (t.happy <= 0 && t.notice === null) { t.notice = day + 7; events.push({ type: 'notice', name: t.name, theirs: true }); }
  return events;
}

// The tenant goes (their notice ran out, or they skipped). Returns the events: { type: 'left', ... } and maybe { type: 'damage', cost }.
export function leave(l, rng, runner = false) {
  const t = l.tenant, events = [];
  const mess = runner || rng() < (100 - t.rel) / 250;
  const refund = mess ? 0 : t.deposit;
  events.push({ type: 'left', name: t.name, runner, owed: t.owed, refund });
  if (mess && l.repairs.length < MAX_REPAIRS) {
    const cost = Math.max(100, Math.round((l.rent * 0.6) / 100) * 100);
    l.repairs.push({ id: ++l.id, what: 'Damage left behind', cost, day: -1 });
    events.push({ type: 'damage', cost });
  }
  l.tenant = null;
  return events;
}

// --- what you do --------------------------------------------------------------------------------
export function whyNotLet(building, home, slot) {
  if (!building) return 'nothing there';
  if (!building.owned) return 'you do not own it';
  if (home && home.slot === slot) return 'you live there';
  return '';
}

// Accept an applicant: they move in, you collect the deposit. Returns { tenant, deposit } or null.
export function accept(l, index, day) {
  const a = l.applicants[index];
  if (!a || l.tenant) return null;
  const deposit = Math.round(l.rent * l.deposit);
  l.tenant = { name: a.name, job: a.job, income: a.income, rel: a.rel, score: a.score, since: day, next: day + CYCLE, owed: 0, late: 0, happy: 70, notice: null, deposit };
  l.applicants = [];
  l.listed = false;
  return { tenant: l.tenant, deposit };
}

export function serveNotice(l, day) {
  if (!l.tenant || l.tenant.notice !== null) return false;
  l.tenant.notice = day + NOTICE_DAYS;
  return true;
}

// Pay for a repair. Returns { cash, cost } or null. A tenant is pleased.
export function payRepair(l, id, cash) {
  const i = l.repairs.findIndex(r => r.id === id);
  if (i < 0 || cash < l.repairs[i].cost) return null;
  const [r] = l.repairs.splice(i, 1);
  if (l.tenant) l.tenant.happy = clamp(l.tenant.happy + 10, 0, 100);
  return { cash: cash - r.cost, cost: r.cost };
}

export const setRent = (l, delta) => { l.rent = clamp(l.rent + delta * RENT_STEP, RENT_STEP, 400000); return l.rent; };
export const cycleDeposit = l => { l.deposit = l.deposit ? 0 : 1; return l.deposit; };
export const cycleMinTier = l => { l.minTier = MIN_TIERS[(MIN_TIERS.indexOf(l.minTier) + 1) % MIN_TIERS.length]; return l.minTier; };

export function cleanLet(raw, market = DEFAULT_MARKET) {
  if (!raw || typeof raw !== 'object') return null;
  const num = (v, a, b, d = 0) => (Number.isFinite(v) ? clamp(Math.floor(v), a, b) : d);
  const name = v => String(v || 'Tenant').slice(0, 30);
  const person = p => ({ name: name(p.name), job: String(p.job || 'Worker').slice(0, 24), income: num(p.income, 0, 500000), rel: num(p.rel, 0, 100, 50), score: num(p.score, 300, 850, 600) });
  const t = raw.tenant && typeof raw.tenant === 'object' ? raw.tenant : null;
  return {
    listed: Boolean(raw.listed), rent: num(raw.rent, RENT_STEP, 400000, market), deposit: raw.deposit ? 1 : 0, minTier: MIN_TIERS.includes(raw.minTier) ? raw.minTier : 'any',
    id: num(raw.id, 0, 1e6), market: num(raw.market, RENT_STEP, 400000, market),
    tenant: t ? { ...person(t), since: num(t.since, 0, 1e6), next: num(t.next, 0, 1e6), owed: num(t.owed, 0, 1e7), late: num(t.late, 0, 99), happy: num(t.happy, 0, 100, 70), notice: Number.isFinite(t.notice) ? num(t.notice, 0, 1e6) : null, deposit: num(t.deposit, 0, 1e7) } : null,
    applicants: (Array.isArray(raw.applicants) ? raw.applicants : []).filter(a => a && typeof a === 'object').slice(0, MAX_APPLICANTS).map(a => ({ ...person(a), day: num(a.day, 0, 1e6) })),
    repairs: (Array.isArray(raw.repairs) ? raw.repairs : []).filter(r => r && Number.isFinite(r.cost)).slice(0, MAX_REPAIRS).map(r => ({ id: num(r.id, 0, 1e6), what: String(r.what || 'Repair').slice(0, 30), cost: num(r.cost, 0, 1e7), day: Number.isFinite(r.day) ? Math.floor(r.day) : 0 })),
  };
}
