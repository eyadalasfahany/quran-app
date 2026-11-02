/**
 * The Android widget providers (ADR 0035 §2, AndroidWidgets frame). The names are the library's `widgetName` and the
 * keys of the plugin list in `app.config.ts`, which must match these strings.
 */
export const WIDGET_PROVIDERS = {
  /** 2×2: the next prayer, its time and its place. */
  nextPrayer: 'NextPrayer',
  /** 4×2: the next prayer with the day's five times. */
  nextPrayerWide: 'NextPrayerWide',
  /** 4×2: today's progress ring and the chosen goals. */
  progress: 'Progress',
  /** 4×2: where the reader stopped, and the wird line when a Khatma plan is active. */
  continueReading: 'ContinueReading',
  /** 2×2: the misbaha count and target, with the «+» action. */
  misbaha: 'Misbaha',
  /** 4×2: the five Azkar sessions, done or not. Shows the open-the-app state without Azkar content. */
  azkar: 'Azkar',
} as const;

export type WidgetProviderName = (typeof WIDGET_PROVIDERS)[keyof typeof WIDGET_PROVIDERS];

export const WIDGET_PROVIDER_NAMES: readonly WidgetProviderName[] = Object.values(WIDGET_PROVIDERS);

/** The click action the «+» sends to the headless task (not a native action, so the app does not open). */
export const MISBAHA_TAP_ACTION = 'taybah.misbaha.tap';

/** The platform's floor for periodic widget updates (30 minutes). */
export const WIDGET_UPDATE_PERIOD_MS = 30 * 60 * 1000;
