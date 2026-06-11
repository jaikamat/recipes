import { describe, expect, test } from 'vitest';
import { parseIngredient } from './parser/parseIngredient.js';
import { formatAmount, scaleIngredientLine } from './scale.js';

describe('formatAmount', () => {
  test.each<[number, string, string]>([
    [680, 'g', '680g'],
    [680.4, 'g', '680g'],
    [1.5, 'lb', '1½ lb'],
    [2, 'cup', '2 cups'],
    [1, 'cup', '1 cup'],
    [4.5, 'tbsp', '4½ TBSP'],
    [0.5, 'tsp', '½ tsp'],
    [300, 'ml', '300ml'],
    [3, 'count', '3'],
    [2, 'clove', '2 cloves'],
  ])('formatAmount(%j, %j) → %j', (value, unit, expected) => {
    expect(formatAmount(value, unit as never)).toBe(expected);
  });
});

describe('scaleIngredientLine', () => {
  test('doubles grams and the parenthetical alternate', () => {
    const ing = parseIngredient('454g (1 lb) ground turkey (93/7)');
    expect(scaleIngredientLine(ing, 2)).toBe('908g (2 lb) ground turkey, (93/7)');
  });

  test('scales a range, unit on the upper bound', () => {
    const ing = parseIngredient('2-3 TBSP maple syrup');
    expect(scaleIngredientLine(ing, 1.5)).toBe('3-4½ TBSP maple syrup');
  });

  test('keeps approximation marker', () => {
    const ing = parseIngredient('~150ml water');
    expect(scaleIngredientLine(ing, 2)).toBe('~300ml water');
  });

  test('keeps original-case names and notes', () => {
    const ing = parseIngredient('15g Shaoxing wine');
    expect(scaleIngredientLine(ing, 4)).toBe('60g Shaoxing wine');
    const ing2 = parseIngredient('8-10 dried red chiles, snipped and seeds shaken out');
    expect(scaleIngredientLine(ing2, 0.5)).toBe(
      '4-5 dried red chiles, snipped and seeds shaken out',
    );
  });

  test('factor 1 reconstructs faithfully', () => {
    const ing = parseIngredient('½ cup yogurt (120g)');
    expect(scaleIngredientLine(ing, 1)).toBe('½ cup (120g) yogurt');
  });

  test('unparsed lines pass through untouched at any factor', () => {
    const ing = parseIngredient('Salt to taste');
    expect(scaleIngredientLine(ing, 3)).toBe('Salt to taste');
  });

  test('spoon quantities round to quarter precision', () => {
    const ing = parseIngredient('1 tsp cinnamon');
    expect(scaleIngredientLine(ing, 1 / 3)).toBe('¼ tsp cinnamon');
  });
});
