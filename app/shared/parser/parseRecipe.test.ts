/**
 * Structural fixtures, one per real-world shape the corpus contains.
 * The golden corpus test (corpus.test.ts) covers the real files.
 */
import { describe, expect, test } from 'vitest';
import { parseRecipe } from './parseRecipe.js';

const SIMPLE = `### Apple Pie Oatmeal

**Servings:** 4
**Per serving:** 248 cal | 3g protein | 10g fat | 39g carbs
**Per 100g:** 118 cal | 1g protein | 5g fat | 19g carbs (~210g per serving)

**Ingredients:**

- 5 small apples or 3 large (any variety)
- 3 TBSP butter
- 1 cup oatmeal

**Instructions:**

1. Peel and chop apples
2. Cook everything

**Freeze:** Overnight in four 1-cup molds.

**Reheat:** Microwave for 5 minutes.
`;

const GROUPED = `### Kung Pao Chicken

TODO: Evaluate this one once because Claude generated it, I haven't created it yet
**Servings:** 4
**Per serving:** 383 cal | 31g protein | 20g fat | 18g carbs

**Ingredients:**

_Chicken & Marinade:_

- 454g (1 lb) chicken breast, cut into 3/4-inch cubes
- 15g Shaoxing wine

_Sauce:_

- 15g light soy sauce

**Instructions:**

1. Combine chicken with marinade ingredients
2. Stir-fry
`;

const PHASED = `### Turkey Bao Buns

**Servings:** 8
**Per serving:** 300 cal | 20g protein | 8g fat | 35g carbs

**Ingredients:**

- 454g (1 lb) ground turkey

**Instructions:**

_Night before — filling:_

1. Make the filling
2. Chill it

_Day of — dough:_

3. Make the dough
4. Proof

**Freeze:** After steaming.
`;

const PANTRY = `### Aaji's Garam Masala

**Yield:** ~1.5-2 cups

A robust North Indian garam masala from grandmother's recipe.

**Ingredients:**

- 75g (1/2 cup) coriander seeds

**Instructions:**

1. Dry-toast all spices

**Storage:** Airtight jar, away from light.
`;

const PANTRY_WITH_MACROS = `### Date Paste

**Yield:** ~2 cups
**Per serving:** 83 cal | 0.5g protein | 0g fat | 23g carbs

**Ingredients:**

- 907g medjool dates

**Instructions:**

1. Blend
`;

const BLOCK_NOTES = `### Some Snack

**Servings:** 12
**Per serving:** 100 cal | 5g protein | 3g fat | 12g carbs

**Ingredients:**

- 100g oats

**Instructions:**

1. Mix

**Notes:**

- 85/15 turkey adds ~50 cal per serving
- Can swap honey for maple syrup
`;

describe('parseRecipe', () => {
  test('simple recipe with Per 100g note and extras', () => {
    const { recipe, problems } = parseRecipe(
      SIMPLE,
      'breakfast',
      'breakfast/apple-pie-oatmeal.md',
    );
    expect(problems).toEqual([]);
    expect(recipe.id).toBe('breakfast/apple-pie-oatmeal');
    expect(recipe.title).toBe('Apple Pie Oatmeal');
    expect(recipe.servings).toEqual({ count: 4, suffix: undefined, raw: '4' });
    expect(recipe.perServing).toEqual({ calories: 248, protein: 3, fat: 10, carbs: 39 });
    expect(recipe.per100g).toEqual({
      macros: { calories: 118, protein: 1, fat: 5, carbs: 19 },
      note: '~210g per serving',
    });
    expect(recipe.ingredients).toHaveLength(1);
    expect(recipe.ingredients[0]!.heading).toBeUndefined();
    expect(recipe.ingredients[0]!.items).toHaveLength(3);
    expect(recipe.instructions[0]!.steps.map((s) => s.number)).toEqual([1, 2]);
    expect(recipe.extras.map((e) => e.kind)).toEqual(['Freeze', 'Reheat']);
    expect(recipe.extras[0]!.text).toBe('Overnight in four 1-cup molds.');
  });

  test('TODO line and ingredient sub-groups', () => {
    const { recipe, problems } = parseRecipe(
      GROUPED,
      'dinner',
      'dinner/kung-pao-chicken.md',
    );
    expect(problems).toEqual([]);
    expect(recipe.todo).toMatch(/Evaluate this one/);
    expect(recipe.ingredients.map((g) => g.heading)).toEqual([
      'Chicken & Marinade',
      'Sauce',
    ]);
    // "3/4-inch cubes" inside a note must not be mangled
    expect(recipe.ingredients[0]!.items[0]!.note).toBe('cut into 3/4-inch cubes');
  });

  test('instruction phases with numbering continuing across them', () => {
    const { recipe, problems } = parseRecipe(
      PHASED,
      'dinner',
      'dinner/turkey-bao-buns.md',
    );
    expect(problems).toEqual([]);
    expect(recipe.instructions.map((p) => p.heading)).toEqual([
      'Night before — filling',
      'Day of — dough',
    ]);
    expect(recipe.instructions.flatMap((p) => p.steps.map((s) => s.number))).toEqual([
      1, 2, 3, 4,
    ]);
  });

  test('pantry recipe with Yield, description, no macros', () => {
    const { recipe, problems } = parseRecipe(PANTRY, 'pantry', 'pantry/garam-masala.md');
    expect(problems).toEqual([]);
    expect(recipe.yield).toBe('~1.5-2 cups');
    expect(recipe.servings).toBeUndefined();
    expect(recipe.perServing).toBeUndefined();
    expect(recipe.description).toMatch(/grandmother's recipe/);
  });

  test('pantry recipe with both Yield and macros (date-paste shape)', () => {
    const { recipe, problems } = parseRecipe(
      PANTRY_WITH_MACROS,
      'pantry',
      'pantry/date-paste.md',
    );
    expect(problems).toEqual([]);
    expect(recipe.yield).toBe('~2 cups');
    expect(recipe.perServing?.protein).toBe(0.5);
  });

  test('block-form Notes collected as bullets', () => {
    const { recipe, problems } = parseRecipe(
      BLOCK_NOTES,
      'snacks',
      'snacks/some-snack.md',
    );
    expect(problems).toEqual([]);
    expect(recipe.extras).toEqual([
      {
        kind: 'Notes',
        bullets: [
          '85/15 turkey adds ~50 cal per serving',
          'Can swap honey for maple syrup',
        ],
      },
    ]);
  });

  test('unknown bold header becomes a warning, content preserved', () => {
    const src = SIMPLE + '\n**Tips:** Use tart apples.\n';
    const { recipe, problems } = parseRecipe(src, 'breakfast', 'breakfast/x.md');
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ severity: 'warning' });
    expect(recipe.extras.at(-1)).toMatchObject({
      kind: 'Notes',
      text: 'Tips: Use tart apples.',
    });
  });

  test('missing sections produce errors, never throws', () => {
    const { recipe, problems } = parseRecipe(
      '### Only a Title\n',
      'dinner',
      'dinner/x.md',
    );
    expect(recipe.title).toBe('Only a Title');
    const messages = problems.filter((p) => p.severity === 'error').map((p) => p.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        'no ingredients found',
        'no instruction steps found',
        'missing **Servings:**',
        'missing **Per serving:** macros',
      ]),
    );
  });

  test('step numbering jump is a warning', () => {
    const src = SIMPLE.replace('2. Cook everything', '4. Cook everything');
    const { problems } = parseRecipe(src, 'breakfast', 'breakfast/x.md');
    expect(problems).toEqual([
      expect.objectContaining({
        severity: 'warning',
        message: expect.stringContaining('jumps from 1 to 4'),
      }),
    ]);
  });
});
