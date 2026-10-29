import { useEffect, useRef } from 'react';

import { startDownloadManager } from '../downloads/manager';

/**
 * Starts the download manager once both databases are ready: it resumes the queue and verifies the done
 * downloads. Takes the readiness from the caller, as useRestorePlayerSession does. Runs once per mount.
 */
export function useDownloadManagerStartup(ready: boolean): void {
  const started = useRef(false);

  useEffect(() => {
    if (!ready || started.current) {
      return;
    }
    started.current = true;
    startDownloadManager().catch((error: unknown) => {
      console.warn('The download manager did not start.', error);
    });
  }, [ready]);
}
