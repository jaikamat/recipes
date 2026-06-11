/**
 * Canonical units, spelling variants, dimension classes, and conversions.
 *
 * The aggregator sums quantities only within a dimension (mass in grams,
 * volume in milliliters, counts). Mass and volume are NEVER converted into
 * each other — that would require ingredient densities and would silently
 * produce wrong shopping lists.
 *
 * Invariant: pure data + pure functions, no exceptions.
 */
import type { CanonicalUnit } from '../types.js';

/** What kind of measurement a unit expresses. */
export type Dimension = 'mass' | 'volume' | 'count';

interface UnitInfo {
  dimension: Dimension;
  /** Multiplier to the dimension's base unit (g for mass, ml for volume, each for count). */
  toBase: number;
}

const UNIT_INFO: Record<CanonicalUnit, UnitInfo> = {
  mg: { dimension: 'mass', toBase: 0.001 },
  g: { dimension: 'mass', toBase: 1 },
  kg: { dimension: 'mass', toBase: 1000 },
  oz: { dimension: 'mass', toBase: 28.3495 },
  lb: { dimension: 'mass', toBase: 453.592 },
  ml: { dimension: 'volume', toBase: 1 },
  l: { dimension: 'volume', toBase: 1000 },
  tsp: { dimension: 'volume', toBase: 4.92892 },
  tbsp: { dimension: 'volume', toBase: 14.7868 },
  cup: { dimension: 'volume', toBase: 236.588 },
  pinch: { dimension: 'count', toBase: 1 },
  clove: { dimension: 'count', toBase: 1 },
  can: { dimension: 'count', toBase: 1 },
  scoop: { dimension: 'count', toBase: 1 },
  bag: { dimension: 'count', toBase: 1 },
  box: { dimension: 'count', toBase: 1 },
  carton: { dimension: 'count', toBase: 1 },
  packet: { dimension: 'count', toBase: 1 },
  jar: { dimension: 'count', toBase: 1 },
  count: { dimension: 'count', toBase: 1 },
};

/**
 * Spelling variants as they appear in the recipe corpus, mapped to canonical
 * units. Matching is case-sensitive only where it must be: "TBSP"/"tbsp" both
 * appear; bare "T" is intentionally NOT a unit (too ambiguous).
 */
const UNIT_VARIANTS: Record<string, CanonicalUnit> = {
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  mg: 'mg',
  ml: 'ml',
  mL: 'ml',
  ML: 'ml',
  l: 'l',
  L: 'l',
  liter: 'l',
  liters: 'l',
  litre: 'l',
  litres: 'l',
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  TBSP: 'tbsp',
  tbsp: 'tbsp',
  Tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  cup: 'cup',
  cups: 'cup',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  pinch: 'pinch',
  pinches: 'pinch',
  clove: 'clove',
  cloves: 'clove',
  can: 'can',
  cans: 'can',
  scoop: 'scoop',
  scoops: 'scoop',
  bag: 'bag',
  bags: 'bag',
  box: 'box',
  boxes: 'box',
  carton: 'carton',
  cartons: 'carton',
  packet: 'packet',
  packets: 'packet',
  jar: 'jar',
  jars: 'jar',
};

/**
 * Look up a unit word (as written) and return its canonical unit.
 *
 * @example lookupUnit('TBSP') // 'tbsp'
 * @example lookupUnit('cups') // 'cup'
 * @example lookupUnit('small') // undefined
 */
export function lookupUnit(word: string): CanonicalUnit | undefined {
  return UNIT_VARIANTS[word] ?? UNIT_VARIANTS[word.toLowerCase()];
}

/** The dimension a canonical unit measures. */
export function dimensionOf(unit: CanonicalUnit): Dimension {
  return UNIT_INFO[unit].dimension;
}

/**
 * Convert a value in `unit` to the dimension's base unit
 * (grams, milliliters, or each).
 *
 * @example toBase(1, 'lb')  // 453.592
 * @example toBase(2, 'tbsp') // 29.5736
 */
export function toBase(value: number, unit: CanonicalUnit): number {
  return value * UNIT_INFO[unit].toBase;
}

/** Convert a base-unit value back into `unit`. */
export function fromBase(value: number, unit: CanonicalUnit): number {
  return value / UNIT_INFO[unit].toBase;
}

/** Regex source matching any unit variant as a whole word, longest first. */
export const UNIT_WORD_SOURCE = Object.keys(UNIT_VARIANTS)
  .sort((a, b) => b.length - a.length)
  .join('|');
