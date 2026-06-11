/**
 * The aggregated shopping list, in three sections:
 *   To buy        — merged quantities, unchecked
 *   Check manually — "to taste"/garnish lines the parser can't sum
 *   Have it       — checked-off items, struck through at the bottom
 */
import type { AggregatedItem } from '@shared/aggregate';

function Row({
  item,
  checked,
  onToggle,
}: {
  item: AggregatedItem;
  checked: boolean;
  onToggle: () => void;
}) {
  const sources = item.sources
    .map((s) => (s.multiplier !== 1 ? `${s.title} ×${s.multiplier}` : s.title))
    .join(', ');
  return (
    <li className={checked ? 'have-it' : ''}>
      <input type="checkbox" checked={checked} onChange={onToggle} />
      {item.quantityText && <span className="agg-qty">{item.quantityText}</span>}
      <span className="agg-name">{item.label}</span>
      <span className="agg-sources" title={sources}>
        {sources}
      </span>
    </li>
  );
}

export default function AggregatedList({
  items,
  checked,
  onToggle,
}: {
  items: AggregatedItem[];
  checked: string[];
  onToggle: (key: string) => void;
}) {
  const isChecked = (i: AggregatedItem) => checked.includes(i.key);
  const toBuy = items.filter((i) => !i.manual && !isChecked(i));
  const manual = items.filter((i) => i.manual && !isChecked(i));
  const haveIt = items.filter(isChecked);

  return (
    <div>
      <section className="agg-section">
        <h2>To buy ({toBuy.length})</h2>
        <ul className="agg-list">
          {toBuy.map((i) => (
            <Row key={i.key} item={i} checked={false} onToggle={() => onToggle(i.key)} />
          ))}
        </ul>
        {toBuy.length === 0 && <p className="muted">Nothing left to buy.</p>}
      </section>

      {manual.length > 0 && (
        <section className="agg-section">
          <h2>Check manually</h2>
          <p className="muted">
            These lines have no fixed quantity — check your pantry judgment-style.
          </p>
          <ul className="agg-list">
            {manual.map((i) => (
              <Row
                key={i.key}
                item={i}
                checked={false}
                onToggle={() => onToggle(i.key)}
              />
            ))}
          </ul>
        </section>
      )}

      {haveIt.length > 0 && (
        <section className="agg-section no-print">
          <h2>Have it ({haveIt.length})</h2>
          <ul className="agg-list">
            {haveIt.map((i) => (
              <Row key={i.key} item={i} checked onToggle={() => onToggle(i.key)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
