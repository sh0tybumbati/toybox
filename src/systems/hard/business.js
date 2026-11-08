// Running a business (pure). A building you own can carry `biz`:
//   { type, till, rep (0-100), markup (%), vacancy, shift (the day you last worked a shift), staff: [], candidates: [], nextRates (day), open (since day), last: { day, revenue, profit } }
//   staff = { name, role, skill (0-100), rel (hidden), wage (a week), next (next pay day), happy, sick }
// Everything random takes an `rng` (a function giving 0..1), so it can be tested.
import { BIZ, BIZ_TYPES, CANDIDATE_DAYS, MARKUPS, MAX_CANDIDATES, MAX_CAPACITY, MAX_STAFF, ROLES, SELF_CAPACITY, SICK_BASE, STAFF_PAY_DAYS, VACANCY_CHANCE } from '../../data/hard/business.js';
import { CYCLE } from '../../data/hard/credit.js';
import { FIRST, LAST } from '../../data/hard/landlord.js';

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const pick = (list, rng) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

export const newBiz = (type, day = 0) => ({ type, till: 0, rep: 50, markup: 0, vacancy: false, shift: -1, staff: [], candidates: [], nextRates: day + CYCLE, open: day, last: null });
export const isBiz = b => Boolean(b && b.biz);

// A job-seeker: skill and reliability are hidden behind a job history line; the wage they ask grows with skill.
export function candidate(rng, day) {
  const skill = Math.round(15 + rng() * 80), rel = Math.round(rng() * 100);
  return { name: `${pick(FIRST, rng)} ${pick(LAST, rng)}`, role: pick(ROLES, rng), skill, rel, wage: Math.round((4000 + skill * 40) * (0.9 + rng() * 0.2) / 100) * 100, day };
}
// What an applicant's history suggests (all they will tell you).
export const historyOf = c => (c.skill >= 70 ? 'years of experience' : c.skill >= 40 ? 'some experience' : 'just starting out');

// What a day's work is worth: staff who turn up and your own shift, up to a limit.
export const capacityOf = (staff, shifted) => Math.min(MAX_CAPACITY, staff.filter(s => !s.sick).reduce((n, s) => n + (0.5 * s.skill) / 50, 0) + (shifted ? SELF_CAPACITY : 0));
// Prices above the going rate earn more per sale but sell less, and put customers off over time.
export const priceFactor = markup => (1 + markup / 100) * (1 - 0.6 * (markup / 100));
export const repFactor = rep => 0.7 + 0.6 * (rep / 100);

// One day (`day` has just ended). Returns { revenue, cogs, profit, owed (wages the till could not pay), events }.
// The caller takes `owed` from the owner's pocket (staff who are not paid at all quit: see `unpaid`).
export function bizDaily(biz, day, rng, { shifted = false } = {}) {
  const events = [], def = BIZ[biz.type];
  biz.candidates = biz.candidates.filter(c => day - c.day <= CANDIDATE_DAYS);
  if (biz.vacancy && biz.staff.length < MAX_STAFF && biz.candidates.length < MAX_CANDIDATES && rng() < VACANCY_CHANCE) {
    const c = candidate(rng, day); biz.candidates.push(c); events.push({ type: 'candidate', name: c.name });
  }
  for (const s of biz.staff) {                                           // who turns up today
    s.sick = rng() < SICK_BASE * (1 - s.rel / 100);
    if (s.sick) events.push({ type: 'sick', name: s.name });
  }
  const cap = capacityOf(biz.staff, shifted);
  const revenue = Math.round(def.base * cap * priceFactor(biz.markup) * repFactor(biz.rep));
  const cogs = Math.round(revenue * def.cogs);
  let profit = revenue - cogs, owed = 0;
  biz.till += profit;
  // reputation: busy, fairly priced days build it, closed days and gouging wear it down
  biz.rep = clamp(biz.rep + (cap === 0 ? -1 : biz.markup <= 10 ? 0.5 : biz.markup <= 20 ? 0 : -0.5) + (cap >= 1 ? 0.2 : 0), 0, 100);
  const unpaid = [];
  for (const s of biz.staff) {                                           // weekly wages
    if (day < s.next) continue;
    s.next += STAFF_PAY_DAYS;
    const fromTill = Math.min(biz.till, s.wage); biz.till -= fromTill;
    if (fromTill < s.wage) { owed += s.wage - fromTill; unpaid.push(s); }
    profit -= s.wage;
  }
  for (const s of biz.staff) {                                           // mood: a fair wage and a working week keep people
    const fair = s.wage >= (4000 + s.skill * 40) * 0.9;
    s.happy = clamp(s.happy + (fair ? 1 : -1), 0, 100);
    if (s.happy <= 0) { s.quit = true; events.push({ type: 'quit', name: s.name }); }
  }
  biz.staff = biz.staff.filter(s => !s.quit);
  biz.last = { day, revenue, profit };
  return { revenue, cogs, profit, owed, unpaid, events };
}

// The owner could not cover some wages: those workers quit.
export function walkOut(biz, workers) {
  const events = [];
  for (const w of workers) { const i = biz.staff.indexOf(w); if (i >= 0) { biz.staff.splice(i, 1); events.push({ type: 'quit', name: w.name, unpaid: true }); } }
  return events;
}

// --- what you do --------------------------------------------------------------------------------
export function hire(biz, index, day) {
  const c = biz.candidates[index];
  if (!c || biz.staff.length >= MAX_STAFF) return null;
  biz.candidates.splice(index, 1);
  const s = { name: c.name, role: c.role, skill: c.skill, rel: c.rel, wage: c.wage, next: day + STAFF_PAY_DAYS, happy: 70, sick: false };
  biz.staff.push(s);
  if (biz.staff.length >= MAX_STAFF) { biz.vacancy = false; biz.candidates = []; }
  return s;
}
export const fire = (biz, index) => (biz.staff[index] ? biz.staff.splice(index, 1)[0] : null);
export function raise(biz, index) { const s = biz.staff[index]; if (!s) return null; s.wage = Math.round((s.wage * 1.1) / 100) * 100; s.happy = clamp(s.happy + 15, 0, 100); return s.wage; }
export function setMarkup(biz, step) { const i = clamp(MARKUPS.indexOf(biz.markup) + step, 0, MARKUPS.length - 1); biz.markup = MARKUPS[i]; return biz.markup; }

// The shift you work yourself today; once a day.
export function workShift(biz, day) {
  if (biz.shift === day) return false;
  biz.shift = day;
  return true;
}
export const shiftedOn = (biz, endedDay) => biz.shift === endedDay;

// Take what is in the till. Returns the amount.
export function collect(biz) { const n = Math.max(0, biz.till); biz.till -= n; return n; }

export function cleanBiz(raw, day = 0) {
  if (!raw || typeof raw !== 'object' || !BIZ_TYPES.includes(raw.type)) return null;
  const num = (v, a, b, d = 0) => (Number.isFinite(v) ? clamp(Math.floor(v), a, b) : d);
  const person = p => ({ name: String(p.name || 'Worker').slice(0, 30), role: String(p.role || 'Assistant').slice(0, 20), skill: num(p.skill, 0, 100, 40), rel: num(p.rel, 0, 100, 50), wage: num(p.wage, 0, 1e6, 8000) });
  return {
    type: raw.type, till: num(raw.till, -1e7, 1e9), rep: clamp(Number.isFinite(raw.rep) ? raw.rep : 50, 0, 100), markup: MARKUPS.includes(raw.markup) ? raw.markup : 0,
    vacancy: Boolean(raw.vacancy), shift: num(raw.shift, -1, 1e6, -1), nextRates: num(raw.nextRates, 0, 1e6, day + CYCLE), open: num(raw.open, 0, 1e6, day),
    staff: (Array.isArray(raw.staff) ? raw.staff : []).filter(s => s && typeof s === 'object').slice(0, MAX_STAFF).map(s => ({ ...person(s), next: num(s.next, 0, 1e6, day + STAFF_PAY_DAYS), happy: num(s.happy, 0, 100, 70), sick: false })),
    candidates: (Array.isArray(raw.candidates) ? raw.candidates : []).filter(c => c && typeof c === 'object').slice(0, MAX_CANDIDATES).map(c => ({ ...person(c), day: num(c.day, 0, 1e6) })),
    last: raw.last && Number.isFinite(raw.last.revenue) ? { day: num(raw.last.day, 0, 1e6), revenue: num(raw.last.revenue, 0, 1e9), profit: num(raw.last.profit, -1e9, 1e9) } : null,
  };
}
