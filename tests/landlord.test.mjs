import test from 'node:test';
import assert from 'node:assert/strict';
import { MARKET_RENT, NOTICE_DAYS, MAX_APPLICANTS } from '../src/data/hard/landlord.js';
import { CYCLE } from '../src/data/hard/credit.js';
import { accept, cleanLet, cycleDeposit, cycleMinTier, interest, isLet, leave, letDaily, marketRent, newApplicant, newLet, passes, payRepair, serveNotice, setRent, whyNotLet } from '../src/systems/hard/landlord.js';
import { newBuilding } from '../src/data/buildings.js';

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const house = (extra = {}) => { const l = newLet(24000); l.listed = true; return Object.assign(l, extra); };
const tenanted = (rel = 80, rent = 24000) => { const l = house({ rent }); l.listed = true; l.applicants = [{ name: 'Ada Abbot', job: 'Nurse', income: 50000, rel, score: 700, day: 0 }]; accept(l, 0, 0); return l; };

test('what a house lets for comes from what it started as', () => {
  assert.equal(marketRent(newBuilding('cottage'), 'cottage'), MARKET_RENT.cottage);
  assert.ok(marketRent(newBuilding('apartments'), 'apartments') > marketRent(newBuilding('blank'), 'blank'));
  assert.ok(marketRent(newBuilding('apartments'), null) > 0, 'unknown start: by size');
});

test('only a house you own and do not live in can be let', () => {
  const b = { owned: true };
  assert.equal(whyNotLet(null, null, 1), 'nothing there');
  assert.equal(whyNotLet({}, null, 1), 'you do not own it');
  assert.equal(whyNotLet(b, { slot: 1 }, 1), 'you live there');
  assert.equal(whyNotLet(b, { slot: 2 }, 1), '');
});

test('interest falls as the rent rises above the market, and damage scares people off', () => {
  assert.ok(interest(19000, 24000) > interest(24000, 24000) && interest(24000, 24000) > interest(32000, 24000));
  assert.ok(interest(100000, 24000) <= 0.05);
  assert.equal(interest(24000, 24000, true), interest(24000, 24000) / 2);
});

test('applicants have a name, job, income, a credit score and a hidden reliability', () => {
  const a = newApplicant(seq(0.1, 0.5, 0.9, 0.3, 0.6, 0.2), 4);
  assert.ok(a.name.includes(' ') && a.job && a.income > 0 && a.score >= 300 && a.score <= 850 && a.rel >= 0 && a.rel <= 100);
  const good = newApplicant(seq(0.1, 0.99, 0.5, 0.5, 0.5, 0.5), 0), bad = newApplicant(seq(0.1, 0.01, 0.5, 0.5, 0.5, 0.5), 0);
  assert.ok(good.score > bad.score, 'reliable people have better credit');
  assert.equal(passes('any', 300), true); assert.equal(passes('fair', 500), false); assert.equal(passes('good', 700), true); assert.equal(passes('good', 600), false);
});

test('a listed vacant house draws applicants, never more than four, and they give up after a week', () => {
  const l = house();
  const ev = letDaily(l, 1, seq(0, 0.5, 0.5, 0.9, 0.9, 0.5));
  assert.equal(ev[0].type, 'applicant'); assert.equal(l.applicants.length, 1);
  for (let d = 2; d < 20; d++) letDaily(l, d, seq(0, 0.5, 0.5, 0.9, 0.9, 0.5));
  assert.ok(l.applicants.length <= MAX_APPLICANTS);
  assert.deepEqual(letDaily(house({ listed: false }), 1, () => 0), [], 'not listed, nobody comes');
  const old = house({ applicants: [{ name: 'x', job: 'y', income: 1, rel: 5, score: 500, day: 0 }] });
  letDaily(old, 9, () => 0.99); assert.equal(old.applicants.length, 0);
  const picky = house({ minTier: 'good' }); letDaily(picky, 1, seq(0, 0.5, 0.5, 0.01, 0.01, 0.5)); assert.equal(picky.applicants.length, 0, 'a poor applicant does not apply to a picky landlord');
});

test('accepting moves them in, takes the deposit, and unlists the house', () => {
  const l = house({ rent: 20000, deposit: 1 }); l.applicants = [{ name: 'Ben Cho', job: 'Cook', income: 30000, rel: 70, score: 650, day: 0 }];
  const r = accept(l, 0, 10);
  assert.equal(r.deposit, 20000); assert.equal(l.tenant.next, 10 + CYCLE); assert.equal(l.listed, false); assert.equal(isLet({ let: l }), true);
  assert.equal(accept(l, 0, 11), null);
  assert.equal(cycleDeposit(l), 0); assert.equal(cycleDeposit(l), 1);
  assert.deepEqual(['good', 'any', 'fair'].map(() => cycleMinTier(l)), ['fair', 'good', 'any']);
  assert.equal(setRent(l, 2), 21000); assert.equal(setRent(l, -1000), 500);
});

test('rent day: a reliable tenant pays, an unreliable one often does not, and arrears are paid back later', () => {
  const l = tenanted(90);
  const paid = letDaily(l, CYCLE, seq(0.0, 0.99));   // pays; no repair
  assert.ok(paid.some(e => e.type === 'rent' && e.amount === 24000)); assert.equal(l.tenant.next, 2 * CYCLE);
  const late = letDaily(l, 2 * CYCLE, seq(0.99, 0.99));
  assert.ok(late.some(e => e.type === 'late')); assert.equal(l.tenant.owed, 24000);
  const back = letDaily(l, 3 * CYCLE, seq(0.0, 0.0, 0.99));  // pays the arrears and this month
  assert.ok(back.some(e => e.arrears && e.amount === 24000)); assert.equal(l.tenant.owed, 0);
});

test('three missed months from an unreliable tenant and they do a runner, leaving damage', () => {
  const l = tenanted(10);
  let out = [];
  for (let m = 1; m <= 3 && l.tenant; m++) out = letDaily(l, m * CYCLE, () => 0.99);
  assert.equal(l.tenant, null);
  assert.ok(out.some(e => e.type === 'left' && e.runner)); assert.ok(out.some(e => e.type === 'damage'));
  assert.ok(l.repairs.some(r => r.what === 'Damage left behind'));
});

test('notice: they go after the notice period, and the deposit comes back unless they made a mess', () => {
  const l = tenanted(90); l.tenant.deposit = 24000;
  assert.equal(serveNotice(l, 5), true); assert.equal(serveNotice(l, 6), false);
  assert.equal(l.tenant.notice, 5 + NOTICE_DAYS);
  assert.deepEqual(letDaily(l, 5 + NOTICE_DAYS - 1, () => 0.99).some(e => e.type === 'left'), false);
  const out = letDaily(l, 5 + NOTICE_DAYS, () => 0.99);          // rng high: no mess
  assert.equal(out.find(e => e.type === 'left').refund, 24000);
  const messy = tenanted(5); messy.tenant.deposit = 24000;
  const e2 = leave(messy, () => 0.0);
  assert.equal(e2.find(e => e.type === 'left').refund, 0); assert.ok(e2.some(e => e.type === 'damage'));
});

test('repairs: they come up now and then, cost a share of the rent, make a tenant happy when paid, and unhappy tenants leave', () => {
  const l = tenanted(80);
  const ev = letDaily(l, 1, seq(0.0, 0.0));
  assert.ok(ev.some(e => e.type === 'repair')); const rep = l.repairs[0]; assert.ok(rep.cost >= 100 && rep.cost <= 24000 * 0.25 + 100);
  const happy = l.tenant.happy;
  assert.equal(payRepair(l, rep.id, 1), null);
  const r = payRepair(l, rep.id, 100000); assert.equal(r.cash, 100000 - rep.cost); assert.equal(l.tenant.happy, Math.min(100, happy + 10));
  const sulk = tenanted(80); sulk.repairs = [{ id: 1, what: 'Leaky tap', cost: 1000, day: -20 }]; sulk.tenant.happy = 2;
  const out = letDaily(sulk, 1, () => 0.99);
  assert.ok(out.some(e => e.type === 'notice' && e.theirs)); assert.equal(sulk.tenant.notice, 8);
});

test('saved lets are cleaned', () => {
  assert.equal(cleanLet(null), null);
  const l = cleanLet({ listed: 1, rent: 9e9, deposit: 5, minTier: 'nope', tenant: { name: 'A', rel: 500, happy: -4, notice: null }, applicants: [null, { name: 'B' }], repairs: [{ cost: 'x' }, { id: 1, what: 'Tap', cost: 5 }] }, 12000);
  assert.equal(l.rent, 400000); assert.equal(l.deposit, 1); assert.equal(l.minTier, 'any');
  assert.equal(l.tenant.rel, 100); assert.equal(l.tenant.happy, 0); assert.equal(l.applicants.length, 1); assert.equal(l.repairs.length, 1);
});
