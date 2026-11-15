// Careers and jobs (docs/careers-spec.md, slice 5). Pay is cash per shift. Every number here is a first guess to be tuned after a playtest.
// A rung is offered when the person has the skill, the shifts worked at the rung before it, and the course; `play` says what a shift is.
const ROTA = { days: [1, 2, 3, 4, 5], start: '09:00', hours: 8 };
const rung = (title, pay, skill, shifts, course, play, rota = ROTA) => ({ title, pay, skill, shifts, course, play, rota });

export const CAREERS = {
  retail: {
    label: 'Retail & service', employers: ['market', 'postoffice', 'shelter'], record: 'ok',
    rungs: [rung('Shelf stocker', 1350, 0, 0, null, 'stack'), rung('Cashier', 1800, 25, 10, 'hygiene', 'till'), rung('Supervisor', 2500, 55, 25, 'teamlead', 'auto'), rung('Store manager', 3500, 80, 50, 'retailmgmt', 'auto')],
  },
  trades: {
    label: 'Trades & makers', employers: ['postoffice'], record: 'ok',
    rungs: [rung("Labourer's mate", 1400, 0, 0, null, 'stack'), rung('Apprentice', 1900, 25, 10, 'sitesafety', 'stack'), rung('Tradesperson', 2700, 55, 25, 'tradecert', 'auto'), rung('Foreperson', 3650, 80, 50, 'contractor', 'auto')],
  },
  farming: {
    label: 'Farming & food', employers: ['nursery'], record: 'ok',
    rungs: [rung('Picker', 1300, 0, 0, null, 'beds'), rung('Grower', 1750, 25, 10, 'plantcare', 'beds'), rung('Head grower', 2350, 55, 25, 'cropplan', 'auto'), rung('Farm manager', 3300, 80, 50, 'agribiz', 'auto')],
  },
  public: {
    label: 'Public service', employers: ['council'], record: 'block',
    rungs: [rung('Filing clerk', 1400, 0, 0, 'office', 'auto'), rung('Records officer', 1850, 25, 10, null, 'auto'), rung('Department head', 2500, 55, 25, 'publicadmin', 'auto'), rung('Senior officer', 3900, 80, 50, null, 'auto')],
  },
};
export const CAREER_IDS = Object.keys(CAREERS);

// A paid day class (6 hours) that gives a certificate for good.
const course = (label, price, venue = 'college') => ({ label, price, venue, hours: 6, opens: '09:00' });
export const COURSES = {
  office: course('Basic office skills', 1000), hygiene: course('Food hygiene', 1500), teamlead: course('Team leading', 4000), retailmgmt: course('Retail management', 9000),
  sitesafety: course('Site safety', 2000), tradecert: course('Trade certificate', 8000), contractor: course('Contracting licence', 12000),
  plantcare: course('Plant care', 1500), cropplan: course('Crop planning', 4000), agribiz: course('Agri-business', 9000), publicadmin: course('Public administration', 7000),
};

// How late you arrive (game minutes) -> the share of the pay you get and the strikes you earn. The first row that fits wins.
export const LATE = [{ upTo: 0, pay: 1, strike: 0 }, { upTo: 60, pay: 0.7, strike: 1 }, { upTo: 120, pay: 0.4, strike: 1 }, { upTo: Infinity, pay: 0, strike: 2 }];
export const STRIKES_TO_SACK = 3;
export const STRIKE_DAYS = 14;               // a strike counts against you for this many days
export const REHIRE_BLOCK_DAYS = 7;          // no rehire at the employer that sacked you
export const SKILL_PER_SHIFT = { good: 3, poor: 1, late: 0 };
export const SKILL_MAX = 100;
export const DECAY_AFTER_DAYS = 28;          // away from the career this long, then -1 a week
export const HOBBY_CAP = 10;                 // most skill the hobbies can give per career
export const HOBBY_SKILL = { cooking: 'retail', bench: 'trades', garden: 'farming', paper: 'public' };
export const MIN_HYGIENE = 40;               // to be hired: come clean
export const SHIFTS_PER_WEEK = 5;
export const LISTINGS_OPEN = 4;              // openings on the board each day...
export const LISTINGS_BEYOND = 2;            // ...of which this many are beyond the person's reach (greyed, with the reason)
export const GOOD_SHIFT = 100;               // performance (%) that counts as a good shift

export const EMPLOYER_NAMES = { market: 'Corner Shop', postoffice: 'Post Office', shelter: 'Shelter', nursery: 'Garden Centre', council: 'Council Hall', college: 'College' };
export const SITE_CRATES = { market: 'crates', postoffice: 'parcels', shelter: 'bags', nursery: 'crates' };        // what the stacking game moves at each workplace
