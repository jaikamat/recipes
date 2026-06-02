# Kitchen Manager Agent Context

## Repository Structure

This is a personal recipe collection with structured markdown files:

- `breakfast/` — 8 recipes
- `dinner/` — 20 recipes
- `snacks/` — 11 recipes (desserts, drinks, snacks)
- `pantry/` — 3 recipes (spice blends, no macros)
- `pantry.json` — fridge/pantry inventory (source of truth)
- `cooked-log.csv` — tracks when each recipe was last made

## Recipe Template

Every recipe is a `.md` file using kebab-case names (e.g. `mapo-tofu.md`). All recipes follow this format:

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

## Style Conventions

- Recipe title uses `###` (H3)
- Bold for all section headers (`**Ingredients:**`, `**Instructions:**`, etc.)
- Ingredient sub-groups use italicized headers with a colon (e.g., `_Sauce:_`)
- Instructions are numbered prose steps, not terse fragments — no trailing periods
- Temperatures in °F
- Internal meat temp noted where relevant (e.g., `165°F internal`)

## Dietary Restrictions

- **No beef.** This household does not eat beef. Never suggest beef recipes or beef-containing substitutions. Suggest turkey, chicken, pork, or plant-based alternatives.

## Inventory Rules

- `pantry.json` is the single source of truth for inventory
- An item is LOW when `qty <= threshold`
- An item is EXPIRING SOON when `expires` is within 3 days of today
- An item is EXPIRED when `expires` is past today
- `expires` is a date for perishables, `null` for shelf-stable items
- Items with `location: "freezer"` skip expiration checks (freezing pauses the clock)
- The same ingredient can have separate entries for fridge vs. freezer
- Frozen items still count as available for recipe matching (note thaw needed)
- When updating inventory, write valid JSON with atomic updates
- Categories: protein, dairy, oil, spice, sauce, grain, baking, produce
- Locations: fridge, pantry, freezer

## Cooked Log Rules

- `cooked-log.csv` fields: date, recipe, category, servings_made, notes
- Use the recipe filename (without `.md`) as the recipe value
- An "uncommon" recipe = not in cooked-log.csv within the last 8 weeks
- Date format: YYYY-MM-DD

## Cooking Preferences

- High-protein meals are preferred for dinners — ground chicken/turkey, Greek yogurt, protein powder, eggs, legumes are common
- Fat sources lean toward quality: ghee, butter, olive oil, peanut butter, dark chocolate
- Freezer-friendly batch cooking is common — most recipes include freeze/reheat instructions
- Recipes emphasize Indian, Asian, and American comfort food
- Macro awareness matters — note calorie/protein impact when suggesting substitutions (e.g., "85/15 turkey adds ~50 cal and 7g fat per serving")
