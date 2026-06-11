/**
 * Ingredient scaling for batch cooking.
 *
 * Rebuilds an ingredient line from its parsed parts with quantities
 * multiplied by a factor, formatted back in the house style: metric units
 * attached ("680g"), customary units spaced ("4½ TBSP"), alternate measures
 * in parentheses ("(1½ lb)").
 *
 * Unparsed lines ("Salt to taste") cannot be scaled; callers render `raw`
 * and may mark the line as not scaled when factor ≠ 1.
 *
 * Invariant: pure; never throws; scaling by 1 is a faithful reconstruction
 * of the parsed parts (which may normalize whitespace vs. `raw`, but never
 * changes meaning).
 */
import type { CanonicalUnit, Ingredient } from './types.js';
import { formatQuantity } from './parser/fractions.js';

/** How each unit is written next to a number. */
const UNIT_DISPLAY: Record<
  CanonicalUnit,
  { text: string; attached?: boolean; plural?: string }
> = {
  g: { text: 'g', attached: true },
  kg: { text: 'kg', attached: true },
  mg: { text: 'mg', attached: true },
  ml: { text: 'ml', attached: true },
  l: { text: 'L', attached: true },
  tsp: { text: 'tsp' },
  tbsp: { text: 'TBSP' },
  cup: { text: 'cup', plural: 'cups' },
  lb: { text: 'lb' },
  oz: { text: 'oz' },
  pinch: { text: 'pinch', plural: 'pinches' },
  clove: { text: 'clove', plural: 'cloves' },
  can: { text: 'can', plural: 'cans' },
  scoop: { text: 'scoop', plural: 'scoops' },
  bag: { text: 'bag', plural: 'bags' },
  box: { text: 'box', plural: 'boxes' },
  carton: { text: 'carton', plural: 'cartons' },
  packet: { text: 'packet', plural: 'packets' },
  jar: { text: 'jar', plural: 'jars' },
  count: { text: '' },
};

/** Round a scaled amount sensibly: whole grams/ml, fractions elsewhere. */
function roundAmount(value: number, unit: CanonicalUnit): number {
  if (unit === 'g' || unit === 'ml' || unit === 'mg') return Math.round(value);
  if (unit === 'kg' || unit === 'l' || unit === 'lb' || unit === 'oz') {
    return Math.round(value * 100) / 100;
  }
  // Spoons, cups, counts: quarter precision keeps kitchen-friendly numbers.
  return Math.round(value * 4) / 4;
}

/** Format an amount + unit pair, e.g. (680, 'g') → "680g"; (1.5, 'lb') → "1½ lb". */
export function formatAmount(value: number, unit: CanonicalUnit): string {
  const info = UNIT_DISPLAY[unit];
  const rounded = roundAmount(value, unit);
  // kg and L read better as decimals ("1.5kg"), spoons/cups as fractions ("1½ cup").
  const number =
    unit === 'kg' || unit === 'l' ? String(rounded) : formatQuantity(rounded);
  if (unit === 'count' || info.text === '') return number;
  const unitText = info.plural && rounded > 1 ? info.plural : info.text;
  return info.attached ? `${number}${unitText}` : `${number} ${unitText}`;
}

/**
 * Format a min–max range with the unit on the upper bound only, matching
 * the recipe style: "3-4½ TBSP", "45-60ml".
 */
export function formatAmountRange(min: number, max: number, unit: CanonicalUnit): string {
  if (Math.abs(max - min) < 1e-9) return formatAmount(max, unit);
  return `${formatQuantity(roundAmount(min, unit))}-${formatAmount(max, unit)}`;
}

/**
 * Render an ingredient scaled by `factor` as a display line.
 *
 * @example
 * scaleIngredientLine(parseIngredient('454g (1 lb) ground turkey (93/7)'), 2)
 * // "908g (2 lb) ground turkey, (93/7)"
 * @example
 * scaleIngredientLine(parseIngredient('2-3 TBSP maple syrup'), 1.5)
 * // "3-4½ TBSP maple syrup"
 * @returns the scaled line, or `raw` unchanged when the line is unparsed.
 */
export function scaleIngredientLine(ingredient: Ingredient, factor: number): string {
  if (!ingredient.parsed || !ingredient.quantity) return ingredient.raw;

  const { quantity, unit = 'count' } = ingredient;
  const approx = quantity.approx ? '~' : '';
  const amount = formatAmountRange(
    quantity.value * factor,
    (quantity.max ?? quantity.value) * factor,
    unit,
  );

  const alt = ingredient.altQuantity
    ? ` (${formatAmount(ingredient.altQuantity.value * factor, ingredient.altQuantity.unit)})`
    : '';
  const name = ingredient.displayName ?? ingredient.name ?? '';
  const note = ingredient.note ? `, ${ingredient.note}` : '';

  return `${approx}${amount}${alt} ${name}${note}`.trim();
}
