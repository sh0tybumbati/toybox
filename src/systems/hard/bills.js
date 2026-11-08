// Rent and bills (pure). `h` is the hard-mode block: { home: { slot, tier, next } | null, bills: [...], billId, debt, lockedOut }.
// A bill is { id, kind, amount, issued, due, late, seen }; days are whole day numbers.
import { HOUSING, LATE_FEE } from '../../data/hard/housing.js';

const HOME_BILLS = ['rent', 'utilities'];                 // the bills that can cost you the place you live in (cards and loans have their own rules)
export const newHome = (tier, slot, next = 0) => ({ slot, tier, next });

// Time has reached `day`: issue the bills that are due to be issued, add late fees, and evict a tenant who is too far behind.
// Returns the events: { type: 'issued', count } | { type: 'late', bill } | { type: 'evicted', slot, owed }.
export function tickBills(h, day) {
  const events = [];
  const t = h.home && HOUSING[h.home.tier];
  let issued = 0;
  while (t && day >= h.home.next) {
    for (const [kind, amount] of t.bills) { const extra = kind === 'utilities' ? (h.power || 0) : 0; if (extra) h.power = 0; h.bills.push({ id: ++h.billId, kind, amount: amount + extra, issued: h.home.next, due: h.home.next + t.due, late: false, seen: false }); issued++; }
    h.home.next += t.cycle;
  }
  if (issued) events.push({ type: 'issued', count: issued });
  for (const b of h.bills) if (!b.late && day > b.due) { b.late = true; b.amount += Math.ceil(b.amount * LATE_FEE); events.push({ type: 'late', bill: b }); }
  if (t && !t.owner && h.bills.some(b => HOME_BILLS.includes(b.kind) && day > b.due + t.grace)) {          // too far behind on the rent: the locks are changed and what is owed becomes debt
    const owed = totalDue(h.bills.filter(b => HOME_BILLS.includes(b.kind)));
    events.push({ type: 'evicted', slot: h.home.slot, owed });
    h.debt += owed; h.bills = h.bills.filter(b => !HOME_BILLS.includes(b.kind)); h.lockedOut = h.home.slot; h.home = null;
  }
  return events;
}

export const totalDue = bills => bills.reduce((n, b) => n + b.amount, 0);
export const overdue = (bills, day) => bills.filter(b => day > b.due);
export const unseen = bills => bills.filter(b => !b.seen);

// Pay bills (all of them, or the ids given), oldest first, as many as `cash` covers. Returns { bills, cash, paid } (paid = amount spent).
export function pay(bills, cash, ids) {
  let left = cash, paid = 0;
  const kept = [], gone = [];
  for (const b of [...bills].sort((a, c) => a.due - c.due)) {
    if ((!ids || ids.includes(b.id)) && b.amount <= left) { left -= b.amount; paid += b.amount; gone.push(b); } else kept.push(b);
  }
  return { bills: kept, cash: left, paid, gone };
}

// Rent a room for the first time: you pay the first period now, the next bill comes a cycle later. Returns { home, cash } or null.
export function rent(tier, slot, cash, day) {
  const t = HOUSING[tier], first = t.bills.reduce((n, [, a]) => n + a, 0);
  if (!t || cash < first) return null;
  return { home: newHome(tier, slot, day + t.cycle), cash: cash - first, cost: first };
}

export function cleanBills(raw) {
  return (Array.isArray(raw) ? raw : []).filter(b => b && typeof b.kind === 'string' && Number.isFinite(b.amount) && Number.isFinite(b.due) && Number.isFinite(b.issued) && Number.isFinite(b.id))
    .slice(0, 24).map(b => ({ id: Math.floor(b.id), kind: b.kind.slice(0, 16), amount: Math.max(0, Math.floor(b.amount)), issued: Math.floor(b.issued), due: Math.floor(b.due), late: Boolean(b.late), seen: Boolean(b.seen), ...(Number.isFinite(b.ref) ? { ref: Math.floor(b.ref) } : {}), ...(Number.isFinite(b.prin) ? { prin: Math.max(0, Math.floor(b.prin)) } : {}) }));
}
export function cleanHome(raw) {
  return raw && typeof raw === 'object' && HOUSING[raw.tier] && Number.isInteger(raw.slot) && raw.slot >= 0 && raw.slot < 12 && Number.isFinite(raw.next)
    ? { slot: raw.slot, tier: raw.tier, next: Math.max(0, Math.floor(raw.next)) } : null;
}
