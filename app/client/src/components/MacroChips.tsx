/**
 * Compact per-serving macro display: calories, protein, fat, carbs.
 */
import type { Macros } from '@shared/types';

export default function MacroChips({
  macros,
  prefix,
}: {
  macros: Macros;
  /** Optional label, e.g. "Per serving". */
  prefix?: string;
}) {
  return (
    <span className="macro-chips">
      {prefix && <span className="macro-prefix">{prefix}</span>}
      <span className="chip chip-cal">{Math.round(macros.calories)} cal</span>
      <span className="chip chip-protein">{macros.protein}g P</span>
      <span className="chip chip-fat">{macros.fat}g F</span>
      <span className="chip chip-carbs">{macros.carbs}g C</span>
    </span>
  );
}
