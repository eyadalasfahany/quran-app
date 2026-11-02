import { requireNativeModule } from 'expo-modules-core';

type AppGroupStoreNative = {
  write(suiteName: string, json: string): Promise<void>;
  reloadWidgets(): Promise<void>;
  isAvailable(suiteName: string): boolean;
};

let cached: AppGroupStoreNative | null | undefined;

/** The native module when the iOS App Group store is linked; null on other platforms or in tests. */
export function getAppGroupStoreModule(): AppGroupStoreNative | null {
  if (cached !== undefined) {
    return cached;
  }
  try {
    cached = requireNativeModule<AppGroupStoreNative>('AppGroupStore');
  } catch {
    cached = null;
  }
  return cached;
}

/** Resets the module cache (tests only). */
export function resetAppGroupStoreModuleForTests(): void {
  cached = undefined;
}

export const WIDGET_SNAPSHOT_USER_DEFAULTS_KEY = 'taybah.snapshot';
