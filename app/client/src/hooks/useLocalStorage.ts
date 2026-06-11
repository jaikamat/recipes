/**
 * localStorage-backed React state.
 *
 * - Keys are versioned by convention ("recipes.shopping.v1") so future
 *   format changes can migrate or start clean.
 * - An optional `sanitize` runs on load AND on every set; stores use it to
 *   prune recipe ids that no longer exist (renamed/deleted markdown files),
 *   so stale state self-heals instead of crashing pages.
 */
import { useCallback, useState } from 'react';

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  sanitize?: (value: T) => T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored === null) return defaultValue;
      const parsed = JSON.parse(stored) as T;
      return sanitize ? sanitize(parsed) : parsed;
    } catch {
      // Corrupt JSON or storage unavailable — fall back to a clean slate.
      return defaultValue;
    }
  });

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const raw = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        const clean = sanitize ? sanitize(raw) : raw;
        try {
          window.localStorage.setItem(key, JSON.stringify(clean));
        } catch {
          // Storage full/unavailable: state still works for this session.
        }
        return clean;
      });
    },
    [key, sanitize],
  );

  return [value, set];
}
