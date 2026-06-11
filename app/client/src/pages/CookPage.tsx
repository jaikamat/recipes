/**
 * Cook mode: the page you stand in front of while cooking.
 *
 * - Batch-size bar up top: "Makes 4 servings — I'm making [8]". All parsed
 *   ingredient quantities scale to the chosen batch; macros stay per-serving.
 * - Large-type ingredients on the left, one big current step on the right.
 * - Arrow keys / space step through; 1-9 jump; Esc goes back to the list.
 * - Screen Wake Lock keeps the display on while this page is open.
 * - Batch size and step position survive an accidental refresh via
 *   sessionStorage (and reset next session).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useRecipes } from '../hooks/useRecipes';
import { useKeyboard } from '../hooks/useKeyboard';
import { useWakeLock } from '../hooks/useWakeLock';
import MacroChips from '../components/MacroChips';
import IngredientList from '../components/IngredientList';
import StepView, { flattenSteps } from '../components/StepView';

/**
 * Session-scoped number state (step index, batch size) keyed per recipe.
 * Returns undefined until a value is stored — the recipe data loads after
 * the first render, so defaults must be resolved by the caller at render
 * time, not captured in a useState initializer.
 */
function useSessionNumber(key: string): [number | undefined, (n: number) => void] {
  const [value, setValue] = useState<number | undefined>(() => {
    const stored = window.sessionStorage.getItem(key);
    const parsed = stored === null ? NaN : Number(stored);
    return Number.isFinite(parsed) ? parsed : undefined;
  });
  const set = useCallback(
    (n: number) => {
      setValue(n);
      window.sessionStorage.setItem(key, String(n));
    },
    [key],
  );
  return [value, set];
}

export default function CookPage() {
  const { category, slug } = useParams();
  const navigate = useNavigate();
  const { data, byId } = useRecipes();
  const wakeLockActive = useWakeLock();

  const id = `${category}/${slug}`;
  const recipe = byId(id);

  const baseServings = recipe?.servings?.count;
  const [storedBatch, setBatch] = useSessionNumber(`cook.batch.${id}`);
  const [storedStep, setStepIndex] = useSessionNumber(`cook.step.${id}`);
  const batch = storedBatch ?? baseServings ?? 1;
  const stepIndex = storedStep ?? 0;

  const steps = useMemo(
    () => (recipe ? flattenSteps(recipe.instructions) : []),
    [recipe],
  );

  const jump = useCallback(
    (i: number) => setStepIndex(Math.max(0, Math.min(steps.length - 1, i))),
    [steps.length, setStepIndex],
  );

  const bindings = useMemo(() => {
    const next = () => jump(stepIndex + 1);
    const prev = () => jump(stepIndex - 1);
    const map: Record<string, () => void> = {
      ArrowRight: next,
      ArrowDown: next,
      ' ': next,
      ArrowLeft: prev,
      ArrowUp: prev,
      Home: () => jump(0),
      End: () => jump(steps.length - 1),
      Escape: () => navigate('/'),
    };
    for (let d = 1; d <= 9; d++) {
      map[String(d)] = () => {
        const target = steps.findIndex((s) => s.number === d);
        if (target !== -1) jump(target);
      };
    }
    return map;
  }, [stepIndex, steps, jump, navigate]);
  useKeyboard(bindings);

  // Clamp a stale sessionStorage step index after the recipe was shortened.
  useEffect(() => {
    if (steps.length > 0 && stepIndex >= steps.length) jump(steps.length - 1);
  }, [steps.length, stepIndex, jump]);

  if (!data) return <p className="muted">Loading…</p>;
  if (!recipe) {
    return (
      <p className="muted">
        Recipe “{id}” not found — it may have been renamed or deleted.
      </p>
    );
  }

  const factor = baseServings ? batch / baseServings : 1;
  const stepBatch = (delta: number) => setBatch(Math.max(0.5, batch + delta));

  return (
    <div>
      <div className="cook-header">
        <h1>
          {recipe.title}
          {recipe.todo && (
            <span className="todo-badge" title={recipe.todo}>
              untested
            </span>
          )}
        </h1>
        <div className="cook-meta">
          {recipe.perServing && (
            <MacroChips macros={recipe.perServing} prefix="Per serving" />
          )}
          {recipe.per100g?.note && <span className="muted">({recipe.per100g.note})</span>}
          {recipe.yield && <span className="muted">Yield: {recipe.yield}</span>}
          {wakeLockActive && (
            <span
              className="wake-indicator"
              title="The screen will stay on while cooking"
            >
              ☀ screen stays on
            </span>
          )}
        </div>
      </div>

      {recipe.description && <p className="muted">{recipe.description}</p>}

      {baseServings !== undefined && (
        <div className="batch-bar no-print">
          <span>
            Makes <strong>{baseServings}</strong> {recipe.servings?.suffix || 'servings'}{' '}
            — I'm making
          </span>
          <span className="stepper">
            <button
              onClick={() => stepBatch(-(baseServings >= 4 ? 1 : 0.5))}
              aria-label="fewer"
            >
              −
            </button>
            <span className="batch-count">{batch}</span>
            <button
              onClick={() => stepBatch(baseServings >= 4 ? 1 : 0.5)}
              aria-label="more"
            >
              +
            </button>
          </span>
          <button onClick={() => setBatch(baseServings)}>reset</button>
          <button onClick={() => setBatch(baseServings * 2)}>×2</button>
          <button onClick={() => setBatch(baseServings * 3)}>×3</button>
          {Math.abs(factor - 1) > 1e-9 && (
            <span className="batch-note">scaling everything ×{round2(factor)}</span>
          )}
        </div>
      )}

      <div className="cook-layout">
        <IngredientList groups={recipe.ingredients} factor={factor} />
        <StepView steps={steps} index={stepIndex} onJump={jump} />
      </div>

      {recipe.extras.length > 0 && (
        <div className="extras">
          {recipe.extras.map((extra, i) => (
            <details key={i} open={extra.kind === 'Notes'}>
              <summary>{extra.kind}</summary>
              {extra.text && <p>{extra.text}</p>}
              {extra.bullets && (
                <ul>
                  {extra.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              )}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
