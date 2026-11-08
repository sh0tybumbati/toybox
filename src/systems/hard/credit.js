// Credit (pure). `h` is the hard-mode block: { debt, bills, billId, credit: { score, next, cards: [{ tier, balance }], pay: 'cash' | 'card', active },
// loans: [{ id, slot, balance, rate, payment, left, missed, value }] }. A bill from here has `kind` 'card' | 'mortgage' | 'debt' and a `ref`.
import { CARDS, CREDIT_TIERS, CYCLE, DEBT_PAYMENT, FORECLOSE_AFTER, MAX_CARDS, MAX_MORTGAGES, MIN_PAYMENT, MORTGAGE_MIN_SCORE, MORTGAGE_TERM, SALE_RATE, SCORE, SCORE_EVENTS } from '../../data/hard/credit.js';

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export const newCredit = (score = SCORE_EVENTS.start, day = 0) => ({ score: clamp(Math.round(score), SCORE.min, SCORE.max), next: (Math.floor(day / CYCLE) + 1) * CYCLE, cards: [], pay: 'cash', active: 0 });

export const tierOf = score => CREDIT_TIERS.find(t => score >= t.from);
export const bump = (credit, points) => { credit.score = clamp(credit.score + points, SCORE.min, SCORE.max); return credit.score; };

// --- cards --------------------------------------------------------------------------------------
export const limitOf = card => CARDS[card.tier].limit;
export const availableOn = card => Math.max(0, limitOf(card) - card.balance);
export const activeCard = credit => (credit.pay === 'card' ? credit.cards[credit.active] || credit.cards[0] || null : null);
// What the card can still cover right now (0 when you are paying in cash).
export const creditLeft = credit => { const c = activeCard(credit); return c ? availableOn(c) : 0; };
export const totalLimit = credit => credit.cards.reduce((n, c) => n + limitOf(c), 0);
export const totalBalance = credit => credit.cards.reduce((n, c) => n + c.balance, 0);

export function whyNotCard(credit, tier) {
  if (!CARDS[tier]) return 'no such card';
  if (credit.cards.length >= MAX_CARDS) return `at most ${MAX_CARDS} cards`;
  if (credit.cards.some(c => c.tier === tier)) return 'you have it';
  return credit.score >= CARDS[tier].min ? '' : `needs a score of ${CARDS[tier].min}`;
}
export function openCard(credit, tier) {
  if (whyNotCard(credit, tier)) return false;
  credit.cards.push({ tier, balance: 0 });
  bump(credit, SCORE_EVENTS.cardOpened);                      // a hard check on your file
  if (credit.cards.length === 1) credit.active = 0;
  return true;
}
// Charge `n` to the active card first; returns what could not go on it.
export function chargeCard(credit, n) {
  const c = activeCard(credit);
  if (!c) return n;
  const used = Math.min(n, availableOn(c));
  c.balance += used;
  return n - used;
}
export const payCard = (credit, index, n, cash) => {
  const c = credit.cards[index];
  if (!c) return null;
  const amount = Math.min(n, c.balance, cash);
  if (amount <= 0) return null;
  c.balance -= amount;
  return { amount, cash: cash - amount };
};

// --- mortgages ----------------------------------------------------------------------------------
export const amortised = (principal, rate, n) => (rate ? Math.round((principal * rate) / (1 - Math.pow(1 + rate, -n))) : Math.round(principal / n));

// What the bank offers on a house of `price`: the down payment, the loan, the monthly payment. Returns { why } when it will not lend.
export function mortgageOffer(h, price) {
  const t = tierOf(h.credit.score);
  if (h.credit.score < MORTGAGE_MIN_SCORE) return { why: `needs a score of ${MORTGAGE_MIN_SCORE}` };
  if ((h.loans || []).length >= MAX_MORTGAGES) return { why: `at most ${MAX_MORTGAGES} mortgages` };
  const down = Math.ceil((price * t.down) / 100) * 100, balance = price - down;
  return { tier: t, down, balance, rate: t.rate, payment: amortised(balance, t.rate, MORTGAGE_TERM), term: MORTGAGE_TERM };
}
// Take the mortgage for a house at `slot`: the caller has taken the down payment. Returns the loan.
export function takeMortgage(h, slot, price, offer) {
  const loan = { id: ((h.loans || []).reduce((m, l) => Math.max(m, l.id), 0)) + 1, slot, balance: offer.balance, rate: offer.rate, payment: offer.payment, left: offer.term, missed: 0, value: Math.round(price * SALE_RATE) };
  h.loans = [...(h.loans || []), loan];
  return loan;
}

// --- the monthly statement ------------------------------------------------------------------------
const minOf = (balance, rule) => Math.min(balance, Math.max(rule.floor, Math.ceil(balance * rule.share)));

// Statement day: interest on cards, mortgages and old debt, one bill each, and a look at how you are doing. Returns the events.
export function statement(h, day) {
  const events = [];
  const issue = (kind, amount, ref, extra = {}) => { h.bills.push({ id: ++h.billId, kind, amount, issued: day, due: day + 10, late: false, seen: false, ref, ...extra }); };
  const cr = h.credit, t = tierOf(cr.score);
  cr.cards.forEach((c, i) => {
    if (c.balance <= 0) return;
    c.balance += Math.round(c.balance * CARDS[c.tier].rate);
    issue('card', minOf(c.balance, MIN_PAYMENT), i);
  });
  for (const l of h.loans || []) {
    const interest = Math.round(l.balance * l.rate), last = l.left <= 1;
    const prin = last ? l.balance : Math.max(0, Math.min(l.balance, l.payment - interest));
    issue('mortgage', prin + interest, l.id, { prin });
  }
  if (h.debt > 0) {
    h.debt += Math.round(h.debt * t.rate);
    issue('debt', minOf(h.debt, DEBT_PAYMENT), 0);
  }
  const util = totalLimit(cr) ? totalBalance(cr) / totalLimit(cr) : 0;
  if (totalBalance(cr) > 0 && util < 0.3) bump(cr, SCORE_EVENTS.lowUse);
  if (util > 0.9) bump(cr, SCORE_EVENTS.highUse);
  if (h.debt > 0) bump(cr, SCORE_EVENTS.owingDebt);
  cr.next += CYCLE;
  if (h.bills.length) events.push({ type: 'statement' });
  return events;
}

// Run every statement that has come due by `day`.
export function creditDaily(h, day) {
  const events = [];
  while (day >= h.credit.next) events.push(...statement(h, h.credit.next));
  return events;
}

// A bill from here went late (it happens once per bill). Returns the events: { type: 'foreclose', loan } when the bank takes a house.
export function onLate(h, bill) {
  const events = [];
  if (bill.kind === 'mortgage') {
    bump(h.credit, SCORE_EVENTS.lateMortgage);
    const loan = (h.loans || []).find(l => l.id === bill.ref);
    if (loan && ++loan.missed >= FORECLOSE_AFTER) events.push({ type: 'foreclose', loan });
  } else if (['card', 'debt'].includes(bill.kind)) bump(h.credit, SCORE_EVENTS.late);
  else bump(h.credit, SCORE_EVENTS.late);               // rent and utilities too
  return events;
}

// Bills were paid (the list of the bills that left the pile): the balances come down and on-time payers earn a little score.
export function settle(h, paid, day) {
  for (const b of paid) {
    if (b.kind === 'card') { const c = h.credit.cards[b.ref]; if (c) c.balance = Math.max(0, c.balance - b.amount); }
    else if (b.kind === 'debt') h.debt = Math.max(0, h.debt - b.amount);
    else if (b.kind === 'mortgage') {
      const l = (h.loans || []).find(x => x.id === b.ref);
      if (l) { l.balance = Math.max(0, l.balance - (b.prin || 0)); l.left = Math.max(0, l.left - 1); if (l.balance <= 0 || l.left <= 0) h.loans = h.loans.filter(x => x !== l); }
    }
    if (day <= b.due && !b.late) bump(h.credit, SCORE_EVENTS.onTime);
  }
}

// The bank takes a house: returns { slot, shortfall, surplus } and removes the loan and its bills.
export function foreclose(h, loan) {
  h.loans = (h.loans || []).filter(l => l !== loan);
  h.bills = h.bills.filter(b => !(b.kind === 'mortgage' && b.ref === loan.id));
  bump(h.credit, SCORE_EVENTS.foreclosed);
  return { slot: loan.slot, shortfall: Math.max(0, loan.balance - loan.value), surplus: Math.max(0, loan.value - loan.balance) };
}

// Pay old debt (or any loan) down from the bank counter. Returns { debt, cash, paid } or null.
export function payDebt(debt, cash, n) {
  const amount = Math.min(n, debt, cash);
  return amount > 0 ? { debt: debt - amount, cash: cash - amount, paid: amount } : null;
}

// Pay a mortgage off outright. Returns { cash } or null.
export function payOff(h, loan, cash) {
  if (cash < loan.balance) return null;
  h.loans = h.loans.filter(l => l !== loan);
  h.bills = h.bills.filter(b => !(b.kind === 'mortgage' && b.ref === loan.id));
  return { cash: cash - loan.balance };
}

export function cleanCredit(raw, day = 0) {
  const c = raw && typeof raw === 'object' ? raw : {};
  const out = newCredit(Number.isFinite(c.score) ? c.score : SCORE_EVENTS.start, day);
  if (Number.isFinite(c.next)) out.next = Math.max(0, Math.floor(c.next));
  out.cards = (Array.isArray(c.cards) ? c.cards : []).filter(x => x && CARDS[x.tier] && Number.isFinite(x.balance)).slice(0, MAX_CARDS).map(x => ({ tier: x.tier, balance: clamp(Math.floor(x.balance), 0, CARDS[x.tier].limit * 2) }));
  out.pay = c.pay === 'card' && out.cards.length ? 'card' : 'cash';
  out.active = Number.isInteger(c.active) && c.active >= 0 && c.active < out.cards.length ? c.active : 0;
  return out;
}
export function cleanLoans(raw) {
  return (Array.isArray(raw) ? raw : []).filter(l => l && [l.id, l.slot, l.balance, l.rate, l.payment, l.left, l.value].every(Number.isFinite)).slice(0, MAX_MORTGAGES)
    .map(l => ({ id: Math.floor(l.id), slot: clamp(Math.floor(l.slot), 0, 19), balance: Math.max(0, Math.floor(l.balance)), rate: clamp(l.rate, 0, 0.1), payment: Math.max(0, Math.floor(l.payment)), left: clamp(Math.floor(l.left), 0, 60), missed: clamp(Math.floor(l.missed) || 0, 0, 9), value: Math.max(0, Math.floor(l.value)) }));
}
