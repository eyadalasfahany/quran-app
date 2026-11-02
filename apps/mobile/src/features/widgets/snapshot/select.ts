import { WIDGET_SCHEMA_VERSION, type PrayerKey, type WidgetPrayer, type WidgetSnapshot } from './types';

/**
 * What the prayer surfaces show at `nowMs`: the next instant, a prompt for a location, or the stale state when every
 * stored instant has passed (ADR 0035 §1.8: a stale surface shows no time it did not receive).
 */
export type PrayerState =
  | { kind: 'noLocation' }
  | { kind: 'stale' }
  | { kind: 'next'; key: PrayerKey; at: number };

export function prayerStateAt(prayer: WidgetPrayer, nowMs: number): PrayerState {
  if (prayer.entries.length === 0) {
    return { kind: 'noLocation' };
  }
  const next = prayer.entries.find((entry) => entry.at > nowMs);
  return next === undefined ? { kind: 'stale' } : { at: next.at, key: next.key, kind: 'next' };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Reads the stored snapshot. Null when it is missing, is not JSON, is another major version, or lacks a block the
 * widgets draw. A null snapshot shows the open-the-app state; a widget never guesses.
 */
export function parseWidgetSnapshot(raw: string | null | undefined): WidgetSnapshot | null {
  if (raw === undefined || raw === null) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.schemaVersion !== WIDGET_SCHEMA_VERSION) {
    return null;
  }
  const { labels, locale, misbaha, prayer, progress, writtenAt } = parsed;
  if (
    (locale !== 'ar' && locale !== 'en') ||
    typeof writtenAt !== 'number' ||
    !isRecord(labels) ||
    !isRecord(prayer) ||
    !Array.isArray(prayer.entries) ||
    !isRecord(progress) ||
    !Array.isArray(progress.rows) ||
    !isRecord(misbaha)
  ) {
    return null;
  }
  return parsed as unknown as WidgetSnapshot;
}
