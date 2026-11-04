/**
 * The widget snapshot (ADR 0035 §4): the one small JSON every home-screen widget and the watch read. It is built from
 * local data only, and it never holds Quran text, dhikr text, a coordinate or a secret. Widgets read a surah name, an
 * ayah number and a page number; they never render an ayah.
 *
 * Schema version 1. Readers ignore fields they do not know and show the open-the-app state for another major version.
 */
export const WIDGET_SCHEMA_VERSION = 1 as const;

/** The writers that store the snapshot (see `publish.ts`). Each target reads the same JSON. */
export const WIDGET_WRITER_IDS = ['mmkv', 'android', 'ios-app-group', 'wear-os'] as const;

export type WidgetWriterId = (typeof WIDGET_WRITER_IDS)[number];

export type WidgetLocale = 'ar' | 'en';

export type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

/** One prayer instant. Sunrise is not a prayer and is never written. */
export type PrayerEntry = { key: PrayerKey; at: number };

export type WidgetPrayer = {
  /** A display name for the place, or null (automatic location has no name). */
  place: string | null;
  /** Every prayer instant from today for the next days, in time order. Empty without a location. */
  entries: PrayerEntry[];
  /** The last entry's instant (ms), or null when there are no entries. Past this, the surfaces show the stale state. */
  validUntil: number | null;
};

export type WidgetProgressRow = {
  key: string;
  label: string;
  value: string;
  done: boolean;
};

export type WidgetProgress = {
  /** The ring: the mean of the chosen goals, 0 to 100. */
  percent: number;
  /** One row per goal the user chose, worded in the snapshot's locale. */
  rows: WidgetProgressRow[];
};

/** Where the reader stopped. Surah name, ayah number and page only: never the ayah's text. */
export type WidgetReading = {
  verseKey: string;
  surah: string;
  ayah: number;
  page: number;
};

/** Today's Khatma wird, present only with an active plan. */
export type WidgetWird = { done: number; target: number };

export type WidgetMisbaha = {
  /** The saved counter's count (the misbaha's own, not today's total). */
  count: number;
  /** The target, or null for «بلا حد». */
  target: number | null;
  /** Taps counted today, from every counting surface. */
  todayTotal: number;
  /** iOS widget «+» monotonic counter (ADR 0035 §3.5). Android omits this field. */
  widgetTapsTotal?: number;
};

export type WidgetAzkarSession = {
  id: string;
  title: string;
  /** Units done in the current period. */
  done: number;
  total: number;
  complete: boolean;
};

/** Null until Azkar content is installed (ADR 0042: no content, no Azkar surface). */
export type WidgetAzkar = { sessions: WidgetAzkarSession[] } | null;

/** The labels every widget shows, resolved in the snapshot's locale so the native code holds no string catalogue. */
export const WIDGET_LABEL_KEYS = [
  'nextPrayer',
  'noLocation',
  'openApp',
  'stale',
  'progressTitle',
  'progressEmpty',
  'continueReading',
  'resume',
  'ayahLabel',
  'pageLabel',
  'wirdTitle',
  'wirdUnit',
  'of',
  'misbaha',
  'misbahaNoTarget',
  'countAction',
  'azkarTitle',
  'azkarEmpty',
  'complete',
  'prayerFajr',
  'prayerDhuhr',
  'prayerAsr',
  'prayerMaghrib',
  'prayerIsha',
  /** iOS home/lock countdown caption (Android has no countdown). */
  'remaining',
] as const;

export type WidgetLabelKey = (typeof WIDGET_LABEL_KEYS)[number];

export type WidgetLabels = Record<WidgetLabelKey, string>;

/** Resolved app theme for widget surfaces: light or dark only; sepia maps to light (ADR 0054). */
export type WidgetColorMode = 'light' | 'dark';

export type WidgetSnapshot = {
  schemaVersion: typeof WIDGET_SCHEMA_VERSION;
  /** When the snapshot was built (ms since the epoch). */
  writtenAt: number;
  /** App-resolved palette at sync time; native code falls back to system when absent on old snapshots. */
  colorMode: WidgetColorMode;
  locale: WidgetLocale;
  labels: WidgetLabels;
  prayer: WidgetPrayer;
  progress: WidgetProgress;
  reading: WidgetReading | null;
  wird: WidgetWird | null;
  misbaha: WidgetMisbaha;
  azkar: WidgetAzkar;
};
