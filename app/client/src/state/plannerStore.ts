/**
 * Weekly plan state, persisted in localStorage under "recipes.plan.v1".
 *
 * The plan is a template week (no dates): 7 days × 4 meal slots, each slot
 * holding entries of { recipeId, servings } — servings being how many
 * per-serving portions are eaten that meal (0.5 steps allowed).
 *
 * The "lunch" slot exists even though the repo has no lunch directory; any
 * recipe can fill any slot (leftover dinners make great lunches).
 *
 * Entries for recipes that no longer exist are pruned once the collection
 * loads, so a renamed markdown file can't wedge the planner.
 */
import { useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useRecipes } from '../hooks/useRecipes';

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type Slot = (typeof SLOTS)[number];

export interface PlanEntry {
  recipeId: string;
  servings: number;
}

/** plan[dayIndex][slot] → entries for that meal. */
export type WeekPlan = Record<Slot, PlanEntry[]>[];

const KEY = 'recipes.plan.v1';

export function emptyWeek(): WeekPlan {
  return DAYS.map(() => ({ breakfast: [], lunch: [], dinner: [], snack: [] }));
}

export function usePlanner() {
  const { data } = useRecipes();
  const [plan, setPlan] = useLocalStorage<WeekPlan>(KEY, emptyWeek());

  // Self-heal: drop entries for recipes that no longer exist.
  useEffect(() => {
    if (!data) return;
    const valid = new Set(data.recipes.map((r) => r.id));
    const hasStale = plan.some((day) =>
      SLOTS.some((slot) => day[slot].some((e) => !valid.has(e.recipeId))),
    );
    if (hasStale) {
      setPlan((prev) =>
        prev.map((day) => ({
          breakfast: day.breakfast.filter((e) => valid.has(e.recipeId)),
          lunch: day.lunch.filter((e) => valid.has(e.recipeId)),
          dinner: day.dinner.filter((e) => valid.has(e.recipeId)),
          snack: day.snack.filter((e) => valid.has(e.recipeId)),
        })),
      );
    }
  }, [data, plan, setPlan]);

  const addEntry = (day: number, slot: Slot, recipeId: string) =>
    setPlan((prev) =>
      prev.map((d, i) =>
        i === day ? { ...d, [slot]: [...d[slot], { recipeId, servings: 1 }] } : d,
      ),
    );

  const setServings = (day: number, slot: Slot, index: number, servings: number) =>
    setPlan((prev) =>
      prev.map((d, i) =>
        i === day
          ? {
              ...d,
              [slot]: d[slot].map((e, j) => (j === index ? { ...e, servings } : e)),
            }
          : d,
      ),
    );

  const removeEntry = (day: number, slot: Slot, index: number) =>
    setPlan((prev) =>
      prev.map((d, i) =>
        i === day ? { ...d, [slot]: d[slot].filter((_, j) => j !== index) } : d,
      ),
    );

  const clear = () => setPlan(emptyWeek());

  return { plan, addEntry, setServings, removeEntry, clear };
}
