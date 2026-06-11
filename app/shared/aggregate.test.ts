import { describe, expect, test } from 'vitest';
import type { Category, Recipe } from './types.js';
import { aggregate } from './aggregate.js';
import { parseIngredient } from './parser/parseIngredient.js';

/** Build a minimal recipe from raw ingredient lines. */
function recipeOf(id: string, lines: string[], category: Category = 'dinner'): Recipe {
  return {
    id,
    category,
    filePath: `${id}.md`,
    title: id,
    ingredients: [{ items: lines.map(parseIngredient) }],
    instructions: [{ steps: [{ number: 1, text: 'cook' }] }],
    extras: [],
  };
}

describe('aggregate', () => {
  test('sums same-name mass ingredients across recipes', () => {
    const items = aggregate([
      { recipe: recipeOf('a', ['454g (1 lb) ground turkey (93/7)']), multiplier: 1 },
      { recipe: recipeOf('b', ['250g ground turkey']), multiplier: 1 },
    ]);
    const turkey = items.find((i) => i.key === 'ground turkey|mass');
    expect(turkey?.quantityText).toBe('704g');
    expect(turkey?.sources.map((s) => s.recipeId)).toEqual(['a', 'b']);
  });

  test('multipliers scale contributions', () => {
    const items = aggregate([
      { recipe: recipeOf('a', ['15g light soy sauce']), multiplier: 2 },
      { recipe: recipeOf('b', ['30g light soy sauce']), multiplier: 1 },
    ]);
    expect(items.find((i) => i.label === 'light soy sauce')?.quantityText).toBe('60g');
  });

  test('ranges sum min and max independently', () => {
    const items = aggregate([
      { recipe: recipeOf('a', ['2-3 TBSP maple syrup']), multiplier: 1 },
      { recipe: recipeOf('b', ['1 TBSP maple syrup']), multiplier: 1 },
    ]);
    expect(items.find((i) => i.label === 'maple syrup')?.quantityText).toBe('3-4 TBSP');
  });

  test('never converts mass to volume — same name yields sibling lines', () => {
    const items = aggregate([
      { recipe: recipeOf('a', ['290g rolled oats']), multiplier: 1 },
      { recipe: recipeOf('b', ['1 cup rolled oats']), multiplier: 1 },
    ]);
    const oats = items.filter((i) => i.label === 'rolled oats');
    expect(oats).toHaveLength(2);
    expect(oats.map((o) => o.key).sort()).toEqual([
      'rolled oats|mass',
      'rolled oats|volume',
    ]);
  });

  test('prefers a mass alternate over a volume primary', () => {
    const items = aggregate([
      { recipe: recipeOf('a', ['½ cup yogurt (120g)']), multiplier: 1 },
      { recipe: recipeOf('b', ['200g yogurt']), multiplier: 1 },
    ]);
    const yogurt = items.filter((i) => i.label === 'yogurt');
    expect(yogurt).toHaveLength(1);
    expect(yogurt[0]!.quantityText).toBe('320g');
  });

  test('approximation is contagious', () => {
    const items = aggregate([
      { recipe: recipeOf('a', ['~150ml water']), multiplier: 1 },
      { recipe: recipeOf('b', ['100ml water']), multiplier: 1 },
    ]);
    expect(items.find((i) => i.label === 'water')?.quantityText).toBe('~250ml');
  });

  test('large gram totals promote to kg, ml to L', () => {
    const items = aggregate([
      { recipe: recipeOf('a', ['800g basmati rice', '600ml broth']), multiplier: 1 },
      { recipe: recipeOf('b', ['700g basmati rice', '700ml broth']), multiplier: 1 },
    ]);
    expect(items.find((i) => i.label === 'basmati rice')?.quantityText).toBe('1.5kg');
    expect(items.find((i) => i.label === 'broth')?.quantityText).toBe('1.3L');
  });

  test('spoon totals promote: tsp to TBSP to cups', () => {
    const items = aggregate([
      { recipe: recipeOf('a', ['2 tsp cumin', '2 TBSP olive oil']), multiplier: 1 },
      { recipe: recipeOf('b', ['1 tsp cumin', '2 TBSP olive oil']), multiplier: 1 },
    ]);
    expect(items.find((i) => i.label === 'cumin')?.quantityText).toBe('1 TBSP');
    expect(items.find((i) => i.label === 'olive oil')?.quantityText).toBe('¼ cup');
  });

  test('counts keep their countable unit when uniform', () => {
    const items = aggregate([
      { recipe: recipeOf('a', ['3 cloves garlic, minced']), multiplier: 2 },
      { recipe: recipeOf('b', ['2 cloves garlic']), multiplier: 1 },
    ]);
    expect(items.find((i) => i.label === 'garlic')?.quantityText).toBe('8 cloves');
  });

  test('unparsed lines pass through once per distinct text, flagged manual', () => {
    const items = aggregate([
      { recipe: recipeOf('a', ['Salt to taste', '100g oats']), multiplier: 1 },
      { recipe: recipeOf('b', ['Salt to taste']), multiplier: 1 },
    ]);
    const manual = items.filter((i) => i.manual);
    expect(manual).toHaveLength(1);
    expect(manual[0]!.label).toBe('Salt to taste');
    expect(manual[0]!.quantityText).toBeUndefined();
    expect(manual[0]!.sources).toHaveLength(2);
    // Manual items sort after merged items.
    expect(items.at(-1)!.manual).toBe(true);
  });

  test('keys are stable as more recipes are added (check-off persistence)', () => {
    const a = { recipe: recipeOf('a', ['454g ground turkey']), multiplier: 1 };
    const b = { recipe: recipeOf('b', ['250g ground turkey']), multiplier: 1 };
    const keyBefore = aggregate([a]).find((i) => i.label === 'ground turkey')!.key;
    const keyAfter = aggregate([a, b]).find((i) => i.label === 'ground turkey')!.key;
    expect(keyBefore).toBe(keyAfter);
  });

  test('empty selection aggregates to an empty list', () => {
    expect(aggregate([])).toEqual([]);
  });
});
