/**
 * Keep the screen awake while a component is mounted (cook mode).
 *
 * Uses the Screen Wake Lock API, which works on http://localhost (a secure
 * context). The lock is silently skipped on unsupported browsers. Browsers
 * release wake locks when the tab is hidden, so we re-acquire on
 * visibilitychange.
 */
import { useEffect, useState } from 'react';

export function useWakeLock(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let unmounted = false;

    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        if (unmounted) {
          void lock.release();
          return;
        }
        setActive(true);
        lock.addEventListener('release', () => setActive(false));
      } catch {
        setActive(false); // e.g. battery saver mode refuses the lock
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      unmounted = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void lock?.release();
    };
  }, []);

  return active;
}
