import type { ThemeName } from '@quran/design-tokens';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { notifyAppearanceChanged } from './appearance-change';

export const appearances = ['automatic', 'light', 'sepia', 'dark'] as const;

export type Appearance = (typeof appearances)[number];

export type SystemColorScheme = 'light' | 'dark' | null | undefined;

function isAppearance(value: string | undefined): value is Appearance {
  return value === 'automatic' || value === 'light' || value === 'sepia' || value === 'dark';
}

export function parseAppearance(value: string | undefined): Appearance {
  return isAppearance(value) ? value : 'automatic';
}

// Automatic follows the device. Light, sepia and dark are reader overrides.
// Dark after Maghrib is opt-in: it forces dark only when both the preference and the clock say so.
// `afterMaghrib` stays false until prayer times exist; Automatic never implies it.
export function resolveThemeName({
  appearance,
  colorScheme,
  darkAfterMaghrib,
  afterMaghrib,
}: {
  appearance: Appearance;
  colorScheme: SystemColorScheme;
  darkAfterMaghrib: boolean;
  afterMaghrib: boolean;
}): ThemeName {
  if (darkAfterMaghrib && afterMaghrib) {
    return 'dark';
  }
  if (appearance === 'automatic') {
    return colorScheme === 'dark' ? 'dark' : 'light';
  }
  return appearance;
}

export function readAppearance(): Appearance {
  return parseAppearance(storage.getString(storageKeys.appearance));
}

export function saveAppearance(appearance: Appearance): void {
  storage.set(storageKeys.appearance, appearance);
  notifyAppearanceChanged();
}

export function readDarkAfterMaghrib(): boolean {
  return storage.getBoolean(storageKeys.darkAfterMaghrib) ?? false;
}

export function saveDarkAfterMaghrib(enabled: boolean): void {
  storage.set(storageKeys.darkAfterMaghrib, enabled);
  notifyAppearanceChanged();
}
