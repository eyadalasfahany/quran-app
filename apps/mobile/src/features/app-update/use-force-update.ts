import * as Application from 'expo-application';
import { useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { getBootstrap } from '@/core/api';

import { isUpdateRequired } from './version';

/** The first route segment of the five tabs (`app/(main)/`). Any other first segment is a screen above the tabs. */
const MAIN_GROUP = '(main)';

/**
 * The store link while this install is below the API's minimum version, otherwise null (ADR 0060).
 *
 * The check runs once after launch and again on each return to the foreground. It never blocks launch: the answer
 * arrives in the background and the app keeps working until then.
 */
export function useForceUpdate(): string | null {
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const segments = useSegments();
  const onTabs = useRef(true);

  useEffect(() => {
    onTabs.current = (segments[0] as string | undefined) === MAIN_GROUP;
  }, [segments]);

  useEffect(() => {
    async function check(): Promise<void> {
      try {
        const platform = Platform.OS === 'android' ? 'android' : 'ios';
        const bootstrap = await getBootstrap();
        // The marketing version (app.config.ts `version`), read from the installed binary, not the EAS Update manifest.
        if (!isUpdateRequired(Application.nativeApplicationVersion, bootstrap.min_app_version[platform])) {
          setStoreUrl(null);
          return;
        }
        // iOS can't present a root Modal while a sheet is presented (React Native presents from the root view controller,
        // and it fails silently). Hold back on any screen above the tabs and try again on the next launch or foreground.
        // `router.canDismiss()` can't be used here: the root layout's anchor makes it true on every tab.
        if (Platform.OS === 'ios' && !onTabs.current) {
          return;
        }
        setStoreUrl(bootstrap.store_url[platform]);
      } catch {
        // Offline is normal: the app stays usable and the next launch or foreground tries again.
      }
    }

    void check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void check();
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  return storeUrl;
}
