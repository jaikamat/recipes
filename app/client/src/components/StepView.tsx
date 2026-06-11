/**
 * The arrow-key step-through panel: one very large current step, dimmed
 * neighbors for context, phase-segmented progress dots, and big tap zones
 * for greasy fingers.
 */
import type { InstructionPhase } from '@shared/types';

/** A flattened step with its phase context. */
export interface FlatStep {
  phaseHeading?: string;
  phaseIndex: number;
  number: number;
  text: string;
}

/** Flatten phases into one navigable list (numbering already continuous). */
export function flattenSteps(phases: InstructionPhase[]): FlatStep[] {
  return phases.flatMap((phase, phaseIndex) =>
    phase.steps.map((s) => ({
      phaseHeading: phase.heading,
      phaseIndex,
      number: s.number,
      text: s.text,
    })),
  );
}

export default function StepView({
  steps,
  index,
  onJump,
}: {
  steps: FlatStep[];
  index: number;
  onJump: (index: number) => void;
}) {
  const current = steps[index];
  if (!current) return null;
  const prev = steps[index - 1];
  const next = steps[index + 1];

  return (
    <div className="step-panel">
      {current.phaseHeading && <div className="step-phase">{current.phaseHeading}</div>}
      <div className="step-context" aria-hidden>
        {prev ? `${prev.number}. ${prev.text}` : ' '}
      </div>
      <div className="step-current" aria-live="polite">
        <span className="step-number">{current.number}.</span>
        {current.text}
      </div>
      <div className="step-context" aria-hidden>
        {next ? `${next.number}. ${next.text}` : 'Done — enjoy!'}
      </div>

      <div className="step-dots">
        {steps.map((s, i) => (
          <span key={i} style={{ display: 'contents' }}>
            {i > 0 && s.phaseIndex !== steps[i - 1]!.phaseIndex && (
              <span className="step-dot-gap" />
            )}
            <button
              className={`step-dot ${i === index ? 'current' : i < index ? 'done' : ''}`}
              onClick={() => onJump(i)}
              title={`Step ${s.number}`}
              aria-label={`Go to step ${s.number}`}
            />
          </span>
        ))}
      </div>

      <div className="tap-zones no-print">
        <button onClick={() => onJump(index - 1)} disabled={index === 0}>
          ← Previous
        </button>
        <button
          className="primary"
          onClick={() => onJump(index + 1)}
          disabled={index >= steps.length - 1}
        >
          Next →
        </button>
      </div>
      <div className="keyboard-hint">
        ← → arrow keys or space to step · 1–9 jump · Esc back to recipes
      </div>
    </div>
  );
}
