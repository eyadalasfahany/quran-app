import { Appearance } from 'react-native';
import type { ThemeName } from '@quran/design-tokens';

import {
  readAppearance,
  readDarkAfterMaghrib,
  resolveThemeName,
  type SystemColorScheme,
} from '@/core/theme/appearance';

import type { PrayerEntry, WidgetColorMode } from './types';

export type { WidgetColorMode };

/** Widgets use light or dark only; sepia maps to light (ADR 0054). */
export function themeNameToWidgetColorMode(themeName: ThemeName): WidgetColorMode {
  return themeName === 'dark' ? 'dark' : 'light';
}

/** True when `nowMs` is on or after today's Maghrib instant in the prayer timeline. */
export function isAfterMaghrib(entries: PrayerEntry[], nowMs: number): boolean {
  const now = new Date(nowMs);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayEnd = dayStart + 86_400_000;
  const maghrib = entries.find(
    (entry) => entry.key === 'maghrib' && entry.at >= dayStart && entry.at < dayEnd,
  );
  return maghrib !== undefined && nowMs >= maghrib.at;
}

/**
 * Resolved widget palette mode at sync time from MMKV appearance and optional system scheme (ADR 0054).
 * Missing snapshot `colorMode` on native surfaces falls back to system; the builder always sets this field.
 */
export function resolveWidgetColorMode(input: {
  appearance?: ReturnType<typeof readAppearance>;
  colorScheme?: SystemColorScheme;
  darkAfterMaghrib?: boolean;
  afterMaghrib?: boolean;
} = {}): WidgetColorMode {
  const themeName = resolveThemeName({
    appearance: input.appearance ?? readAppearance(),
    colorScheme: input.colorScheme ?? Appearance.getColorScheme(),
    darkAfterMaghrib: input.darkAfterMaghrib ?? readDarkAfterMaghrib(),
    afterMaghrib: input.afterMaghrib ?? false,
  });
  return themeNameToWidgetColorMode(themeName);
}
