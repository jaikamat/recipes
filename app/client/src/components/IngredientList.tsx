/**
 * Large-type ingredient panel for the cook page.
 *
 * Parsed lines are re-rendered with quantities scaled to the chosen batch;
 * unparsed lines ("Salt to taste") show verbatim with a "not scaled" mark
 * whenever a non-1 factor is active.
 */
import type { IngredientGroup } from '@shared/types';
import { scaleIngredientLine } from '@shared/scale';

export default function IngredientList({
  groups,
  factor,
}: {
  groups: IngredientGroup[];
  factor: number;
}) {
  const scaling = Math.abs(factor - 1) > 1e-9;
  return (
    <div className="ingredient-panel">
      {groups.map((group, gi) => (
        <div key={gi}>
          {group.heading && <h3>{group.heading}</h3>}
          <ul>
            {group.items.map((item, ii) => (
              <li key={ii}>
                {scaleIngredientLine(item, factor)}
                {scaling && !item.parsed && (
                  <span className="not-scaled">not scaled</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {scaling && (
        <p className="batch-note">
          Ingredient list reflects your batch size; amounts written inside the
          instructions are the original recipe's.
        </p>
      )}
    </div>
  );
}
