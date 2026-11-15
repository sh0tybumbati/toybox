// Careers (pure, docs/careers-spec.md): hiring, the weekly pay, being late, strikes, skill and promotion. The scene supplies the clock and the mini-game result.
// A person's career block: { job: { career, rung, employer, shifts, rota } | null, skills: { career: n }, certs: [courseId], strikes: [day], sackedAt: { employerId: day }, hobby: { career: n }, last: { career: day } }.
import { CAREERS, CAREER_IDS, COURSES, DECAY_AFTER_DAYS, GOOD_SHIFT, HOBBY_CAP, HOBBY_SKILL, LATE, LISTINGS_BEYOND, LISTINGS_OPEN, MIN_HYGIENE, REHIRE_BLOCK_DAYS, SHIFTS_PER_WEEK, SKILL_MAX, SKILL_PER_SHIFT, STRIKES_TO_SACK, STRIKE_DAYS } from '../../data/hard/careers.js';
import { hash01 } from './weather.js';

export const newWork = () => ({ job: null, skills: {}, certs: [], strikes: [], sackedAt: {}, hobby: {}, last: {}, shift: null, owed: 0 });
export const skillOf = (w, career) => w.skills[career] || 0;
export const rungOf = (career, i) => CAREERS[career] && CAREERS[career].rungs[i];
export const weeklyPay = (career, i, shifts = SHIFTS_PER_WEEK, performance = 1) => Math.round(rungOf(career, i).pay * shifts * performance);

// ---------- hiring ----------
// Why this person cannot take rung `i` of `career` right now ('' = they can). `env` = { day, hygiene, phone, dirty, record }.
export function whyNotHire(w, career, i, employer, env) {
  const c = CAREERS[career], r = rungOf(career, i);
  if (!c || !r) return 'No such job';
  if (w.job) return 'You already have a job';
  const sacked = w.sackedAt[employer];
  if (sacked !== undefined && env.day - sacked < REHIRE_BLOCK_DAYS) return 'They will not take you back yet';
  if (c.record === 'block' && env.record) return 'They do not hire people with a record';
  if (r.course && !w.certs.includes(r.course)) return `Needs ${COURSES[r.course].label}`;
  if (skillOf(w, career) < r.skill) return `Needs skill ${r.skill}`;
  if (!env.phone) return 'They need a number to call you';
  if (env.hygiene < MIN_HYGIENE || env.dirty) return 'Come back clean.';
  return '';
}

export function hire(w, career, i, employer, day) {
  const r = rungOf(career, i);
  w.job = { career, rung: i, employer, shifts: 0, rota: { ...r.rota, days: [...r.rota.days] }, since: day };
  return w.job;
}
export function quit(w) { w.job = null; }

// Today's board: openings drawn from the career rungs, deterministic from the day, always with an entry rung they can take, plus a couple out of reach.
export function listings(w, day, env = {}) {
  const all = [];
  for (const career of CAREER_IDS) CAREERS[career].rungs.forEach((r, i) => { for (const employer of CAREERS[career].employers) all.push({ career, rung: i, employer, title: r.title, pay: r.pay, rota: r.rota, play: r.play }); });
  const ranked = all.map((l, k) => ({ l, k: hash01(day * 211 + k * 17 + 5) })).sort((a, b) => a.k - b.k).map(x => x.l);
  const free = { ...w, job: null };                       // what is on offer does not depend on the job you hold now, or on how you look today
  const view = l => ({ ...l, why: whyNotHire(free, l.career, l.rung, l.employer, { day, hygiene: 100, phone: true, dirty: false, record: Boolean(env.record) }) });
  const within = ranked.map(view).filter(l => !l.why), beyond = ranked.map(view).filter(l => l.why);
  const entry = within.find(l => l.rung === 0);
  const picked = [];
  if (entry) picked.push(entry);
  for (const l of within) if (picked.length < LISTINGS_OPEN - LISTINGS_BEYOND && !picked.includes(l)) picked.push(l);
  for (const l of beyond) if (picked.length < LISTINGS_OPEN && !picked.includes(l)) picked.push(l);
  for (const l of within) if (picked.length < LISTINGS_OPEN && !picked.includes(l)) picked.push(l);
  return picked;
}

// ---------- lateness, strikes, sacking ----------
export const lateRow = minutesLate => LATE.find(r => minutesLate <= r.upTo);
export const activeStrikes = (w, day) => w.strikes.filter(d => day - d < STRIKE_DAYS);

// A shift was started `minutesLate` after its start (a no-show passes Infinity). Returns { pay (share), strikes, sacked }.
export function arrive(w, minutesLate, day) {
  const row = lateRow(Math.max(0, minutesLate)), added = row.strike;
  for (let n = 0; n < added; n++) w.strikes.push(day);
  w.strikes = activeStrikes(w, day);
  const sacked = Boolean(w.job) && w.strikes.length >= STRIKES_TO_SACK;
  if (sacked) { w.sackedAt[w.job.employer] = day; w.job = null; w.strikes = []; }
  return { pay: row.pay, strikes: added, sacked };
}

// ---------- skill ----------
export const shiftQuality = (performance, minutesLate) => (minutesLate > 60 ? 'late' : performance >= GOOD_SHIFT ? 'good' : 'poor');
export function addSkill(w, career, n) { w.skills[career] = Math.max(0, Math.min(SKILL_MAX, skillOf(w, career) + n)); return w.skills[career]; }

// A shift worked: skill, the shift count at this rung and the day you last worked.
export function worked(w, performance, minutesLate, day) {
  const j = w.job; if (!j) return 0;
  const gain = SKILL_PER_SHIFT[shiftQuality(performance, minutesLate)];
  addSkill(w, j.career, gain);
  if (minutesLate <= 120) j.shifts++;
  w.last[j.career] = day;
  return gain;
}

// A hobby session (cooking, bench, garden, paper): +1 skill in the matching career, up to the cap.
export function hobbySession(w, hobby) {
  const career = HOBBY_SKILL[hobby];
  if (!career || (w.hobby[career] || 0) >= HOBBY_CAP) return 0;
  w.hobby[career] = (w.hobby[career] || 0) + 1;
  addSkill(w, career, 1);
  return 1;
}

// Skill falls 1 a week once you have been away from a career for 4 weeks, never below what the last rung you held asked for.
export function decay(w, day) {
  for (const career of CAREER_IDS) {
    const last = w.last[career];
    if (last === undefined || (w.job && w.job.career === career) || skillOf(w, career) <= 0) continue;
    const away = day - last;
    if (away < DECAY_AFTER_DAYS || (away - DECAY_AFTER_DAYS) % 7 !== 0) continue;
    const floor = (w.reached && w.reached[career] !== undefined) ? CAREERS[career].rungs[w.reached[career]].skill : 0;
    if (skillOf(w, career) > floor) addSkill(w, career, -1);
  }
}

// ---------- promotion ----------
// What is missing for the next rung: [] means the boss offers it. Each entry is a short line for the phone.
export function missingForNext(w) {
  const j = w.job; if (!j) return ['No job'];
  const next = rungOf(j.career, j.rung + 1); if (!next) return [];
  const out = [];
  if (skillOf(w, j.career) < next.skill) out.push(`Skill ${next.skill} (you have ${skillOf(w, j.career)})`);
  if (j.shifts < next.shifts) out.push(`${next.shifts - j.shifts} more shifts`);
  if (next.course && !w.certs.includes(next.course)) out.push(COURSES[next.course].label);
  return out;
}
export const promotionOffered = w => Boolean(w.job) && Boolean(rungOf(w.job.career, w.job.rung + 1)) && missingForNext(w).length === 0;
export function promote(w) {
  if (!promotionOffered(w)) return false;
  const j = w.job; j.rung++; j.shifts = 0; j.rota = { ...rungOf(j.career, j.rung).rota };
  w.reached = { ...(w.reached || {}), [j.career]: j.rung };
  return true;
}

// ---------- pay ----------
// A shift on `play: 'auto'`: performance in % from the skill, with a roll of about +-10.
export const autoPerformance = (skill, rng = Math.random) => Math.max(70, Math.min(130, Math.round(70 + skill * 0.4 + (rng() * 20 - 10))));
// What a shift pays: the rung's base x performance (70-130%) x the lateness share.
export function shiftPay(w, performance, minutesLate) {
  const j = w.job; if (!j) return 0;
  return Math.round((rungOf(j.career, j.rung).pay * (Math.max(70, Math.min(130, performance)) / 100) * lateRow(Math.max(0, minutesLate)).pay + 1e-6) / 10) * 10;
}

// ---------- the rota: when the next shift is, whether you made it ----------
export const weekday = day => (day % 7) + 1;                                  // 1 = Monday
export const startMinute = rota => { const [h, m] = rota.start.split(':').map(Number); return h * 60 + m; };

// The next shift at or after game minute `total`: { day, start } (start in game minutes), or null with no job.
export function nextShift(w, total) {
  if (!w.job) return null;
  const { days, hours } = w.job.rota, st = startMinute(w.job.rota);
  for (let d = Math.floor(total / 1440); d < Math.floor(total / 1440) + 8; d++) {
    const start = d * 1440 + st;
    if (days.includes(weekday(d)) && start + hours * 60 > total && !(w.shift && w.shift.day === d && w.shift.done)) return { day: d, start };
  }
  return null;
}

// Time moves on: put today's shift on the person's rota, and call it a no-show once they are over two hours late.
// Returns events: { type: 'noshow', strikes, sacked } | { type: 'sacked' }.
export function tickShifts(w, total) {
  const out = [];
  if (!w.job) { w.shift = null; return out; }
  const day = Math.floor(total / 1440), st = day * 1440 + startMinute(w.job.rota);
  if (w.job.rota.days.includes(weekday(day)) && (!w.shift || w.shift.day !== day)) w.shift = { day, start: st, done: false };
  if (w.shift && !w.shift.done && total - w.shift.start > LATE[LATE.length - 2].upTo) {
    w.shift.done = true;
    const r = arrive(w, Infinity, day);
    out.push({ type: 'noshow', strikes: r.strikes, sacked: r.sacked });
  }
  return out;
}

// Is there a shift they can start right now at `employer`? Returns the shift (and how late they would be) or null.
export function shiftNow(w, total, employer) {
  const j = w.job, s = w.shift;
  if (!j || !s || s.done || j.employer !== employer || total < s.start - 60) return null;
  return { ...s, late: Math.max(0, total - s.start) };
}

// The shift was worked: strikes for lateness, the pay (which accrues to the weekly payslip), skill. Returns { pay, share, gain, strikes, sacked }.
export function finishShift(w, performance, minutesLate, day) {
  const j = w.job; if (!j) return { pay: 0, gain: 0, strikes: 0, sacked: false };
  const pay = shiftPay(w, performance, minutesLate), share = lateRow(Math.max(0, minutesLate)).pay;
  if (w.shift) w.shift.done = true;
  const r = arrive(w, minutesLate, day), gain = r.sacked ? 0 : worked(w, performance, minutesLate, day);
  w.owed += pay;
  return { pay, share, gain, strikes: r.strikes, sacked: r.sacked };
}

// Week's end: the pay owed becomes a payslip. Returns the amount (0 = none).
export function payslip(w) { const n = w.owed; w.owed = 0; return n; }

// ---------- courses ----------
export const whyNotCourse = (w, id, cash) => (!COURSES[id] ? 'No such course' : w.certs.includes(id) ? 'You have it' : cash < COURSES[id].price ? `It costs $${COURSES[id].price.toLocaleString('en-US')}` : '');
export function takeCourse(w, id) { if (!w.certs.includes(id) && COURSES[id]) w.certs.push(id); }

// ---------- save ----------
export function cleanWork(raw) {
  const w = newWork();
  if (!raw || typeof raw !== 'object') return w;
  for (const career of CAREER_IDS) {
    if (Number.isFinite(raw.skills?.[career])) w.skills[career] = Math.max(0, Math.min(SKILL_MAX, Math.floor(raw.skills[career])));
    if (Number.isFinite(raw.hobby?.[career])) w.hobby[career] = Math.max(0, Math.min(HOBBY_CAP, Math.floor(raw.hobby[career])));
    if (Number.isFinite(raw.last?.[career])) w.last[career] = Math.floor(raw.last[career]);
  }
  w.owed = Number.isFinite(raw.owed) ? Math.max(0, Math.min(1e7, Math.floor(raw.owed))) : 0;
  if (raw.shift && Number.isFinite(raw.shift.day) && Number.isFinite(raw.shift.start)) w.shift = { day: Math.floor(raw.shift.day), start: Math.floor(raw.shift.start), done: Boolean(raw.shift.done) };
  w.certs = (Array.isArray(raw.certs) ? raw.certs : []).filter(id => COURSES[id]).filter((id, k, a) => a.indexOf(id) === k);
  w.strikes = (Array.isArray(raw.strikes) ? raw.strikes : []).filter(Number.isFinite).map(Math.floor).slice(0, 8);
  for (const [k, v] of Object.entries(raw.sackedAt && typeof raw.sackedAt === 'object' ? raw.sackedAt : {})) if (Number.isFinite(v) && /^[a-z]{1,16}$/.test(k)) w.sackedAt[k] = Math.floor(v);
  const j = raw.job;
  if (j && CAREERS[j.career] && Number.isInteger(j.rung) && rungOf(j.career, j.rung) && CAREERS[j.career].employers.includes(j.employer)) {
    w.job = { career: j.career, rung: j.rung, employer: j.employer, shifts: Math.max(0, Math.floor(j.shifts) || 0), rota: { ...rungOf(j.career, j.rung).rota }, since: Math.floor(j.since) || 0 };
  }
  if (raw.reached && typeof raw.reached === 'object') { w.reached = {}; for (const c of CAREER_IDS) if (Number.isInteger(raw.reached[c]) && rungOf(c, raw.reached[c])) w.reached[c] = raw.reached[c]; }
  return w;
}

// The household's work blocks keyed by person id, and the payslips waiting to be read.
export const cleanWorkMap = (raw, needs) => Object.fromEntries(Object.entries(raw && typeof raw === 'object' ? raw : {}).slice(0, 6).map(([id, w]) => [String(id).slice(0, 20), cleanWork(w)]));
export const cleanSlips = raw => (Array.isArray(raw) ? raw : []).filter(s => s && Number.isFinite(s.amount) && Number.isFinite(s.day)).slice(0, 12).map(s => ({ amount: Math.max(0, Math.floor(s.amount)), day: Math.floor(s.day), who: String(s.who || '').slice(0, 20) }));
