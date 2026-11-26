import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useContentDb } from '@/core/db/content/open';
import { useCatalogVersion } from '@/core/sync/catalog-version';
import { isOnboardingComplete } from '@/features/onboarding/onboarding-state';

import { ensureSelectedMushafDownloaded } from './auto-download';

/**
 * Downloads the selected riwayah by itself once the app is ready and onboarding is done (ADR 0090 item 5): on mount and
 * on each return to the foreground, and when a content sync changes the catalogue (a newer version is an update, item 13).
 * Only the selected riwayah; the Wi-Fi-only setting is applied by the install.
 */
export function useAutoMushafDownload(): void {
  const { ready } = useContentDb();
  const catalogVersion = useCatalogVersion((state) => state.version);

  useEffect(() => {
    if (!ready) {
      return undefined;
    }
    const run = () => {
      if (isOnboardingComplete()) {
        void ensureSelectedMushafDownloaded();
      }
    };
    run();

    // A repeated 'active' event for the same foreground does not start a second check.
    let inForeground = AppState.currentState === 'active';
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        inForeground = false;
        return;
      }
      if (!inForeground) {
        inForeground = true;
        run();
      }
    });
    return () => subscription.remove();
    // catalogVersion only re-runs the check after a sync; the check reads the catalogue itself.
  }, [ready, catalogVersion]);
}
