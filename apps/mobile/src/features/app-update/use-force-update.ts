import * as Application from 'expo-application';
import { router, useSegments } from 'expo-router';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { getBootstrap } from '@/core/api';

import { isUpdateRequired } from './version';

/** The first route segment of the five tabs (`app/(main)/`). */
const MAIN_GROUP = '(main)';
/** Onboarding is a pushed stack with no sheets, so the pop-up can show over it. */
const ONBOARDING_GROUP = '(onboarding)';

/** A store update when this binary is below the live store version, or an OTA update that has downloaded (ADR 0060, 0094). */
export type ForceUpdate = { kind: 'store'; storeUrl: string } | { kind: 'ota' };

export function useForceUpdate(): ForceUpdate | null {
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const { isUpdatePending } = Updates.useUpdates();
  const segments = useSegments();
  const first = segments[0] as string | undefined;

  useEffect(() => {
    async function checkStore(): Promise<void> {
      try {
        const platform = Platform.OS === 'android' ? 'android' : 'ios';
        const bootstrap = await getBootstrap();
        // The marketing version of the installed binary, not the EAS Update manifest.
        const required = isUpdateRequired(Application.nativeApplicationVersion, bootstrap.min_app_version[platform]);
        setStoreUrl(required ? bootstrap.store_url[platform] : null);
      } catch {
        // Offline is normal: fail open, the next launch or foreground tries again.
      }
    }
    async function checkOta(): Promise<void> {
      if (!Updates.isEnabled) {
        return;
      }
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
        }
      } catch {
        // Offline is normal.
      }
    }

    // At launch expo-updates already checks for an OTA (`checkAutomatically: 'ON_LOAD'`).
    void checkStore();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void checkStore();
        void checkOta();
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  // The store update wins: an OTA cannot fix a binary that is too old.
  const update: ForceUpdate | null =
    storeUrl !== null ? { kind: 'store', storeUrl } : Updates.isEnabled && isUpdatePending ? { kind: 'ota' } : null;
  // iOS can't present a root Modal over a presented sheet (it fails silently), and a pushed root screen can't be told
  // apart from one. So on iOS the pop-up waits until the tabs are showing, and the hook closes the screens above them.
  const covered = Platform.OS === 'ios' && first !== MAIN_GROUP && first !== ONBOARDING_GROUP;
  const needed = update !== null;

  useEffect(() => {
    // `first` is undefined while the index route redirects: nothing to close yet, and the next segments render retries.
    if (needed && covered && first !== undefined && router.canDismiss()) {
      router.dismissAll();
    }
  }, [needed, covered, first]);

  return covered ? null : update;
}
