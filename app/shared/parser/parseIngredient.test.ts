/**
 * One table row per real-world ingredient shape found in the recipe corpus.
 * When a new shape appears in a recipe and misbehaves, add it here first.
 */
import { describe, expect, test } from 'vitest';
import { parseIngredient, parseParenQuantity } from './parseIngredient.js';

describe('parseIngredient — real corpus shapes', () => {
  test('grams with parenthetical pounds and a trailing note paren', () => {
    const ing = parseIngredient('454g (1 lb) ground turkey (93/7)');
    expect(ing).toMatchObject({
      parsed: true,
      quantity: { value: 454 },
      unit: 'g',
      altQuantity: { value: 1, unit: 'lb' },
      name: 'ground turkey',
      note: '(93/7)',
    });
  });

  test('grams with parenthetical cups', () => {
    expect(parseIngredient('145g (1 cup) rolled oats')).toMatchObject({
      parsed: true,
      quantity: { value: 145 },
      unit: 'g',
      altQuantity: { value: 1, unit: 'cup' },
      name: 'rolled oats',
    });
  });

  test('unicode fraction cup with trailing gram equivalent', () => {
    expect(parseIngredient('½ cup yogurt (120g)')).toMatchObject({
      parsed: true,
      quantity: { value: 0.5 },
      unit: 'cup',
      altQuantity: { value: 120, unit: 'g' },
      name: 'yogurt',
    });
  });

  test('attached unicode fraction with gram equivalent', () => {
    expect(parseIngredient('1¼ cup all purpose flour (150g)')).toMatchObject({
      parsed: true,
      quantity: { value: 1.25 },
      unit: 'cup',
      altQuantity: { value: 150, unit: 'g' },
      name: 'all purpose flour',
    });
  });

  test('range with TBSP', () => {
    expect(parseIngredient('2-3 TBSP maple syrup')).toMatchObject({
      parsed: true,
      quantity: { value: 2, max: 3 },
      unit: 'tbsp',
      name: 'maple syrup',
    });
  });

  test('approximate ml', () => {
    expect(parseIngredient('~150ml water')).toMatchObject({
      parsed: true,
      quantity: { value: 150, approx: true },
      unit: 'ml',
      name: 'water',
    });
  });

  test('count range with preparation note', () => {
    expect(
      parseIngredient('8-10 dried red chiles, snipped and seeds shaken out'),
    ).toMatchObject({
      parsed: true,
      quantity: { value: 8, max: 10 },
      unit: 'count',
      name: 'dried red chiles',
      note: 'snipped and seeds shaken out',
    });
  });

  test('mL with parenthetical cups and a comma note', () => {
    expect(
      parseIngredient(
        '240mL (1 cup) reserved soaking water, plus more for desired consistency',
      ),
    ).toMatchObject({
      parsed: true,
      quantity: { value: 240 },
      unit: 'ml',
      altQuantity: { value: 1, unit: 'cup' },
      name: 'reserved soaking water',
      note: 'plus more for desired consistency',
    });
  });

  test('volume-only spice', () => {
    expect(parseIngredient('1 tsp cinnamon')).toMatchObject({
      parsed: true,
      quantity: { value: 1 },
      unit: 'tsp',
      name: 'cinnamon',
    });
  });

  test('ascii fraction tsp', () => {
    expect(parseIngredient('1/2 tsp garam masala')).toMatchObject({
      parsed: true,
      quantity: { value: 0.5 },
      unit: 'tsp',
      name: 'garam masala',
    });
  });

  test('counted produce with alternative in the name', () => {
    expect(parseIngredient('5 small apples or 3 large (any variety)')).toMatchObject({
      parsed: true,
      quantity: { value: 5 },
      unit: 'count',
      name: 'small apples or 3 large',
      note: '(any variety)',
    });
  });

  test('decimal grams', () => {
    expect(parseIngredient('1g MSG')).toMatchObject({
      parsed: true,
      quantity: { value: 1 },
      unit: 'g',
      name: 'msg',
    });
  });

  test('cloves as a unit', () => {
    expect(parseIngredient('3 cloves garlic, minced')).toMatchObject({
      parsed: true,
      quantity: { value: 3 },
      unit: 'clove',
      name: 'garlic',
      note: 'minced',
    });
  });

  test('pinch with "of"', () => {
    expect(parseIngredient('1 pinch of salt')).toMatchObject({
      parsed: true,
      quantity: { value: 1 },
      unit: 'pinch',
      name: 'salt',
    });
  });
});

describe('parseIngredient — unparsed passthrough', () => {
  test.each([
    'Salt to taste',
    'Salt and pepper to taste',
    'Pinch of salt',
    'A pinch of garlic',
  ])('%j passes through with parsed: false', (raw) => {
    expect(parseIngredient(raw)).toEqual({ raw, parsed: false });
  });

  test('raw text is always preserved exactly', () => {
    const raw = '454g (1 lb) ground turkey (93/7)';
    expect(parseIngredient(raw).raw).toBe(raw);
  });
});

describe('parseParenQuantity', () => {
  test.each<[string, { value: number; unit: string } | null]>([
    ['(1 lb)', { value: 1, unit: 'lb' }],
    ['(2 cups)', { value: 2, unit: 'cup' }],
    ['(120g)', { value: 120, unit: 'g' }],
    ['(93/7)', null],
    ['(any variety)', null],
    ['(or almond flour)', null],
  ])('%j → %j', (text, expected) => {
    expect(parseParenQuantity(text)).toEqual(expected);
  });
});
