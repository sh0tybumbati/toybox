// What is advertised today (pure, repeatable from the day): a few jobs from the templates, each with a slightly different pay.
import { JOB_TEMPLATES, LISTINGS_PER_DAY } from '../../data/hard/jobs.js';
import { hash01 } from './weather.js';

export function listings(day, count = LISTINGS_PER_DAY) {
  const order = JOB_TEMPLATES.map((j, i) => ({ j, k: hash01(day * 97 + i * 13 + 3) })).sort((a, b) => a.k - b.k).slice(0, count).map(x => x.j);
  return order.map((j, i) => ({ ...j, pay: Math.round(j.pay * (0.92 + hash01(day * 31 + i * 7 + 11) * 0.16) / 50) * 50 }));
}
