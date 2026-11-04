import {
  WIDGET_SCHEMA_VERSION,
  type WidgetAzkar,
  type WidgetLabels,
  type WidgetLocale,
  type WidgetMisbaha,
  type WidgetPrayer,
  type WidgetProgress,
  type WidgetReading,
  type WidgetSnapshot,
  type WidgetColorMode,
  type WidgetWird,
} from './types';

/**
 * Everything a snapshot holds, already read from local data. There is no coordinate field: the prayer timeline is
 * computed before this call and only its instants are passed in.
 */
export type WidgetSnapshotInput = {
  now: number;
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

/** Assembles the snapshot. Pure: the same input always gives the same output (apart from `writtenAt`, which is `now`). */
export function buildWidgetSnapshot(input: WidgetSnapshotInput): WidgetSnapshot {
  return {
    azkar: input.azkar,
    colorMode: input.colorMode,
    labels: { ...input.labels },
    locale: input.locale,
    misbaha: { ...input.misbaha },
    prayer: {
      entries: input.prayer.entries.map((entry) => ({ ...entry })),
      place: input.prayer.place,
      validUntil: input.prayer.validUntil,
    },
    progress: {
      percent: input.progress.percent,
      rows: input.progress.rows.map((row) => ({ ...row })),
    },
    reading: input.reading === null ? null : { ...input.reading },
    schemaVersion: WIDGET_SCHEMA_VERSION,
    wird: input.wird === null ? null : { ...input.wird },
    writtenAt: input.now,
  };
}
