// Being a landlord (docs/hardcore-mode.md): what a house lets for, who applies, what goes wrong. Amounts are cash per 28-day month.
export const MARKET_RENT = { blank: 7000, flat: 12000, cottage: 24000, apartments: 52000 };     // by the blueprint a house started as
export const DEFAULT_MARKET = 12000;
export const RENT_STEP = 500;
export const MAX_APPLICANTS = 4;
export const APPLICANT_DAYS = 7;                       // an applicant waits this long for an answer
export const NOTICE_DAYS = 14;
export const TIER_ORDER = ['poor', 'fair', 'good', 'excellent'];
export const MIN_TIERS = ['any', 'fair', 'good'];      // what you can ask of an applicant
export const REPAIR_CHANCE = 0.04;                     // a day, with a tenant in
export const MAX_REPAIRS = 4;
export const REPAIRS = [                               // what, and the cost as a share of the monthly rent
  { what: 'Leaky tap', share: 0.04 }, { what: 'Blocked drain', share: 0.05 }, { what: 'Cracked window', share: 0.07 },
  { what: 'Broken heater', share: 0.10 }, { what: 'Dead boiler', share: 0.25 },
];
export const FIRST = ['Ada', 'Ben', 'Cleo', 'Dev', 'Elif', 'Finn', 'Gina', 'Hugo', 'Ines', 'Jonas', 'Kira', 'Leo', 'Mina', 'Nils', 'Orla', 'Pavel', 'Quinn', 'Rosa', 'Sami', 'Tess'];
export const LAST = ['Abbot', 'Brandt', 'Cho', 'Dunmore', 'Esposito', 'Farrow', 'Greaves', 'Haldane', 'Ito', 'Jessop', 'Kowal', 'Lindqvist', 'Marlowe', 'Nakamura', 'Okafor', 'Pruitt', 'Quill', 'Rao', 'Sutter', 'Thorne'];
export const JOBS = [                                  // job, a month's pay
  ['Cleaner', 26000], ['Barista', 24000], ['Delivery driver', 32000], ['Shop assistant', 27000], ['Labourer', 34000], ['Care worker', 31000],
  ['Mechanic', 42000], ['Line cook', 30000], ['Nurse', 52000], ['Electrician', 56000], ['Office clerk', 38000], ['Student', 14000],
];
