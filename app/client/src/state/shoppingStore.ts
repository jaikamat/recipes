/**
 * Shopping list state, persisted in localStorage under "recipes.shopping.v1".
 *
 * `selections` maps recipe id → batch multiplier (1 = recipe as written).
 * `checked` holds aggregated-item keys the user marked "have it"; the keys
 * are stable across re-aggregation (see shared/aggregate.ts), so check-offs
 * survive adding more recipes.
 *
 * Selections referencing recipes that no longer exist (renamed/deleted
 * markdown files) are pruned automatically once the collection loads.
 */
import { useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useRecipes } from '../hooks/useRecipes';

export interface ShoppingState {
  selections: Record<string, number>;
  checked: string[];
}

const KEY = 'recipes.shopping.v1';
const EMPTY: ShoppingState = { selections: {}, checked: [] };

export function useShopping() {
  const { data } = useRecipes();
  const [state, setState] = useLocalStorage<ShoppingState>(KEY, EMPTY);

  // Self-heal: drop selections for recipes that no longer exist.
  useEffect(() => {
    if (!data) return;
    const valid = new Set(data.recipes.map((r) => r.id));
    const stale = Object.keys(state.selections).filter((id) => !valid.has(id));
    if (stale.length > 0) {
      setState((prev) => ({
        ...prev,
        selections: Object.fromEntries(
          Object.entries(prev.selections).filter(([id]) => valid.has(id)),
        ),
      }));
    }
  }, [data, state.selections, setState]);

  const setMultiplier = (recipeId: string, multiplier: number | null) =>
    setState((prev) => {
      const selections = { ...prev.selections };
      if (multiplier === null) delete selections[recipeId];
      else selections[recipeId] = multiplier;
      return { ...prev, selections };
    });

  const toggleChecked = (key: string) =>
    setState((prev) => ({
      ...prev,
      checked: prev.checked.includes(key)
        ? prev.checked.filter((k) => k !== key)
        : [...prev.checked, key],
    }));

  const clear = () => setState(EMPTY);

  /** Merge selections in (used by the planner's "send week to shopping"). */
  const addSelections = (incoming: Record<string, number>) =>
    setState((prev) => {
      const selections = { ...prev.selections };
      for (const [id, mult] of Object.entries(incoming)) {
        selections[id] = (selections[id] ?? 0) + mult;
      }
      return { ...prev, selections };
    });

  return { state, setMultiplier, toggleChecked, clear, addSelections };
}
