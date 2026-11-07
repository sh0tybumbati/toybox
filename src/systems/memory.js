// Memory Match's rules (pure): deal pairs, flip two, keep matches. A game is { cards, faceUp, matched, moves }.
export const PAIR_KEYS = ['apple', 'ball', 'duck', 'cake', 'rocket', 'teddy'];

export function deal(rand = Math.random, keys = PAIR_KEYS) {
  const cards = [...keys, ...keys];
  for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
  return { cards, faceUp: [], matched: cards.map(() => false), moves: 0 };
}

// Turn card `i` over. Returns 'ignored' | 'up' (first of a pair) | 'match' | 'miss' (the caller flips them back with settle()).
export function flip(game, i) {
  if (game.matched[i] || game.faceUp.includes(i) || game.faceUp.length >= 2) return 'ignored';
  game.faceUp.push(i);
  if (game.faceUp.length < 2) return 'up';
  game.moves++;
  const [a, b] = game.faceUp;
  if (game.cards[a] === game.cards[b]) { game.matched[a] = game.matched[b] = true; game.faceUp = []; return 'match'; }
  return 'miss';
}
export const settle = game => { game.faceUp = []; };
export const done = game => game.matched.every(Boolean);
export const coinsFor = moves => (moves <= 8 ? 5 : moves <= 12 ? 3 : 1);
