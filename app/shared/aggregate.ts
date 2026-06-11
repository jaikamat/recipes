/**
 * Shopping-list aggregation.
 *
 * Combines the ingredients of several (recipe × multiplier) selections into
 * one de-duplicated list. Same-named ingredients are summed *within a
 * dimension* (mass in grams, volume in milliliters, counts). Mass and
 * volume are never converted into each other — that depends on ingredient
 * density and would silently produce wrong amounts; the same name in two
 * dimensions simply yields two lines.
 *
 * Invariant: the algorithm never invents data. Any line it cannot
 * confidently merge (no parsed quantity) is passed through verbatim,
 * once per distinct text, flagged `manual: true` ("Check manually").
 */
import type { Ingredient, Recipe } from './types.js';
import type { CanonicalUnit } from './types.js';
import { dimensionOf, fromBase, toBase, type Dimension } from './parser/units.js';
import { formatAmountRange } from './scale.js';

/** One selected recipe with a batch multiplier (1 = the recipe as written). */
export interface Selection {
  recipe: Recipe;
  multiplier: number;
}

/** A recipe that contributed to an aggregated item. */
export interface SourceRef {
  recipeId: string;
  title: string;
  multiplier: number;
}

/** One line of the aggregated shopping list. */
export interface AggregatedItem {
  /**
   * Stable identity for check-off persistence: `name|dimension` for merged
   * items, the lowercased raw text for manual ones. Re-aggregating with
   * more recipes keeps keys stable, so checked items stay checked.
   */
  key: string;
  /** Display name (original casing from its first occurrence). */
  label: string;
  /** Formatted total ("680g", "3-4½ TBSP", "2 cans"); absent for manual items. */
  quantityText?: string;
  /** True when the item needs human judgment ("Salt to taste"). */
  manual: boolean;
  sources: SourceRef[];
}

interface Bucket {
  key: string;
  label: string;
  dimension: Dimension;
  /** Sum of range lower bounds, in the dimension's base unit. */
  baseMin: number;
  /** Sum of range upper bounds (== baseMin when nothing was a range). */
  baseMax: number;
  approx: boolean;
  /** Units seen, in first-seen order — drives the display unit choice. */
  unitsSeen: CanonicalUnit[];
  sources: SourceRef[];
}

/**
 * Pick the quantity/unit to aggregate with. Mass is preferred: for
 * "½ cup yogurt (120g)" the gram measure is the more useful one to shop
 * with, so a parseable mass alternate wins over a volume/count primary.
 */
function effectiveMeasure(ing: Ingredient): {
  value: number;
  max: number;
  unit: CanonicalUnit;
} {
  const primary = {
    value: ing.quantity!.value,
    max: ing.quantity!.max ?? ing.quantity!.value,
    unit: ing.unit ?? ('count' as CanonicalUnit),
  };
  const alt = ing.altQuantity;
  if (alt && dimensionOf(alt.unit) === 'mass' && dimensionOf(primary.unit) !== 'mass') {
    return { value: alt.value, max: alt.value, unit: alt.unit };
  }
  return primary;
}

/** True when a value sits (almost) exactly on quarter precision. */
function quarterClean(value: number): boolean {
  return Math.abs(value - Math.round(value * 4) / 4) < 0.02;
}

/** Choose the display unit for a bucket's total. */
function displayUnit(bucket: Bucket): CanonicalUnit {
  const { dimension, unitsSeen, baseMax } = bucket;
  if (dimension === 'mass') {
    return baseMax >= 1000 && unitsSeen.every((u) => u === 'g' || u === 'kg')
      ? 'kg'
      : 'g';
  }
  if (dimension === 'volume') {
    // Metric stays metric; spoon amounts promote upward as they grow, but
    // only when both range bounds survive the promotion without rounding
    // error (3 TBSP must not become "¼ cup").
    if (unitsSeen.some((u) => u === 'ml' || u === 'l')) {
      return baseMax >= 1000 ? 'l' : 'ml';
    }
    for (const unit of ['cup', 'tbsp'] as const) {
      const min = fromBase(bucket.baseMin, unit);
      const max = fromBase(bucket.baseMax, unit);
      const floor = unit === 'cup' ? 0.25 : 1;
      // 0.01 tolerance absorbs tsp↔TBSP↔cup conversion error (3 tsp ≈ 0.999997 TBSP).
      if (max >= floor - 0.01 && quarterClean(min) && quarterClean(max)) return unit;
    }
    return 'tsp';
  }
  // count: keep a specific countable unit (clove/can/pinch) if uniform.
  const first = bucket.unitsSeen[0] ?? 'count';
  return bucket.unitsSeen.every((u) => u === first) ? first : 'count';
}

function formatBucket(bucket: Bucket): string {
  const unit = displayUnit(bucket);
  const approx = bucket.approx ? '~' : '';
  const min = fromBase(bucket.baseMin, unit);
  const max = fromBase(bucket.baseMax, unit);
  return `${approx}${formatAmountRange(min, max, unit)}`;
}

/**
 * Aggregate the selections into a shopping list.
 *
 * @example
 * aggregate([{ recipe: kungPao, multiplier: 2 }, { recipe: mapoTofu, multiplier: 1 }])
 * // → [{ key: 'light soy sauce|volume', label: 'light soy sauce',
 * //      quantityText: '45ml', manual: false, sources: [...] }, ...]
 *
 * @returns merged items (sorted by label) followed by manual items.
 */
export function aggregate(selections: Selection[]): AggregatedItem[] {
  const buckets = new Map<string, Bucket>();
  const manual = new Map<string, AggregatedItem>();

  for (const { recipe, multiplier } of selections) {
    const source: SourceRef = { recipeId: recipe.id, title: recipe.title, multiplier };
    for (const group of recipe.ingredients) {
      for (const ing of group.items) {
        if (!ing.parsed || !ing.quantity || !ing.name) {
          const key = ing.raw.toLowerCase();
          const existing = manual.get(key);
          if (existing) existing.sources.push(source);
          else manual.set(key, { key, label: ing.raw, manual: true, sources: [source] });
          continue;
        }

        const measure = effectiveMeasure(ing);
        const dimension = dimensionOf(measure.unit);
        const key = `${ing.name}|${dimension}`;
        let bucket = buckets.get(key);
        if (!bucket) {
          bucket = {
            key,
            label: ing.displayName ?? ing.name,
            dimension,
            baseMin: 0,
            baseMax: 0,
            approx: false,
            unitsSeen: [],
            sources: [],
          };
          buckets.set(key, bucket);
        }
        bucket.baseMin += toBase(measure.value * multiplier, measure.unit);
        bucket.baseMax += toBase(measure.max * multiplier, measure.unit);
        bucket.approx ||= ing.quantity.approx ?? false;
        bucket.unitsSeen.push(measure.unit);
        bucket.sources.push(source);
      }
    }
  }

  const merged: AggregatedItem[] = [...buckets.values()]
    .map((b) => ({
      key: b.key,
      label: b.label,
      quantityText: formatBucket(b),
      manual: false,
      sources: b.sources,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const manualItems = [...manual.values()].sort((a, b) => a.label.localeCompare(b.label));
  return [...merged, ...manualItems];
}
