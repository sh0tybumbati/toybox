// Businesses you can start (docs/hardcore-mode.md). Amounts are cash. `base` = what the place grosses in a day at full strength, `cogs` = the share
// of that spent on stock and materials, `upkeep` = rates and running costs every 28 days, `fitout` = building the premises (on top of the lot).
export const BIZ = {
  shop:     { label: 'Shop',     icon: '🛍️', blueprint: 'bizshop',     base: 9000,  cogs: 0.60, upkeep: 9000,  fitout: 250000, blurb: 'Buy stock wholesale, sell it with a mark-up.' },
  workshop: { label: 'Workshop', icon: '🧵', blueprint: 'bizworkshop', base: 11000, cogs: 0.45, upkeep: 12000, fitout: 400000, blurb: 'Make clothes, toys and furniture from materials and sell them.' },
  farm:     { label: 'Farm',     icon: '🌾', blueprint: 'bizfarm',     base: 7000,  cogs: 0.25, upkeep: 5000,  fitout: 150000, blurb: 'Grow legal crops at scale and sell them to the shops.' },
};
export const BIZ_TYPES = Object.keys(BIZ);
export const BIZ_BLUEPRINTS = Object.fromEntries(BIZ_TYPES.map(t => [BIZ[t].blueprint, t]));
export const MAX_STAFF = 3;
export const STAFF_PAY_DAYS = 7;                  // wages are paid weekly
export const SELF_CAPACITY = 0.6;                 // what a shift of your own is worth (a staff member of skill 50 is worth 0.5)
export const MAX_CAPACITY = 1.3;
export const MARKUPS = [-20, -10, 0, 10, 20, 30, 40];       // your prices against the going rate, in %
export const MAX_CANDIDATES = 4;
export const CANDIDATE_DAYS = 7;
export const VACANCY_CHANCE = 0.35;               // a day, with a vacancy listed
export const SICK_BASE = 0.25;                    // the chance an unreliable (reliability 0) worker does not turn up
export const ROLES = ['Assistant', 'Cashier', 'Stock hand', 'Maker', 'Packer', 'Picker', 'Driver', 'Supervisor'];
