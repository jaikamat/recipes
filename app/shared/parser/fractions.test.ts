import { describe, expect, test } from 'vitest';
import { formatQuantity, parseQuantityToken } from './fractions.js';

describe('parseQuantityToken', () => {
  test.each<[string, number | null]>([
    ['2', 2],
    ['0.5', 0.5],
    ['2.5', 2.5],
    ['½', 0.5],
    ['¼', 0.25],
    ['¾', 0.75],
    ['1¼', 1.25],
    ['2½', 2.5],
    ['1/2', 0.5],
    ['3/4', 0.75],
    ['1 1/2', 1.5],
    ['2 3/4', 2.75],
    ['1/0', null],
    ['', null],
    ['abc', null],
    ['cup', null],
  ])('parses %j as %j', (token, expected) => {
    if (expected === null) {
      expect(parseQuantityToken(token)).toBeNull();
    } else {
      expect(parseQuantityToken(token)).toBeCloseTo(expected, 5);
    }
  });
});

describe('formatQuantity', () => {
  test.each<[number, string]>([
    [2, '2'],
    [680, '680'],
    [0.5, '½'],
    [0.75, '¾'],
    [1.5, '1½'],
    [1.25, '1¼'],
    [2 / 3, '⅔'],
    [1.37, '1.37'],
  ])('formats %j as %j', (value, expected) => {
    expect(formatQuantity(value)).toBe(expected);
  });
});
