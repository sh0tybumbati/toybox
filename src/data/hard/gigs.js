// Day-labour gigs (docs/hardcore-mode.md): the labour board hands you one, at a place in town, to reach by a deadline.
// This is the pattern the real jobs (slice 5) will use: assigned work, a workplace, travel time, being on time or late.
export const GIGS = [
  { id: 'unload', title: 'Unload a delivery', site: 'market',     siteName: 'Corner Shop',  crate: 'crates',  pay: 1300 },
  { id: 'parcels', title: 'Sort parcels',     site: 'postoffice', siteName: 'Post Office',  crate: 'parcels', pay: 1200 },
  { id: 'scrub',  title: 'Haul laundry',      site: 'shelter',    siteName: 'Shelter',      crate: 'bags',    pay: 1100 },
  { id: 'lawn',   title: 'Move turf',         site: 'park',       siteName: 'The Park',     crate: 'turf',    pay: 1250 },
];
export const GIG_IDS = GIGS.map(g => g.id);
export const ARRIVE_WITHIN = 150;      // game minutes from taking the gig to reach the site on time
export const LATE_UNTIL = 120;         // after the deadline: still taken on at reduced pay for this long, then it is gone
export const SHIFT_MINUTES = 180;      // the work takes three hours of game time
export const SHIFT_DRAIN = { energy: -0.1, hunger: -0.04, hygiene: -0.06 };      // per game minute of heavy work, on top of the normal drift
