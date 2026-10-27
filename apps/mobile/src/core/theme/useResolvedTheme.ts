import type { ThemeName } from '@quran/design-tokens';
import { useCallback, useSyncExternalStore } from 'react';
import { useColorScheme } from 'react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { parseAppearance, resolveThemeName } from './appearance';

function useStoredValue<T>(key: string, read: (key: string) => T): T {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const listener = storage.addOnValueChangedListener((changedKey) => {
        if (changedKey === key) {
          onStoreChange();
        }
      });
      return () => {
        listener.remove();
      };
    },
    [key],
  );
  const getSnapshot = useCallback(() => read(key), [key, read]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function readStoredString(key: string): string | undefined {
  return storage.getString(key);
}

function readStoredBoolean(key: string): boolean | undefined {
  return storage.getBoolean(key);
}

// `afterMaghrib` is the prayer-time clock. The root layout leaves it false until that exists.
export function useResolvedTheme(afterMaghrib = false): ThemeName {
  const colorScheme = useColorScheme();
  const storedAppearance = useStoredValue(storageKeys.appearance, readStoredString);
  const darkAfterMaghrib = useStoredValue(storageKeys.darkAfterMaghrib, readStoredBoolean);

  return resolveThemeName({
    appearance: parseAppearance(storedAppearance),
    colorScheme,
    darkAfterMaghrib: darkAfterMaghrib ?? false,
    afterMaghrib,
  });
}
