// The classified ads: the kinds of work on offer in town (docs/hardcore-mode.md). Slice 5 turns these into real jobs with
// shifts and tardiness; for now they are what you read in the paper, on the computer or on the phone. Pay is cash per shift.
export const JOB_TEMPLATES = [
  { id: 'labour',   title: 'Day labourer',      where: 'The Park (labour board)', hours: '06:00-09:00 pickup', shift: '4 hours', pay: 1200, needs: 'Nothing: turn up and work' },
  { id: 'stocker',  title: 'Shelf stocker',     where: 'Corner Shop',             hours: 'Nights 22:00-06:00', shift: '8 hours', pay: 1900, needs: 'Reliable, and a phone' },
  { id: 'cashier',  title: 'Cashier',           where: 'Corner Shop',             hours: '09:00-17:00',        shift: '8 hours', pay: 2100, needs: 'Clean clothes, a number to call' },
  { id: 'courier',  title: 'Parcel courier',    where: 'Post Office',             hours: '10:00-16:00',        shift: '6 hours', pay: 1800, needs: 'A phone, a bike or a van' },
  { id: 'cleaner',  title: 'Cleaner',           where: 'Shelter',                 hours: '07:00-11:00',        shift: '4 hours', pay: 1000, needs: 'Nothing' },
  { id: 'kitchen',  title: 'Kitchen hand',      where: 'Shelter meal line',       hours: '17:00-20:00',        shift: '3 hours', pay: 900,  needs: 'Nothing' },
  { id: 'helper',   title: 'Removals helper',   where: 'Meet at the park',        hours: 'Saturdays',          shift: '8 hours', pay: 2400, needs: 'Strong back' },
];
export const JOB_IDS = JOB_TEMPLATES.map(j => j.id);
export const LISTINGS_PER_DAY = 4;
