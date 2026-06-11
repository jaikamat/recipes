/**
 * Ingredient line grammar.
 *
 * Parses one markdown bullet (without the leading "- ") into a structured
 * {@link Ingredient}: quantity (with ranges and "~" approximation), unit,
 * alternate parenthetical measure, name, and preparation note.
 *
 * Lines with no leading quantity — "Salt to taste", "Pinch of salt" — are
 * returned with `parsed: false`. That is expected behavior, not an error:
 * such lines pass through scaling and aggregation verbatim.
 *
 * Invariant: never throws; `raw` is always preserved exactly.
 */
import type { CanonicalUnit, Ingredient, Quantity } from '../types.js';
import { QUANTITY_TOKEN_SOURCE, parseQuantityToken } from './fractions.js';
import { lookupUnit } from './units.js';

/**
 * Leading quantity: optional "~", a quantity token, optionally followed by
 * a range separator and a second token. Examples: "454", "2-3", "~150",
 * "½", "1¼", "1 1/2", "8-10".
 */
const LEADING_QUANTITY = new RegExp(
  `^(~)?(${QUANTITY_TOKEN_SOURCE})(?:\\s*[-–]\\s*(${QUANTITY_TOKEN_SOURCE}))?\\s*`,
);

/** "(1 lb)" / "(~2 cups)" / "(120g)" — a parenthetical that is purely qty + unit. */
const PAREN_QUANTITY = new RegExp(
  `^\\(\\s*~?\\s*(${QUANTITY_TOKEN_SOURCE})\\s*([A-Za-z]+)\\s*\\)$`,
);

/**
 * Index of the first comma that sits outside any parentheses, or -1.
 * Needed so "dark soy sauce (optional, for color)" keeps its parenthetical
 * intact instead of being split mid-paren.
 */
function topLevelCommaIndex(text: string): number {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) return i;
  }
  return -1;
}

/**
 * Parse the inside of a parenthetical as an alternate measure.
 *
 * @example parseParenQuantity('(1 lb)')   // { value: 1, unit: 'lb' }
 * @example parseParenQuantity('(120g)')   // { value: 120, unit: 'g' }
 * @example parseParenQuantity('(93/7)')   // null — that's a lean ratio, not a measure
 */
export function parseParenQuantity(
  text: string,
): { value: number; unit: CanonicalUnit } | null {
  const m = text.match(PAREN_QUANTITY);
  if (!m) return null;
  const value = parseQuantityToken(m[1]!);
  const unit = lookupUnit(m[2]!);
  if (value === null || unit === undefined || unit === 'count') return null;
  return { value, unit };
}

/**
 * Parse one ingredient line.
 *
 * @example
 * parseIngredient('454g (1 lb) ground turkey (93/7)')
 * // { raw: '...', parsed: true, quantity: { value: 454 }, unit: 'g',
 * //   altQuantity: { value: 1, unit: 'lb' }, name: 'ground turkey', note: '(93/7)' }
 *
 * @example
 * parseIngredient('2-3 TBSP maple syrup')
 * // { parsed: true, quantity: { value: 2, max: 3 }, unit: 'tbsp', name: 'maple syrup' }
 *
 * @example
 * parseIngredient('Salt to taste')
 * // { raw: 'Salt to taste', parsed: false }
 */
export function parseIngredient(rawLine: string): Ingredient {
  const raw = rawLine.trim();
  const unparsed: Ingredient = { raw, parsed: false };

  // --- Stage 1: leading quantity -----------------------------------------
  const qtyMatch = raw.match(LEADING_QUANTITY);
  if (!qtyMatch) return unparsed;
  const value = parseQuantityToken(qtyMatch[2]!);
  if (value === null) return unparsed;

  const quantity: Quantity = { value };
  if (qtyMatch[1]) quantity.approx = true;
  if (qtyMatch[3]) {
    const max = parseQuantityToken(qtyMatch[3]);
    if (max !== null) quantity.max = max;
  }
  let rest = raw.slice(qtyMatch[0].length);

  // --- Stage 2: unit (the first word, when it is a known unit) -----------
  // Works for both attached ("454g ...") and spaced ("2 TBSP ...") forms,
  // because stage 1 consumed only the digits.
  let unit: CanonicalUnit = 'count';
  const firstWord = rest.match(/^([A-Za-z]+)(?=[\s(,]|$)/);
  if (firstWord) {
    const found = lookupUnit(firstWord[1]!);
    if (found) {
      unit = found;
      rest = rest.slice(firstWord[0].length).replace(/^\s+/, '');
      // "1 pinch of salt" → drop the "of"
      rest = rest.replace(/^of\s+/, '');
    }
  }

  // --- Stage 3: leading parenthetical right after the unit ---------------
  // A measure ("(1 lb)", "(~2 cups)") becomes the alternate quantity;
  // anything else ("(1 large)", "(1 stick)") is descriptive and moves to
  // the note so it never pollutes the name.
  let altQuantity: Ingredient['altQuantity'];
  const noteParts: string[] = [];
  const leadingParen = rest.match(/^(\([^)]*\))\s*/);
  if (leadingParen) {
    const alt = parseParenQuantity(leadingParen[1]!);
    if (alt) altQuantity = alt;
    else noteParts.push(leadingParen[1]!);
    rest = rest.slice(leadingParen[0].length);
  }

  // --- Stage 4: name / note split at the first comma outside parens ------
  const commaIndex = topLevelCommaIndex(rest);
  let namePart = commaIndex === -1 ? rest : rest.slice(0, commaIndex);
  const commaNote = commaIndex === -1 ? undefined : rest.slice(commaIndex + 1).trim();

  // --- Stage 5: trailing parenthetical on the name -----------------------
  // "½ cup yogurt (120g)" → altQuantity; "ground turkey (93/7)" → note.
  const trailingParen = namePart.match(/\s*(\([^)]*\))\s*$/);
  if (trailingParen) {
    const alt = parseParenQuantity(trailingParen[1]!);
    if (alt && !altQuantity) altQuantity = alt;
    else noteParts.push(trailingParen[1]!);
    namePart = namePart.slice(0, trailingParen.index).trim();
  }

  if (commaNote && commaNote.length > 0) noteParts.push(commaNote);
  const note = noteParts.length > 0 ? noteParts.join(', ') : undefined;

  const displayName = namePart.trim().replace(/\s+/g, ' ');
  const name = displayName.toLowerCase();
  if (name.length === 0) return unparsed;

  const ingredient: Ingredient = { raw, parsed: true, quantity, unit, name, displayName };
  if (altQuantity) ingredient.altQuantity = altQuantity;
  if (note) ingredient.note = note;
  return ingredient;
}
