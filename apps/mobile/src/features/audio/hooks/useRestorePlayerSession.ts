import { useEffect, useRef } from 'react';

import { restoreLastSession } from '../player';

/**
 * Restores the last listened surah and position as paused, once the content database is ready. It loads and
 * plays nothing: the mini bar shows the session, and resume() starts it. Runs once per mount.
 *
 * Takes the readiness from the caller rather than calling useContentDb() again: each call runs migrations and
 * the seed import.
 */
export function useRestorePlayerSession(contentReady: boolean): void {
  const restored = useRef(false);

  useEffect(() => {
    if (!contentReady || restored.current) {
      return;
    }
    restored.current = true;
    restoreLastSession();
  }, [contentReady]);
}
