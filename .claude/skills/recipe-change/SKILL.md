---
name: recipe-change
description: Use whenever adding, editing, renaming, or deleting a recipe in this collection (breakfast/, dinner/, snacks/, pantry/), or changing any ingredient name, quantity, or macro line. Keeps recipe markdown in sync with the nutrition table and ensures every change passes validation, the macro audit, and the golden-corpus tests so a markdown edit never leaves an orphaned recipe behind.
---

# Recipe Change Workflow

A recipe markdown file is never edited in isolation — it is backed by a parser,
a nutrition table, and a test suite. Changing the markdown without keeping those
in sync leaves an **orphan**: a recipe that no longer parses, has a macro line
that disagrees with its ingredients, or references an ingredient the app can't
resolve. This skill is the checklist that prevents that.

## When this applies

Any time you create, edit, rename, or delete a recipe `.md` file, or change an
ingredient line, a quantity, or a macro line. Also when you add an ingredient
the collection hasn't used before.

## The workflow

1. **Write to the house format.** Follow the template, style conventions,
   measurement preferences, and **canonical ingredient names** documented in
   `CLAUDE.md`. Grams are primary; prep goes after a comma (`banana, mashed`);
   brand/size hints in parentheses. Ingredients marked `(optional)` are excluded
   from macros. Pantry recipes use `**Yield:**` and omit the macros line.

2. **New ingredient? Update the nutrition table.** If the recipe introduces an
   ingredient not already in `app/scripts/nutrition.ts`, add an entry keyed by
   the parser's normalized lowercase name (plural-folded, e.g. `eggs` → `egg`).
   Provide per-100g `cal`, `p`, `f`, `c`, plus `density` (g/ml) for volume-
   measured items or `piece` (g per counted item). Mark `lowConfidence: true`
   when the value is a guess from an unknown label.

3. **Recompute the macro lines.** Update `**Per serving:**` and, for
   drink/blended recipes, the `**Per 100g:** … (~Ng per serving)` line to match
   the actual ingredient grams. Don't eyeball it — the audit will check you.

4. **Run the checks from `app/`** (in order; fix and re-run until all clean):
   - `cd app && npm run validate` — **must report 0 errors.** It exits non-zero
     on any parse failure. A `MISSING` count or structural error here means the
     markdown or an ingredient name is malformed.
   - `cd app && npm run audit` — find the row for **the file you changed**. Its
     `[±N% cal]` should be within ~7%. A `MISSING` flag means an ingredient name
     didn't resolve to a `nutrition.ts` key (fix the name to a canonical one, or
     add the entry). Fix the macro line or the nutrition entry until the
     stated/computed rows agree. *Note: the audit always prints ⚠️ for some
     pre-existing recipes — only the row you touched matters.*
   - `cd app && npm test` — the golden-corpus suite must stay green.

5. **No orphans.** The change is not done until `validate` is clean, the audited
   row for your file is within tolerance, and `test` passes. A markdown edit that
   adds an unrecognized ingredient, or changes quantities without updating the
   macro line, is incomplete.

## Notes

- The app treats recipe markdown as read-only and re-parses on refresh, so
  recipe edits need **no app/server code changes** — only `nutrition.ts` when a
  genuinely new ingredient appears.
- If `validate` reports a dropped "structured ingredient" count after your edit,
  an ingredient name stopped resolving — reconcile it against the canonical
  names in `CLAUDE.md`.
