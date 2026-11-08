import test from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, CREDIT_TIERS, CYCLE, FORECLOSE_AFTER, MORTGAGE_TERM, SALE_RATE } from '../src/data/hard/credit.js';
import { amortised, availableOn, bump, chargeCard, cleanCredit, cleanLoans, creditDaily, creditLeft, foreclose, mortgageOffer, newCredit, onLate, openCard, payCard, payDebt, payOff, settle, takeMortgage, tierOf, whyNotCard } from '../src/systems/hard/credit.js';
import { cleanBills, pay, tickBills } from '../src/systems/hard/bills.js';

const fresh = (score = 640, day = 0) => ({ debt: 0, bills: [], billId: 0, home: null, credit: newCredit(score, day), loans: [] });

test('the score is clamped to 300-850 and picks one of four tiers', () => {
  const c = newCredit(9999); assert.equal(c.score, 850);
  assert.equal(bump(c, -9999), 300);
  assert.deepEqual([850, 700, 600, 400].map(s => tierOf(s).id), ['excellent', 'good', 'fair', 'poor']);
  const rates = CREDIT_TIERS.map(t => t.rate); assert.deepEqual([...rates].sort((a, b) => a - b), rates, 'better tiers pay less');
});

test('cards: approval needs the score, three at most, and a card adds to what you can spend only when you pay by card', () => {
  const c = newCredit(640);
  assert.equal(whyNotCard(c, 'platinum'), 'needs a score of 740');
  assert.equal(whyNotCard(c, 'silver'), '');
  assert.equal(openCard(c, 'silver'), true); assert.equal(c.score, 640 - 5, 'a hard check costs a little');
  assert.equal(whyNotCard(c, 'silver'), 'you have it');
  assert.equal(creditLeft(c), 0, 'paying in cash: the card is not counted');
  c.pay = 'card';
  assert.equal(creditLeft(c), CARDS.silver.limit);
  assert.equal(chargeCard(c, 1000), 0); assert.equal(c.cards[0].balance, 1000); assert.equal(availableOn(c.cards[0]), CARDS.silver.limit - 1000);
  assert.equal(chargeCard(c, CARDS.silver.limit), 1000, 'the part the card cannot cover is returned');
  assert.deepEqual(payCard(c, 0, 500, 5000), { amount: 500, cash: 4500 });
  assert.equal(payCard(c, 0, 500, 0), null);
});

test('a mortgage: the down payment falls with a better tier, the payments add up, and the limits hold', () => {
  const h = fresh(640);
  const fair = mortgageOffer(h, 400000); h.credit.score = 760; const best = mortgageOffer(h, 400000);
  assert.ok(best.down < fair.down && best.rate < fair.rate, 'a better score: less down, a lower rate');
  assert.equal(fair.down, 80000);
  assert.ok(fair.payment * MORTGAGE_TERM >= fair.balance, 'the payments cover the loan');
  assert.equal(amortised(1200, 0, 12), 100);
  h.credit.score = 450; assert.match(mortgageOffer(h, 400000).why, /score/);
  h.credit.score = 700; takeMortgage(h, 3, 400000, mortgageOffer(h, 400000)); takeMortgage(h, 4, 100000, mortgageOffer(h, 100000));
  assert.match(mortgageOffer(h, 1).why, /at most/);
});

test('statements: interest on the card and the debt, a bill for each, one a month', () => {
  const h = fresh(640); openCard(h.credit, 'silver'); h.credit.cards[0].balance = 4000; h.debt = 100000;
  takeMortgage(h, 3, 400000, mortgageOffer(h, 400000));
  assert.deepEqual(creditDaily(h, 10), [], 'not yet');
  creditDaily(h, CYCLE);
  const kinds = h.bills.map(b => b.kind).sort(); assert.deepEqual(kinds, ['card', 'debt', 'mortgage']);
  assert.ok(h.credit.cards[0].balance > 4000, 'interest was added'); assert.ok(h.debt > 100000);
  const card = h.bills.find(b => b.kind === 'card'); assert.ok(card.amount >= 200 && card.amount < h.credit.cards[0].balance);
  assert.equal(h.credit.next, 2 * CYCLE);
  creditDaily(h, 2 * CYCLE); assert.equal(h.bills.filter(b => b.kind === 'card').length, 2);
});

test('paying a bill brings the balance down and a bill paid on time earns score; late costs more than on time earns', () => {
  const h = fresh(640); openCard(h.credit, 'silver'); h.credit.cards[0].balance = 4000; const s0 = h.credit.score;
  creditDaily(h, CYCLE);
  const bill = h.bills[0], before = h.credit.cards[0].balance, r = pay(h.bills, 1e6);
  settle(h, r.gone, CYCLE + 1);
  assert.equal(h.credit.cards[0].balance, before - bill.amount); assert.equal(h.credit.score, s0 + 2);
  const h2 = fresh(640); openCard(h2.credit, 'silver'); h2.credit.cards[0].balance = 4000; creditDaily(h2, CYCLE);
  const events = tickBills(h2, CYCLE + 11).filter(e => e.type === 'late');
  assert.equal(events.length, 1);
  const s1 = h2.credit.score; onLate(h2, events[0].bill);
  assert.equal(h2.credit.score, s1 - 25);
});

test('three late mortgage payments and the bank takes the house; the sale pays the loan and any shortfall is debt', () => {
  const h = fresh(700), offer = mortgageOffer(h, 400000), loan = takeMortgage(h, 3, 400000, offer);
  assert.equal(loan.value, Math.round(400000 * SALE_RATE));
  let out = [];
  for (let i = 0; i < FORECLOSE_AFTER; i++) out = onLate(h, { kind: 'mortgage', ref: loan.id });
  assert.equal(out[0].type, 'foreclose');
  const s = h.credit.score, r = foreclose(h, loan);
  assert.equal(h.loans.length, 0); assert.ok(h.credit.score < s);
  assert.equal(r.slot, 3); assert.equal(r.shortfall, Math.max(0, loan.balance - loan.value));
  assert.ok(r.shortfall > 0, 'the bank only gets 80% of the price, and not much was paid down');
  const owing = { ...loan, balance: 100000 }; const back = foreclose(fresh(), owing);
  assert.equal(back.shortfall, 0); assert.equal(back.surplus, loan.value - 100000);
});

test('mortgage payments run down the loan and clear it at the end; it can be paid off, and old debt paid down', () => {
  const h = fresh(700), offer = mortgageOffer(h, 120000), loan = takeMortgage(h, 3, 120000, offer);
  for (let i = 0; i < MORTGAGE_TERM; i++) { creditDaily(h, CYCLE * (i + 1)); const r = pay(h.bills, 1e9); h.bills = r.bills; settle(h, r.gone, CYCLE * (i + 1)); }
  assert.equal(h.loans.length, 0, 'paid off by the last payment');
  const h2 = fresh(700), l2 = takeMortgage(h2, 3, 120000, mortgageOffer(h2, 120000));
  assert.equal(payOff(h2, l2, 10), null); assert.equal(payOff(h2, l2, 1e9).cash, 1e9 - l2.balance); assert.equal(h2.loans.length, 0);
  assert.deepEqual(payDebt(1000, 5000, 400), { debt: 600, cash: 4600, paid: 400 }); assert.equal(payDebt(0, 5000, 400), null);
});

test('saved credit is cleaned, and bills keep their link to a card or loan', () => {
  const c = cleanCredit({ score: 5000, next: 56, cards: [{ tier: 'gold', balance: 10 }, { tier: 'nope', balance: 1 }], pay: 'card', active: 7 });
  assert.equal(c.score, 850); assert.equal(c.cards.length, 1); assert.equal(c.pay, 'card'); assert.equal(c.active, 0);
  assert.equal(cleanCredit({ pay: 'card', cards: [] }).pay, 'cash');
  assert.equal(cleanLoans([{ id: 1, slot: 3, balance: 10, rate: 0.01, payment: 5, left: 3, value: 9 }, { id: 'x' }]).length, 1);
  assert.deepEqual(cleanBills([{ id: 1, kind: 'card', amount: 5, issued: 0, due: 3, ref: 1.9, prin: 4 }])[0].ref, 1);
});

test('only rent and power can cost you your home; a late card never does', () => {
  const h = { ...fresh(), home: { slot: 0, tier: 'flat', next: 99 } };
  h.bills.push({ id: 1, kind: 'card', amount: 100, issued: 0, due: 1, late: false, seen: false, ref: 0 });
  assert.equal(tickBills(h, 40).some(e => e.type === 'evicted'), false);
  assert.ok(h.home);
});
