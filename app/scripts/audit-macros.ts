/**
 * Macro audit — `npm run audit`.
 *
 * Recomputes every recipe's per-serving macros from the nutrition table
 * (scripts/nutrition.ts) and compares them to the values stated in the
 * markdown. REPORTS ONLY — never writes to recipe files.
 *
 * The computed numbers are estimates: generic table values can't beat a
 * real product label, volume→gram densities are approximate, and entries
 * marked lowConfidence are guesses. Use the report to find recipes whose
 * stated macros look implausible, then verify against labels before
 * editing anything.
 *
 * Flags printed per recipe:
 *   MISSING  — ingredient has no table entry (excluded from totals)
 *   NO-CONV  — measured by volume/count but the entry lacks density/piece
 *   GUESS    — a lowConfidence entry contributed (verify its label)
 */
import type { Ingredient, Macros, Recipe } from '../shared/types.js';
import { dimensionOf, toBase } from '../shared/parser/units.js';
import { loadRecipes } from '../server/recipes.js';
import { NUTRITION, PASSTHROUGH_OK, type NutritionEntry } from './nutrition.js';

interface Flags {
  missing: Set<string>;
  noConversion: Set<string>;
  guesses: Set<string>;
}

/** Same plural fold the aggregator uses for its keys. */
function fold(name: string): string {
  if (name.length > 3 && name.endsWith('s') && !name.endsWith('ss')) {
    return name.slice(0, -1);
  }
  return name;
}

function lookup(name: string): NutritionEntry | undefined {
  const candidates = [name, fold(name)];
  if (name.endsWith('es')) candidates.push(name.slice(0, -2)); // tomatoes → tomato
  if (name.endsWith('ies')) candidates.push(`${name.slice(0, -3)}y`); // berries → berry
  for (const c of candidates) {
    const entry = NUTRITION[c];
    if (entry) return entry;
  }
  return undefined;
}

/** Estimate the grams of one ingredient line; null when not computable. */
function gramsOf(ing: Ingredient, entry: NutritionEntry, flags: Flags): number | null {
  const qty = ing.quantity!;
  const amount = qty.max !== undefined ? (qty.value + qty.max) / 2 : qty.value;
  const unit = ing.unit ?? 'count';
  const dimension = dimensionOf(unit);

  if (dimension === 'mass') return toBase(amount, unit);
  // A gram parenthetical beats any volume/count estimate.
  if (ing.altQuantity && dimensionOf(ing.altQuantity.unit) === 'mass') {
    return toBase(ing.altQuantity.value, ing.altQuantity.unit);
  }
  if (dimension === 'volume') {
    const ml = toBase(amount, unit);
    if (entry.density === undefined) {
      flags.noConversion.add(`${ing.raw} (no density)`);
      return null;
    }
    return ml * entry.density;
  }
  // count-like: pinches are ~0.3g; everything else needs a piece weight.
  if (unit === 'pinch') return amount * 0.3;
  if (entry.piece === undefined) {
    flags.noConversion.add(`${ing.raw} (no piece weight)`);
    return null;
  }
  return amount * entry.piece;
}

function addMacros(total: Macros, entry: NutritionEntry, grams: number): void {
  total.calories += (entry.cal * grams) / 100;
  total.protein += (entry.p * grams) / 100;
  total.fat += (entry.f * grams) / 100;
  total.carbs += (entry.c * grams) / 100;
}

const { recipes } = await loadRecipes();
const byId = new Map(recipes.map((r) => [r.id, r]));

/** Whole-recipe macros for "1 batch breakfast sausage" cross-references. */
function batchTotal(id: string): Macros | null {
  const r = byId.get(id);
  if (!r?.perServing || !r.servings) return null;
  const n = r.servings.count;
  return {
    calories: r.perServing.calories * n,
    protein: r.perServing.protein * n,
    fat: r.perServing.fat * n,
    carbs: r.perServing.carbs * n,
  };
}

interface Row {
  recipe: Recipe;
  computed: Macros;
  flags: Flags;
  pctDev: number;
}

const rows: Row[] = [];

for (const recipe of recipes) {
  if (!recipe.perServing || !recipe.servings) continue; // pantry / yield-only

  const flags: Flags = {
    missing: new Set(),
    noConversion: new Set(),
    guesses: new Set(),
  };
  const total: Macros = { calories: 0, protein: 0, fat: 0, carbs: 0 };

  for (const group of recipe.ingredients) {
    for (const ing of group.items) {
      if (!ing.parsed || !ing.name) {
        if (!PASSTHROUGH_OK.test(ing.raw)) flags.missing.add(`(unparsed) ${ing.raw}`);
        continue;
      }
      // House convention: stated macros exclude optional ingredients
      // (boiled-cookies pecans, minestrone parmesan).
      if (/optional/i.test(ing.raw)) continue;
      const batchRef =
        ing.name === 'batch breakfast sausage'
          ? 'breakfast/breakfast-sausage'
          : ing.name === 'batch dairy-free cheese sauce'
            ? 'snacks/dairy-free-cheese-sauce'
            : ing.name === 'batch egg white tofu'
              ? 'snacks/egg-white-tofu'
              : null;
      if (batchRef) {
        const batch = batchTotal(batchRef);
        if (batch) {
          total.calories += batch.calories * ing.quantity!.value;
          total.protein += batch.protein * ing.quantity!.value;
          total.fat += batch.fat * ing.quantity!.value;
          total.carbs += batch.carbs * ing.quantity!.value;
        }
        continue;
      }
      const entry = lookup(ing.name);
      if (!entry) {
        flags.missing.add(ing.raw);
        continue;
      }
      const grams = gramsOf(ing, entry, flags);
      if (grams === null) continue;
      if (entry.lowConfidence) flags.guesses.add(`${ing.name} (${Math.round(grams)}g)`);
      addMacros(total, entry, grams);
    }
  }

  const n = recipe.servings.count;
  const computed: Macros = {
    calories: total.calories / n,
    protein: total.protein / n,
    fat: total.fat / n,
    carbs: total.carbs / n,
  };
  const pctDev =
    ((computed.calories - recipe.perServing.calories) / recipe.perServing.calories) * 100;
  rows.push({ recipe, computed, flags, pctDev });
}

rows.sort((a, b) => Math.abs(b.pctDev) - Math.abs(a.pctDev));

const fmt = (m: Macros) =>
  `${Math.round(m.calories)} cal | ${Math.round(m.protein)}P | ${Math.round(m.fat)}F | ${Math.round(m.carbs)}C`;

console.log('Macro audit — computed (nutrition table) vs stated (markdown)\n');
for (const { recipe, computed, flags, pctDev } of rows) {
  const marker = Math.abs(pctDev) > 7 ? '⚠️ ' : '   ';
  console.log(
    `${marker}${recipe.filePath}  [${pctDev >= 0 ? '+' : ''}${pctDev.toFixed(0)}% cal]`,
  );
  console.log(`     stated:   ${fmt(recipe.perServing!)}`);
  console.log(`     computed: ${fmt(computed)}`);
  for (const m of flags.missing) console.log(`     MISSING  ${m}`);
  for (const m of flags.noConversion) console.log(`     NO-CONV  ${m}`);
  for (const m of flags.guesses) console.log(`     GUESS    ${m}`);
}

const flagged = rows.filter((r) => Math.abs(r.pctDev) > 7).length;
console.log(
  `\n${rows.length} recipes audited; ${flagged} deviate >7% in calories (⚠️). ` +
    'Verify GUESS labels before trusting flagged rows.',
);
