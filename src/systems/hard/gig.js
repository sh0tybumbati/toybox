// A day-labour gig (pure): which one today, whether you are on time, and what you earn.
import { ARRIVE_WITHIN, GIGS, LATE_UNTIL } from '../../data/hard/gigs.js';
import { hash01 } from './weather.js';

// The gig the board offers on `day` (the same all day), taken at game minute `now`.
export function pickGig(day, now) {
  const g = GIGS[Math.floor(hash01(day * 53 + 17) * GIGS.length)];
  return { id: g.id, title: g.title, site: g.site, siteName: g.siteName, crate: g.crate, pay: g.pay, taken: now, due: now + ARRIVE_WITHIN };
}

// How the gig stands at game minute `now`: 'ontime' | 'late' (reduced pay) | 'gone' (they found someone else).
export const standing = (gig, now) => (now <= gig.due ? 'ontime' : now <= gig.due + LATE_UNTIL ? 'late' : 'gone');

// What you earn for `performance` points of work (0..10+): the base pay scaled by how well you did, and cut if you were late.
export function payFor(gig, now, performance) {
  const s = standing(gig, now);
  if (s === 'gone') return 0;
  const quality = 0.7 + 0.06 * Math.max(0, Math.min(10, performance));           // 70% for a poor effort, 130% for a great one
  const lateness = s === 'late' ? 0.6 - 0.2 * ((now - gig.due) / LATE_UNTIL) : 1;         // 60% just after the deadline, down to 40%
  return Math.round(gig.pay * quality * lateness / 10) * 10;
}

export function cleanGig(raw) {
  const g = raw && typeof raw === 'object' ? GIGS.find(x => x.id === raw.id) : null;
  return g && Number.isFinite(raw.taken) && Number.isFinite(raw.due) ? { id: g.id, title: g.title, site: g.site, siteName: g.siteName, crate: g.crate, pay: g.pay, taken: Math.floor(raw.taken), due: Math.floor(raw.due) } : null;
}

// Minutes to walk between two lots of the city map (a lot is about 215px from the next).
export const travelMinutes = (a, b) => (!a || !b ? 0 : Math.max(5, Math.round(Math.hypot(a.x - b.x, a.y - b.y) / 25)));
