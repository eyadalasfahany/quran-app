import { WIDGET_PROVIDERS, type WidgetProviderName } from '../android/names';

/** Help-screen rows: i18n key under `widgetsHelp.items.*` and the Android pin target. */
export const WIDGETS_HELP_CATALOG: readonly {
  readonly id: keyof typeof WIDGET_PROVIDERS;
  readonly provider: WidgetProviderName;
}[] = [
  { id: 'nextPrayer', provider: WIDGET_PROVIDERS.nextPrayer },
  { id: 'nextPrayerWide', provider: WIDGET_PROVIDERS.nextPrayerWide },
  { id: 'progress', provider: WIDGET_PROVIDERS.progress },
  { id: 'continueReading', provider: WIDGET_PROVIDERS.continueReading },
  { id: 'misbaha', provider: WIDGET_PROVIDERS.misbaha },
  { id: 'azkar', provider: WIDGET_PROVIDERS.azkar },
];
