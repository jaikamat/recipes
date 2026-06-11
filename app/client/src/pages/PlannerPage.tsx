/**
 * Weekly planner: a template week (Mon–Sun × breakfast/lunch/dinner/snack).
 *
 * Each cell holds recipes with a "servings eaten" count; the table footer
 * totals calories and macros per day, and a summary line totals the week.
 * Recipes without macros (pantry items) show "n/a" and are excluded from
 * sums. "Send week to shopping list" converts the planned servings into
 * batch multipliers and merges them into the shopping selections.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Macros, Recipe } from '@shared/types';
import { useRecipes } from '../hooks/useRecipes';
import {
  usePlanner,
  DAYS,
  SLOTS,
  type Slot,
  type PlanEntry,
} from '../state/plannerStore';
import { useShopping } from '../state/shoppingStore';
import MacroChips from '../components/MacroChips';
import RecipePicker from '../components/RecipePicker';

const ZERO: Macros = { calories: 0, protein: 0, fat: 0, carbs: 0 };

function addMacros(a: Macros, b: Macros, factor: number): Macros {
  return {
    calories: a.calories + b.calories * factor,
    protein: a.protein + b.protein * factor,
    fat: a.fat + b.fat * factor,
    carbs: a.carbs + b.carbs * factor,
  };
}

function roundMacros(m: Macros): Macros {
  return {
    calories: Math.round(m.calories),
    protein: Math.round(m.protein),
    fat: Math.round(m.fat),
    carbs: Math.round(m.carbs),
  };
}

export default function PlannerPage() {
  const { data, byId } = useRecipes();
  const { plan, addEntry, setServings, removeEntry, clear } = usePlanner();
  const { addSelections } = useShopping();
  const navigate = useNavigate();
  const [adding, setAdding] = useState<{ day: number; slot: Slot } | null>(null);

  /** Sum macros for one day; counts how many entries lack macros. */
  const dayTotals = useMemo(
    () =>
      plan.map((day) => {
        let total = ZERO;
        let noMacros = 0;
        for (const slot of SLOTS) {
          for (const entry of day[slot]) {
            const recipe = byId(entry.recipeId);
            if (recipe?.perServing) {
              total = addMacros(total, recipe.perServing, entry.servings);
            } else if (recipe) {
              noMacros++;
            }
          }
        }
        return { total: roundMacros(total), noMacros };
      }),
    [plan, byId],
  );

  const weekTotal = roundMacros(
    dayTotals.reduce((acc, d) => addMacros(acc, d.total, 1), ZERO),
  );
  const planIsEmpty = plan.every((day) => SLOTS.every((slot) => day[slot].length === 0));

  /** Convert planned servings into batch multipliers and merge into shopping. */
  const sendToShopping = () => {
    const servingsByRecipe = new Map<string, number>();
    for (const day of plan) {
      for (const slot of SLOTS) {
        for (const entry of day[slot]) {
          servingsByRecipe.set(
            entry.recipeId,
            (servingsByRecipe.get(entry.recipeId) ?? 0) + entry.servings,
          );
        }
      }
    }
    const selections: Record<string, number> = {};
    for (const [recipeId, servings] of servingsByRecipe) {
      const recipe = byId(recipeId);
      const perBatch = recipe?.servings?.count ?? 1;
      // Round batches up to the half — you can't cook 0.73 of a recipe.
      selections[recipeId] = Math.max(0.5, Math.ceil((servings / perBatch) * 2) / 2);
    }
    addSelections(selections);
    navigate('/shopping');
  };

  if (!data) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h1>Weekly Planner</h1>
      <p className="muted">
        A template week — plan servings per meal and watch the daily totals.
      </p>

      <table className="planner-table">
        <thead>
          <tr>
            <th className="slot-label" />
            {DAYS.map((d) => (
              <th key={d}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SLOTS.map((slot) => (
            <tr key={slot}>
              <th className="slot-label">{slot}</th>
              {DAYS.map((_, day) => (
                <td key={day} className="planner-cell">
                  {plan[day]![slot].map((entry, index) => (
                    <PlannerEntryRow
                      key={index}
                      entry={entry}
                      recipe={byId(entry.recipeId)}
                      onServings={(s) => setServings(day, slot, index, s)}
                      onRemove={() => removeEntry(day, slot, index)}
                    />
                  ))}
                  <button
                    className="planner-add"
                    onClick={() => setAdding({ day, slot })}
                  >
                    + add
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="planner-totals">
            <th className="slot-label">totals</th>
            {dayTotals.map((d, i) => (
              <td key={i}>
                {d.total.calories > 0 ? (
                  <>
                    <strong>{d.total.calories}</strong> cal
                    <br />
                    {d.total.protein}P / {d.total.fat}F / {d.total.carbs}C
                  </>
                ) : (
                  <span className="muted">—</span>
                )}
                {d.noMacros > 0 && (
                  <div className="muted" title="entries without macros are not counted">
                    +{d.noMacros} n/a
                  </div>
                )}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>

      <div className="planner-week-summary">
        <strong>Week:</strong>
        {weekTotal.calories > 0 ? (
          <>
            <MacroChips macros={weekTotal} />
            <span className="muted">
              (avg {Math.round(weekTotal.calories / 7)} cal/day)
            </span>
          </>
        ) : (
          <span className="muted">nothing planned yet</span>
        )}
      </div>

      <div className="planner-actions">
        <button className="primary" onClick={sendToShopping} disabled={planIsEmpty}>
          Send week to shopping list →
        </button>
        <button onClick={clear} disabled={planIsEmpty}>
          Clear week
        </button>
      </div>

      {adding && (
        <div className="popover" onClick={() => setAdding(null)}>
          <div className="popover-inner" onClick={(e) => e.stopPropagation()}>
            <h2>
              Add to {DAYS[adding.day]} {adding.slot}
            </h2>
            <RecipePicker
              onPick={(recipe) => {
                addEntry(adding.day, adding.slot, recipe.id);
                setAdding(null);
              }}
            />
            <button onClick={() => setAdding(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlannerEntryRow({
  entry,
  recipe,
  onServings,
  onRemove,
}: {
  entry: PlanEntry;
  recipe: Recipe | undefined;
  onServings: (servings: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="planner-entry">
      <span className="grow" title={recipe?.title}>
        {recipe?.title ?? entry.recipeId}
        {recipe && !recipe.perServing && <span className="muted"> (n/a)</span>}
      </span>
      <input
        className="planner-servings"
        type="number"
        min={0.5}
        step={0.5}
        value={entry.servings}
        onChange={(e) => onServings(Number(e.target.value) || 1)}
        title="Servings eaten at this meal"
      />
      <button onClick={onRemove} title="Remove" aria-label="Remove">
        ✕
      </button>
    </div>
  );
}
