/**
 * Global keyboard shortcuts for a page.
 *
 * Bindings map a KeyboardEvent.key to a handler. Events are ignored when
 * focus is in an input/textarea/select or a modifier is held, so shortcuts
 * never fight with typing in the search box.
 */
import { useEffect } from 'react';

export type KeyBindings = Record<string, (event: KeyboardEvent) => void>;

export function useKeyboard(bindings: KeyBindings): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const handler = bindings[event.key];
      if (handler) {
        event.preventDefault();
        handler(event);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bindings]);
}
