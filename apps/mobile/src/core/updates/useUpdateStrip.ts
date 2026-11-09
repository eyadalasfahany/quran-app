import { useURL } from 'expo-linking';
import * as Updates from 'expo-updates';
import { useCallback, useEffect } from 'react';
import { AppState, DevSettings } from 'react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
// Dev only: the simulator has expo-updates disabled, so the strip is previewed with a URL such as taybah-dev://?previewUpdateStrip=1.
const PREVIEW_PARAM = 'previewUpdateStrip=1';

export type UpdateStrip = { visible: boolean; update: () => void };

/**
 * The OTA update strip (EAS Update, `expo-updates`). It is visible once a newer update has downloaded and stays until the
 * user presses «تحديث», which reloads the app; there is no dismiss. The app also checks for updates when it returns to the
 * foreground, at most every six hours, and fetches any update it finds; the strip then appears.
 */
export function useUpdateStrip(): UpdateStrip {
  const { isUpdatePending, downloadedUpdate } = Updates.useUpdates();
  const url = useURL();
  // Dead in release builds: `__DEV__` is false there, so the preview never shows.
  const preview = __DEV__ && (url ?? '').includes(PREVIEW_PARAM);

  useEffect(() => {
    if (!Updates.isEnabled) {
      return;
    }
    const check = async () => {
      const last = Number(storage.getString(storageKeys.updates.lastCheckAt) ?? 0);
      if (Date.now() - last < CHECK_INTERVAL_MS) {
        return;
      }
      // Stamped before the network call, so a failing check is not retried on every foreground.
      storage.set(storageKeys.updates.lastCheckAt, String(Date.now()));
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
        }
      } catch (error) {
        console.warn('Checking for an app update failed.', error);
      }
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void check();
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const visible = preview || (Updates.isEnabled && isUpdatePending && downloadedUpdate?.updateId !== undefined);

  const update = useCallback(() => {
    if (preview) {
      DevSettings.reload();
      return;
    }
    Updates.reloadAsync().catch((error: unknown) => {
      console.warn('Reloading to the new update failed.', error);
    });
  }, [preview]);

  return { visible, update };
}
