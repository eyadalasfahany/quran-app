import type { WidgetLabels, WidgetSnapshot } from './types';

/**
 * Test-only labels: the real strings come from ar.json / en.json. These placeholders keep the fixtures free of any
 * religious text and make a mistaken label visible in a failing assertion.
 */
export const TEST_LABELS: WidgetLabels = {
  azkarEmpty: 'LABEL azkarEmpty',
  azkarTitle: 'LABEL azkarTitle',
  complete: 'LABEL complete',
  continueReading: 'LABEL continueReading',
  countAction: 'LABEL countAction',
  misbaha: 'LABEL misbaha',
  misbahaNoTarget: 'LABEL misbahaNoTarget',
  nextPrayer: 'LABEL nextPrayer',
  noLocation: 'LABEL noLocation',
  of: 'LABEL of',
  openApp: 'LABEL openApp',
  prayerAsr: 'PRAYER asr',
  prayerDhuhr: 'PRAYER dhuhr',
  prayerFajr: 'PRAYER fajr',
  prayerIsha: 'PRAYER isha',
  prayerMaghrib: 'PRAYER maghrib',
  progressEmpty: 'LABEL progressEmpty',
  progressTitle: 'LABEL progressTitle',
  resume: 'LABEL resume',
  stale: 'LABEL stale',
  wirdTitle: 'LABEL wirdTitle',
  wirdUnit: 'LABEL wirdUnit',
  ayahLabel: 'LABEL ayah',
  pageLabel: 'LABEL page',
};

/** A snapshot with every block filled, for layout tests. Values are placeholders; no Quran or dhikr text. */
export function fullSnapshot(overrides: Partial<WidgetSnapshot> = {}): WidgetSnapshot {
  return {
    azkar: {
      sessions: [
        { complete: true, done: 10, id: 'morning', title: 'SESSION one', total: 10 },
        { complete: false, done: 6, id: 'evening', title: 'SESSION two', total: 24 },
      ],
    },
    labels: TEST_LABELS,
    locale: 'en',
    misbaha: { count: 33, target: 100, todayTotal: 150 },
    prayer: {
      entries: [
        { at: new Date(2026, 10, 2, 3, 12).getTime(), key: 'fajr' },
        { at: new Date(2026, 10, 2, 9, 3).getTime(), key: 'dhuhr' },
        { at: new Date(2026, 10, 2, 13, 47).getTime(), key: 'asr' },
        { at: new Date(2026, 10, 2, 16, 19).getTime(), key: 'maghrib' },
        { at: new Date(2026, 10, 2, 17, 42).getTime(), key: 'isha' },
      ],
      place: 'PLACE',
      validUntil: new Date(2026, 10, 4, 17, 42).getTime(),
    },
    progress: {
      percent: 60,
      rows: [
        { done: false, key: 'wird', label: 'ROW wird', value: 'VALUE 4 of 10', },
        { done: true, key: 'misbaha', label: 'ROW misbaha', value: 'VALUE done' },
      ],
    },
    reading: { ayah: 255, page: 42, surah: 'SURAH placeholder', verseKey: '2:255' },
    schemaVersion: 1,
    wird: { done: 4, target: 10 },
    writtenAt: new Date(2026, 10, 2, 0, 0).getTime(),
    ...overrides,
  };
}
