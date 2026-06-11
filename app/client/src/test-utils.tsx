/**
 * Test helpers: a recipe fixture factory and a render wrapper that mounts
 * the providers with a mocked /api/recipes fetch.
 */
import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import type { Recipe, RecipesResponse } from '@shared/types';
import { parseIngredient } from '@shared/parser/parseIngredient';
import { RecipesProvider } from './hooks/useRecipes';

/** A dinner recipe: 4 servings, 383 cal/serving, 3 steps, 2 ingredients. */
export function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'dinner/test-recipe',
    category: 'dinner',
    filePath: 'dinner/test-recipe.md',
    title: 'Test Recipe',
    servings: { count: 4, raw: '4' },
    perServing: { calories: 383, protein: 31, fat: 20, carbs: 18 },
    ingredients: [
      {
        items: [
          parseIngredient('454g (1 lb) ground turkey'),
          parseIngredient('Salt to taste'),
        ],
      },
    ],
    instructions: [
      {
        steps: [
          { number: 1, text: 'Brown the turkey' },
          { number: 2, text: 'Add the sauce' },
          { number: 3, text: 'Simmer and serve' },
        ],
      },
    ],
    extras: [],
    ...overrides,
  };
}

/** Mock fetch('/api/recipes') and render under router + recipes provider. */
export function renderWithRecipes(
  ui: ReactElement,
  recipes: Recipe[],
  { route = '/' }: { route?: string } = {},
) {
  const response: RecipesResponse = {
    recipes,
    problems: [],
    generatedAt: new Date().toISOString(),
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => response })),
  );
  return render(
    <MemoryRouter initialEntries={[route]}>
      <RecipesProvider>{ui}</RecipesProvider>
    </MemoryRouter>,
  );
}
