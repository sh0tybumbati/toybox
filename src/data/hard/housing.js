// Where you can live, what it costs, and how the bills run (docs/hardcore-mode.md). Lower-income housing bills weekly,
// higher levels monthly (28 days). Amounts are cash; a bill is issued every `cycle` days, is due `due` days later, and
// 10% is added when it is late; `grace` days after that you are evicted.
export const HOUSING = {
  motel: { label: 'Motel room', cycle: 7,  due: 2,  grace: 3, bills: [['rent', 3200]] },
  flat:  { label: 'Flat',       cycle: 7,  due: 3,  grace: 4, bills: [['rent', 4200], ['utilities', 700]] },
  house: { label: 'House',      cycle: 28, due: 10, grace: 7, bills: [['rent', 24000], ['utilities', 5200]] },
};
// A house you own has no landlord to evict you: only the power and water, which go late and cost extra but never end the tenancy.
HOUSING.owned = { label: 'Your own place', cycle: 28, due: 10, grace: 7, owner: true, bills: [['utilities', 5200]] };
export const TIERS = ['motel', 'flat', 'house'];                 // the places you can rent
export const LATE_FEE = 0.1;
export const BILL_LABELS = { rent: 'Rent', utilities: 'Power and water', card: 'Card statement', mortgage: 'Mortgage payment', debt: 'Debt payment' };
export const billLabel = (kind, tier) => (kind === 'rent' && tier === 'house' ? 'Mortgage and tax' : BILL_LABELS[kind] || kind);

// Buildings you can live in (hard mode): a place you rent has rooms only the tenant may use.
export const HOMES = { flat: 'flat', cottage: 'house', motel: 'motel' };       // blueprint -> tier
export const PAY_HOURS = [[9, 17]];                                           // the post office counter
export const DESK_HOURS = [[8, 22]];                                          // the motel's front desk
