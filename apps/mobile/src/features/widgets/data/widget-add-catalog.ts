import { WIDGET_PROVIDERS, type WidgetProviderName } from '../android/names';

import type { WidgetAddDestination } from './add-prefs';

export type WidgetAddCatalogId = keyof typeof WIDGET_PROVIDERS;

export type WidgetPreviewVariant =
  | 'nextPrayerSmall'
  | 'nextPrayerWide'
  | 'progressMedium'
  | 'continueReading'
  | 'misbaha'
  | 'azkar';

/** iOS WidgetKit kind for home or lock placement (ADR 0035 §2, ADR 0054). */
export type WidgetIosKind =
  | 'NextPrayerSmall'
  | 'NextPrayerMedium'
  | 'ProgressMedium'
  | 'ContinueReading'
  | 'Misbaha'
  | 'AzkarStatus'
  | 'LockScreenPrayer'
  | 'LockScreenProgress'
  | 'LockScreenPrayerCircular';

export type WidgetAddCatalogEntry = {
  id: WidgetAddCatalogId;
  provider: WidgetProviderName;
  frameId: string;
  previewVariant: WidgetPreviewVariant;
  destinations: readonly WidgetAddDestination[];
  iosKind: { home: WidgetIosKind; lock?: WidgetIosKind };
};

/** Add-flow metadata for Settings and Discover (plan step 13, ADR 0054). */
export const WIDGET_ADD_CATALOG: readonly WidgetAddCatalogEntry[] = [
  {
    destinations: ['home', 'lock'],
    frameId: 'WidgetNextPrayerSmall',
    id: 'nextPrayer',
    iosKind: { home: 'NextPrayerSmall', lock: 'LockScreenPrayer' },
    previewVariant: 'nextPrayerSmall',
    provider: WIDGET_PROVIDERS.nextPrayer,
  },
  {
    destinations: ['home'],
    frameId: 'WidgetNextPrayerSmall',
    id: 'nextPrayerWide',
    iosKind: { home: 'NextPrayerMedium' },
    previewVariant: 'nextPrayerWide',
    provider: WIDGET_PROVIDERS.nextPrayerWide,
  },
  {
    destinations: ['home', 'lock'],
    frameId: 'WidgetProgressMedium',
    id: 'progress',
    iosKind: { home: 'ProgressMedium', lock: 'LockScreenProgress' },
    previewVariant: 'progressMedium',
    provider: WIDGET_PROVIDERS.progress,
  },
  {
    destinations: ['home'],
    frameId: 'WidgetContinueReading',
    id: 'continueReading',
    iosKind: { home: 'ContinueReading' },
    previewVariant: 'continueReading',
    provider: WIDGET_PROVIDERS.continueReading,
  },
  {
    destinations: ['home'],
    frameId: 'WidgetContinueReading',
    id: 'misbaha',
    iosKind: { home: 'Misbaha' },
    previewVariant: 'misbaha',
    provider: WIDGET_PROVIDERS.misbaha,
  },
  {
    destinations: ['home'],
    frameId: 'WidgetContinueReading',
    id: 'azkar',
    iosKind: { home: 'AzkarStatus' },
    previewVariant: 'azkar',
    provider: WIDGET_PROVIDERS.azkar,
  },
];

export function widgetAddCatalogEntry(id: WidgetAddCatalogId): WidgetAddCatalogEntry {
  const entry = WIDGET_ADD_CATALOG.find((row) => row.id === id);
  if (entry === undefined) {
    throw new Error(`Unknown widget catalog id: ${id}`);
  }
  return entry;
}
