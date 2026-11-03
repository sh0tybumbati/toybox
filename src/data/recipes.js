// Cooking and combining. Pure data.
//
// RECIPES: drop the right ingredients in the oven (any order) and it makes a
// specific dish. Ingredients can be raw things, shelf food, or earlier dishes.
// Nothing ever fails: one unmatched ingredient comes out warm and unchanged, and
// a mix that matches no recipe becomes a "chef's surprise".
export const RECIPES = [
  { id: 'friedegg',  name: 'Fried Egg',   ingredients: ['egg'],                       result: 'friedegg',  hint: 'Sunny side up!' },
  { id: 'bread',     name: 'Bread',       ingredients: ['flour'],                     result: 'bread',     hint: 'Golden and crusty.' },
  { id: 'fries',     name: 'Fries',       ingredients: ['potato'],                    result: 'fries',     hint: 'Crispy and salty.' },
  { id: 'popcorn',   name: 'Popcorn',     ingredients: ['corn'],                      result: 'popcorn',   hint: 'Listen for the pops.' },
  { id: 'jam',       name: 'Jam',         ingredients: ['berry'],                     result: 'jam',       hint: 'Sweet and sticky.' },
  { id: 'cocoa',     name: 'Hot Cocoa',   ingredients: ['milk', 'chocolate'],         result: 'cocoa',     hint: 'Something warm to sip.' },
  { id: 'pie',       name: 'Apple Pie',   ingredients: ['apple', 'flour'],            result: 'pie',       hint: 'Fruit in a crust.' },
  { id: 'spaghetti', name: 'Spaghetti',   ingredients: ['flour', 'tomato'],           result: 'spaghetti', hint: 'Noodles and red sauce.' },
  { id: 'sushi',     name: 'Sushi',       ingredients: ['rice', 'fish'],              result: 'sushi',     hint: 'Fresh from the sea.' },
  { id: 'pancakes',  name: 'Pancakes',    ingredients: ['flour', 'egg', 'milk'],      result: 'pancakes',  hint: 'A fluffy breakfast stack.' },
  { id: 'ramen',     name: 'Ramen',       ingredients: ['flour', 'egg', 'meat'],      result: 'ramen',     hint: 'A big warm bowl.' },
  { id: 'cake',      name: 'Chocolate Cake', ingredients: ['flour', 'egg', 'chocolate'], result: 'cake',   hint: 'For celebrations!' },
  { id: 'burger',    name: 'Burger',      ingredients: ['bread', 'meat', 'cheese'],   result: 'burger',    hint: 'Stacked between two buns.' },
  { id: 'stew',      name: 'Hearty Stew', ingredients: ['potato', 'carrot', 'meat'],  result: 'stew',      hint: 'Chunky and filling.' },
  { id: 'curry',     name: 'Curry',       ingredients: ['rice', 'meat', 'carrot'],    result: 'curry',     hint: 'Warm, with a little kick.' },
  { id: 'salad',     name: 'Garden Salad', ingredients: ['broccoli', 'tomato', 'carrot'], result: 'salad', hint: 'Fresh and crunchy.' },
];

export const SURPRISE = 'surprise';
export const MAX_INGREDIENTS = 3;

const signature = keys => [...keys].sort().join('+');
const BY_SIGNATURE = new Map(RECIPES.map(r => [signature(r.ingredients), r]));

// The recipe made by exactly these ingredients (any order), or null.
export const matchRecipe = keys => BY_SIGNATURE.get(signature(keys)) || null;

// What comes out of the oven: { key, recipe } — recipe is null for the fallbacks.
export function cookOutcome(keys) {
  if (!keys.length) return null;
  const recipe = matchRecipe(keys);
  if (recipe) return { key: recipe.result, recipe };
  return { key: keys.length === 1 ? keys[0] : SURPRISE, recipe: null };
}

// Drop one item on another: [a, b, result]. Order doesn't matter.
export const COMBOS = [
  ['bread', 'jam', 'sandwich'],
  ['bread', 'cheese', 'sandwich'],
  ['icecream', 'cupcake', 'cake'],
  ['berry', 'icecream', 'sundae'],
];

export function findCombo(a, b) {
  const hit = COMBOS.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
  return hit ? hit[2] : null;
}
