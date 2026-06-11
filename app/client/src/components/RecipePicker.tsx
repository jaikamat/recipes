/**
 * Searchable recipe multi-select used by the shopping list (with per-recipe
 * batch multipliers) and, in pick-one mode, by the planner's add popover.
 */
import { useState } from 'react';
import type { Recipe } from '@shared/types';
import { CATEGORIES } from '@shared/types';
import { useRecipes } from '../hooks/useRecipes';

interface PickerProps {
  /** recipe id → multiplier; ids absent are unselected. */
  selections?: Record<string, number>;
  /** Called when a recipe is (de)selected or its multiplier changes. */
  onMultiplier?: (recipeId: string, multiplier: number | null) => void;
  /** Pick-one mode: clicking a recipe fires this instead of toggling. */
  onPick?: (recipe: Recipe) => void;
}

export default function RecipePicker({
  selections = {},
  onMultiplier,
  onPick,
}: PickerProps) {
  const { data } = useRecipes();
  const [query, setQuery] = useState('');

  if (!data) return <p className="muted">Loading…</p>;
  const q = query.trim().toLowerCase();
  const visible = data.recipes.filter((r) => !q || r.title.toLowerCase().includes(q));

  return (
    <div className="picker no-print">
      <input
        type="search"
        placeholder="Filter recipes…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {CATEGORIES.map((category) => {
        const inCategory = visible.filter((r) => r.category === category);
        if (inCategory.length === 0) return null;
        return (
          <div key={category}>
            <div className="picker-category">{category}</div>
            <ul className="picker-list">
              {inCategory.map((r) => {
                const mult = selections[r.id];
                return (
                  <li key={r.id}>
                    {onPick ? (
                      <button className="grow" onClick={() => onPick(r)}>
                        {r.title}
                      </button>
                    ) : (
                      <>
                        <input
                          type="checkbox"
                          id={`pick-${r.id}`}
                          checked={mult !== undefined}
                          onChange={(e) =>
                            onMultiplier?.(r.id, e.target.checked ? 1 : null)
                          }
                        />
                        <label className="grow" htmlFor={`pick-${r.id}`}>
                          {r.title}
                        </label>
                        {mult !== undefined && (
                          <>
                            <span className="muted">×</span>
                            <input
                              className="mult-input"
                              type="number"
                              min={0.5}
                              step={0.5}
                              value={mult}
                              onChange={(e) =>
                                onMultiplier?.(r.id, Number(e.target.value) || 1)
                              }
                              title="Batch multiplier (2 = double the recipe)"
                            />
                          </>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
