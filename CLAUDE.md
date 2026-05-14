# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

A personal recipe collection organized into directories by meal type:

- `breakfast/` — breakfast recipes
- `dinner/` — dinner/main course recipes
- `snacks/` — snacks, desserts, and drinks
- `pantry/` — spice blends and pantry staples (no macros section required)

## Recipe Template

All recipes follow this Markdown format:

```markdown
### Recipe Name

**Servings:** N
**Per serving:** Xcal | Xg protein | Xg fat | Xg carbs

Optional 1-2 sentence description of the dish.

**Ingredients:**

Optional grouped sub-sections use italics headers (e.g. _Sauce:_, _Marinade:_):

- ingredient

**Instructions:**

1. Step one
2. Step two

**Freeze:** How to freeze (omit if not applicable).

**Thaw:** How to thaw (omit if not applicable, only include when distinct from reheat).

**Reheat:** How to reheat (omit if not applicable).

**Serve:** Serving suggestions (omit if not applicable).

**Storage:** Fridge storage instructions (omit if not applicable).

**Notes:** Substitutions, variations, or tips (omit if not applicable).
```

Pantry recipes (spice blends, sauces) use `**Yield:**` instead of `**Servings:**` and omit the macros line.

## Measurement Preferences

- **Primary:** grams (g) for all solid and liquid ingredients by weight
- **Secondary:** US customary shown in parentheses when it aids readability — e.g., `454g (1 lb)`, `145g (1 cup)`
- Some volume-only ingredients (spices, extracts) may use tsp/tbsp/cups alone when gram precision is impractical
- Tablespoons are written `TBSP`, teaspoons as `tsp`

## Macro and Nutrition Preferences

- Every recipe includes per-serving macros: calories, carbs, protein, fat
- Recipes skew **high protein** — ground chicken/turkey, Greek yogurt, protein powder, eggs, legumes are common
- Fat sources lean toward quality: ghee, butter, olive oil, peanut butter, dark chocolate
- Meals are designed to be **freezer-friendly** — most include freeze/reheat instructions
- Recipes often note macro impact of substitutions (e.g., "85/15 turkey adds ~50 cal and 7g fat per serving")

## Style Conventions

- Recipe title uses `###` (H3)
- Bold for all section headers (`**Ingredients:**`, `**Instructions:**`, etc.)
- Ingredient sub-groups use italicized headers with a colon (e.g., `_Sauce:_`)
- Instructions are numbered prose steps, not terse fragments — no trailing periods
- Temperatures in °F
- Internal meat temp noted where relevant (e.g., `165°F internal`)
- TODOs or unverified recipes note it at the top (e.g., `TODO: Evaluate this one...`)
