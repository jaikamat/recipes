import { describe, expect, test } from 'vitest';
import { dimensionOf, fromBase, lookupUnit, toBase } from './units.js';

describe('lookupUnit', () => {
  test.each([
    ['g', 'g'],
    ['TBSP', 'tbsp'],
    ['tbsp', 'tbsp'],
    ['tsp', 'tsp'],
    ['cups', 'cup'],
    ['cup', 'cup'],
    ['lb', 'lb'],
    ['lbs', 'lb'],
    ['oz', 'oz'],
    ['mL', 'ml'],
    ['ml', 'ml'],
    ['L', 'l'],
    ['kg', 'kg'],
    ['cloves', 'clove'],
    ['cans', 'can'],
    ['pinch', 'pinch'],
  ] as const)('maps %j to %j', (word, expected) => {
    expect(lookupUnit(word)).toBe(expected);
  });

  test.each(['small', 'large', 'medium', 'dried', 'ground', 'T'])(
    'does not treat %j as a unit',
    (word) => {
      expect(lookupUnit(word)).toBeUndefined();
    },
  );
});

describe('dimensions and conversion', () => {
  test('mass units convert to grams', () => {
    expect(dimensionOf('lb')).toBe('mass');
    expect(toBase(1, 'lb')).toBeCloseTo(453.592, 3);
    expect(toBase(1, 'kg')).toBe(1000);
    expect(toBase(1, 'oz')).toBeCloseTo(28.3495, 3);
  });

  test('volume units convert to milliliters', () => {
    expect(dimensionOf('cup')).toBe('volume');
    expect(toBase(1, 'cup')).toBeCloseTo(236.588, 3);
    expect(toBase(3, 'tsp')).toBeCloseTo(toBase(1, 'tbsp'), 1);
    expect(toBase(16, 'tbsp')).toBeCloseTo(toBase(1, 'cup'), 0);
  });

  test('fromBase inverts toBase', () => {
    expect(fromBase(toBase(2.5, 'cup'), 'cup')).toBeCloseTo(2.5, 9);
    expect(fromBase(toBase(454, 'g'), 'lb')).toBeCloseTo(1, 2);
  });

  test('mass and volume are distinct dimensions', () => {
    expect(dimensionOf('g')).not.toBe(dimensionOf('ml'));
    expect(dimensionOf('count')).toBe('count');
  });
});
