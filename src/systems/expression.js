// Which face should a character be making right now? Pure priority list.
//   ctx: { now, grabbed, chewing, reaction, reactUntil, hoverFood, pokedUntil, sleepy }
import { REACTIONS } from '../data/expressions.js';

export function pickExpression(ctx) {
  if (ctx.grabbed) return 'surprised';
  if (ctx.chewing) return 'chew';
  if (ctx.reaction && ctx.now < ctx.reactUntil) return (REACTIONS[ctx.reaction] || REACTIONS.yum).expression;
  if (ctx.hoverFood) return 'hungry';
  if (ctx.now < ctx.pokedUntil) return 'giggle';
  if (ctx.sleepy) return 'sleepy';
  return 'neutral';
}
