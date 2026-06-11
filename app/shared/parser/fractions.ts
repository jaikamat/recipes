/**
 * Fraction handling for ingredient quantities.
 *
 * Recipes write quantities as unicode fractions (½, 1¼), ascii fractions
 * (1/2, 1 1/2), or decimals (0.5). This module converts a quantity *token*
 * to a decimal number. It deliberately operates only on the token the
 * caller has already isolated at the start of an ingredient line — it never
 * rewrites fractions elsewhere (so "3/4-inch cubes" inside a note is left
 * alone).
 *
 * Invariant: pure functions, no exceptions; `null` means "not a number".
 */

/** Unicode vulgar fractions the recipe corpus uses (plus the common rest). */
const UNICODE_FRACTIONS: Record<string, number> = {
  '¼': 0.25,
  '½': 0.5,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

/** Character class matching any supported unicode fraction (for regexes). */
export const UNICODE_FRACTION_CLASS = `[${Object.keys(UNICODE_FRACTIONS).join('')}]`;

/**
 * Regex source matching one numeric quantity token at it appears in recipes:
 * `1¼`, `½`, `1 1/2`, `1/2`, `2`, `0.5`.
 * Groups are non-capturing; use {@link parseQuantityToken} to get the value.
 */
// Order matters: the bare ascii fraction ("1/2") must come before the
// integer branch, or the integer branch would match just the "1".
export const QUANTITY_TOKEN_SOURCE = `(?:\\d+/\\d+|\\d+(?:\\.\\d+)?(?:\\s+\\d+/\\d+|${UNICODE_FRACTION_CLASS})?|${UNICODE_FRACTION_CLASS})`;

/**
 * Parse a quantity token into a decimal number.
 *
 * @example parseQuantityToken('1¼')    // 1.25
 * @example parseQuantityToken('1 1/2') // 1.5
 * @example parseQuantityToken('3/4')   // 0.75
 * @example parseQuantityToken('2.5')   // 2.5
 * @returns the numeric value, or null when the token is not a quantity.
 */
export function parseQuantityToken(token: string): number | null {
  const t = token.trim();
  if (t.length === 0) return null;

  // Pure unicode fraction: "½"
  const unicodeValue = UNICODE_FRACTIONS[t];
  if (unicodeValue !== undefined) return unicodeValue;

  // Integer + attached unicode fraction: "1¼"
  const attached = t.match(new RegExp(`^(\\d+)(${UNICODE_FRACTION_CLASS})$`));
  if (attached) {
    return Number(attached[1]) + (UNICODE_FRACTIONS[attached[2]!] ?? 0);
  }

  // Ascii fraction, optionally with a leading whole number: "1/2", "1 1/2"
  const ascii = t.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (ascii) {
    const whole = ascii[1] ? Number(ascii[1]) : 0;
    const denominator = Number(ascii[3]);
    if (denominator === 0) return null;
    return whole + Number(ascii[2]) / denominator;
  }

  // Plain integer or decimal: "2", "0.5"
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);

  return null;
}

/**
 * Format a decimal back into a kitchen-friendly string for display, using
 * fractions for the common cooking values (0.25, 0.5, ...) and at most two
 * decimals otherwise.
 *
 * @example formatQuantity(1.5)  // "1½"
 * @example formatQuantity(0.75) // "¾"
 * @example formatQuantity(680)  // "680"
 */
export function formatQuantity(value: number): string {
  const whole = Math.floor(value);
  const fraction = value - whole;
  if (fraction < 1e-9) return String(whole);

  for (const [glyph, glyphValue] of Object.entries(UNICODE_FRACTIONS)) {
    if (Math.abs(fraction - glyphValue) < 1e-3) {
      return whole === 0 ? glyph : `${whole}${glyph}`;
    }
  }
  // Not a tidy fraction — show a short decimal.
  return String(Math.round(value * 100) / 100);
}
