import { useEffect } from 'react';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import { useOnline } from '@/core/network/useOnline';

import { hasHadithContent, uninstalledExplanationResourceIds } from '../data';
import { useHadithDownloads } from '../downloads';

/**
 * Installs the hadith explanations in the background once a collection is installed and the device is online (ADR 0078).
 * It starts each one through the collection download path, so Wi-Fi only is honoured. Nothing is shown and a failure is
 * not reported: the next mount (or the next time the device comes online) tries again.
 */
export function useEnsureHadithExplanations(): void {
  const { ready } = useContentDb();
  const online = useOnline();

  useEffect(() => {
    if (!ready || !online) {
      return;
    }
    let missing: number[];
    try {
      const { executor } = openContentDb();
      if (!hasHadithContent(executor)) {
        return;
      }
      missing = uninstalledExplanationResourceIds(executor);
    } catch {
      return;
    }
    for (const resourceId of missing) {
      void useHadithDownloads.getState().start(resourceId);
    }
  }, [ready, online]);
}
