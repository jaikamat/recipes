import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import PlannerPage from './PlannerPage';
import { makeRecipe, renderWithRecipes } from '../test-utils';
import { emptyWeek } from '../state/plannerStore';

describe('PlannerPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  test('totals multiply per-serving macros by planned servings', async () => {
    // Monday: 2 servings at dinner (383 cal each) + 1 at lunch.
    const week = emptyWeek();
    week[0]!.dinner.push({ recipeId: 'dinner/test-recipe', servings: 2 });
    week[0]!.lunch.push({ recipeId: 'dinner/test-recipe', servings: 1 });
    window.localStorage.setItem('recipes.plan.v1', JSON.stringify(week));

    renderWithRecipes(<PlannerPage />, [makeRecipe()]);

    // Day total: 3 × 383 = 1149 cal; protein 3 × 31 = 93.
    expect(await screen.findByText('1149')).toBeInTheDocument();
    expect(screen.getByText(/93P \/ 60F \/ 54C/)).toBeInTheDocument();
    // Week chip shows the same total (only one day planned).
    expect(screen.getByText('1149 cal')).toBeInTheDocument();
  });

  test('entries with no macros are excluded and marked n/a', async () => {
    const pantry = makeRecipe({
      id: 'pantry/garam-masala',
      category: 'pantry',
      title: 'Garam Masala',
      servings: undefined,
      perServing: undefined,
      yield: '~2 cups',
    });
    const week = emptyWeek();
    week[2]!.dinner.push({ recipeId: 'pantry/garam-masala', servings: 1 });
    window.localStorage.setItem('recipes.plan.v1', JSON.stringify(week));

    renderWithRecipes(<PlannerPage />, [makeRecipe(), pantry]);

    expect(await screen.findByText(/\+1 n\/a/)).toBeInTheDocument();
    expect(screen.getByText('nothing planned yet')).toBeInTheDocument();
  });

  test('entries referencing deleted recipes are pruned on load', async () => {
    const week = emptyWeek();
    week[0]!.dinner.push({ recipeId: 'dinner/renamed-away', servings: 2 });
    week[0]!.dinner.push({ recipeId: 'dinner/test-recipe', servings: 1 });
    window.localStorage.setItem('recipes.plan.v1', JSON.stringify(week));

    renderWithRecipes(<PlannerPage />, [makeRecipe()]);

    expect(await screen.findByText('Test Recipe')).toBeInTheDocument();
    // Pruning happens in an effect after the collection loads.
    await waitFor(() =>
      expect(screen.queryByText(/renamed-away/)).not.toBeInTheDocument(),
    );
    // Only the surviving entry counts: 1 × 383.
    expect(screen.getByText('383 cal')).toBeInTheDocument();
  });
});
