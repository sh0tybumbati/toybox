// The first six regular customers: named adults in town. Everything about them is invented. `likes` is what they pay extra for,
// `minPurity` what they refuse to go below, `wallet` what they can spend in a day, `hookRate` how easily they get hooked.
export const CUSTOMERS = {
  marta:  { name: 'Marta Vell',    blurb: 'Night-shift nurse. Tired, careful, wants it gentle.',      likes: 'calm',    minPurity: 80, wallet: 5000, hookRate: 0.6 },
  dex:    { name: 'Dex Okoro',     blurb: 'Bike courier. Always rushing; wants it strong.',            likes: 'potency', minPurity: 40, wallet: 3500, hookRate: 1.0 },
  pip:    { name: 'Pip Halloran',  blurb: 'Student. Broke. Buys the cheap stuff and lots of it.',      likes: 'cheap',   minPurity: 0,  wallet: 1800, hookRate: 1.2 },
  odalys: { name: 'Odalys Brandt', blurb: 'Owns the bar. Pays well, notices everything.',               likes: 'purity',  minPurity: 90, wallet: 9000, hookRate: 0.5 },
  rufus:  { name: 'Rufus Teague',  blurb: 'Retired welder with a bad back and a lot of time.',          likes: 'potency', minPurity: 50, wallet: 2500, hookRate: 1.4 },
  jo:     { name: 'Jo Kerr',       blurb: 'Out of work. Will ask for credit. Means well.',              likes: 'cheap',   minPurity: 0,  wallet: 1200, hookRate: 1.3 },
};
export const CUSTOMER_IDS = Object.keys(CUSTOMERS);
export const SELL_HEAT = 4;                  // per sale, on top of what the bench and the seeds drew
export const TRUST_MAX = 10;
