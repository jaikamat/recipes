/**
 * Domain types shared by the server, the client, and tests.
 *
 * This is the single source of truth for what a parsed recipe looks like.
 * The markdown files in the repository remain the canonical data; these
 * types describe the parser's best-effort structured view of them.
 *
 * Invariant: parsing is lossless for display purposes — every ingredient
 * keeps its `raw` line and every section's original text survives, so the
 * UI can always fall back to showing exactly what the markdown says.
 */

/** Recipe category, mirroring the four top-level repo directories. */
export type Category = 'breakfast' | 'dinner' | 'snacks' | 'pantry';

/** All categories in display order. */
export const CATEGORIES: readonly Category[] = [
  'breakfast',
  'dinner',
  'snacks',
  'pantry',
];

/** Per-serving (or per-100g) macronutrients. */
export interface Macros {
  calories: number;
  /** grams */
  protein: number;
  /** grams */
  fat: number;
  /** grams */
  carbs: number;
}

/**
 * Units the ingredient parser can recognize and the aggregator can sum.
 * `count` covers unit-less quantities like "5 small apples" or "2 eggs".
 */
export type CanonicalUnit =
  | 'g'
  | 'kg'
  | 'mg'
  | 'ml'
  | 'l'
  | 'tsp'
  | 'tbsp'
  | 'cup'
  | 'lb'
  | 'oz'
  | 'pinch'
  | 'clove'
  | 'can'
  | 'count';

/** A quantity like `2`, `2-3` (range), or `~150` (approximate). */
export interface Quantity {
  value: number;
  /** Upper bound when the line gives a range ("2-3 TBSP"). */
  max?: number;
  /** True when the line marks the amount approximate ("~150ml"). */
  approx?: boolean;
}

/**
 * One ingredient line.
 *
 * `raw` is always present and is what the cook view renders (after optional
 * scaling of the parsed parts). When `parsed` is false the line had no
 * leading quantity ("Salt to taste", "Pinch of salt") — that is expected,
 * not an error; such lines pass through aggregation verbatim.
 */
export interface Ingredient {
  /** The bullet text exactly as written in the markdown (without "- "). */
  raw: string;
  /** True when quantity + name were extracted for scaling/aggregation. */
  parsed: boolean;
  quantity?: Quantity;
  unit?: CanonicalUnit;
  /** Normalized (lowercased, trimmed) name used as the aggregation key. */
  name?: string;
  /** The name with its original casing, for display ("Shaoxing wine"). */
  displayName?: string;
  /** Parenthetical alternate measure, e.g. "(1 lb)" in "454g (1 lb) ...". */
  altQuantity?: { value: number; unit: CanonicalUnit };
  /** Preparation note after the first comma ("snipped and seeds shaken out"). */
  note?: string;
}

/** Ingredients under one italic sub-heading (`_Sauce:_`); heading is absent for ungrouped recipes. */
export interface IngredientGroup {
  heading?: string;
  items: Ingredient[];
}

/** One numbered instruction step. Numbering continues across phases. */
export interface InstructionStep {
  number: number;
  text: string;
}

/** Steps under one italic phase heading (`_Day of — dough:_`); heading absent when unphased. */
export interface InstructionPhase {
  heading?: string;
  steps: InstructionStep[];
}

/** The optional trailing sections a recipe may include, in file order. */
export type ExtraKind = 'Freeze' | 'Thaw' | 'Reheat' | 'Serve' | 'Storage' | 'Notes';

/** A trailing section, either inline (`**Freeze:** text`) or block form (bullets). */
export interface ExtraSection {
  kind: ExtraKind;
  text?: string;
  bullets?: string[];
}

/** A fully parsed recipe. */
export interface Recipe {
  /** Stable id: "category/slug", e.g. "dinner/kung-pao-chicken". */
  id: string;
  category: Category;
  /** Path relative to the repo root, for diagnostics. */
  filePath: string;
  title: string;
  /** Text of a leading TODO line, when the recipe is marked unverified. */
  todo?: string;
  /** Parsed servings; `suffix` keeps text like "meatballs" or "(690g each)". */
  servings?: { count: number; suffix?: string; raw: string };
  /** Pantry recipes use Yield (free text) instead of servings. */
  yield?: string;
  perServing?: Macros;
  per100g?: { macros: Macros; note?: string };
  description?: string;
  ingredients: IngredientGroup[];
  instructions: InstructionPhase[];
  extras: ExtraSection[];
}

/** A diagnostic produced while parsing; errors never abort a parse. */
export interface ParseProblem {
  file: string;
  line: number;
  severity: 'error' | 'warning';
  message: string;
}

/** Payload of GET /api/recipes. */
export interface RecipesResponse {
  recipes: Recipe[];
  problems: ParseProblem[];
  /** ISO timestamp of when the markdown was read. */
  generatedAt: string;
}
