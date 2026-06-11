/**
 * Shopping list: pick recipes (with batch multipliers), get one aggregated
 * list, check off what the kitchen already has, copy or print the rest.
 */
import { useMemo, useState } from 'react';
import { aggregate } from '@shared/aggregate';
import { useRecipes } from '../hooks/useRecipes';
import { useShopping } from '../state/shoppingStore';
import RecipePicker from '../components/RecipePicker';
import AggregatedList from '../components/AggregatedList';

export default function ShoppingPage() {
  const { byId } = useRecipes();
  const { state, setMultiplier, toggleChecked, clear } = useShopping();
  const [copied, setCopied] = useState(false);

  const items = useMemo(() => {
    const selections = Object.entries(state.selections)
      .map(([id, multiplier]) => ({ recipe: byId(id), multiplier }))
      .filter((s): s is { recipe: NonNullable<typeof s.recipe>; multiplier: number } =>
        Boolean(s.recipe),
      );
    return aggregate(selections);
  }, [state.selections, byId]);

  const selectedCount = Object.keys(state.selections).length;

  const copyRemaining = async () => {
    const lines = items
      .filter((i) => !state.checked.includes(i.key))
      .map((i) => (i.quantityText ? `${i.quantityText} ${i.label}` : i.label));
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <h1>Shopping List</h1>
      <div className="shopping-layout">
        <div>
          <p className="muted no-print">
            Select recipes to combine. The multiplier is in batches — ×2 means double that
            recipe.
          </p>
          <RecipePicker selections={state.selections} onMultiplier={setMultiplier} />
        </div>
        <div>
          {selectedCount === 0 ? (
            <p className="muted">No recipes selected yet.</p>
          ) : (
            <>
              <div className="shopping-actions no-print">
                <button className="primary" onClick={copyRemaining}>
                  {copied ? 'Copied ✓' : 'Copy remaining'}
                </button>
                <button onClick={() => window.print()}>Print</button>
                <button onClick={clear}>Clear list</button>
              </div>
              <AggregatedList
                items={items}
                checked={state.checked}
                onToggle={toggleChecked}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
