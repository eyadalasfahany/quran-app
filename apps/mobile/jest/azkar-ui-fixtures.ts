import { act, fireEvent, screen } from '@testing-library/react-native';

import type { AzkarEntry, AzkarEntryDetail, AzkarItemDetail, AzkarNote, AzkarSegment, AzkarVariation } from '@/features/azkar/data/model';
import type { ReaderUnit } from '@/features/azkar/data/reader-units';

/**
 * Builders for Azkar UI tests. Every text is a marked placeholder («نص تجريبي ... ليس ذكرًا», `FIXTURE ...`),
 * never a dhikr. Quran segments point at surah 1 verses, which the tests resolve through a stub.
 */

export function textSegment(text: string | null, position = 1, itemId = 1): AzkarSegment {
  return {
    resourceId: -1,
    itemId,
    position,
    kind: 'text',
    textAr: text,
    quranSurah: null,
    quranVerseFrom: null,
    quranVerseTo: null,
    textSearch: null,
  };
}

export function quranSegment(from: number, to: number | null = null, position = 2, itemId = 1): AzkarSegment {
  return {
    resourceId: -1,
    itemId,
    position,
    kind: 'quran',
    textAr: null,
    quranSurah: 1,
    quranVerseFrom: from,
    quranVerseTo: to,
    textSearch: null,
  };
}

export function makeItem(overrides: Partial<AzkarItemDetail> = {}): AzkarItemDetail {
  const id = overrides.id ?? 1;
  return {
    resourceId: -1,
    id,
    entryId: 1,
    itemKey: `fixture:item-${id}`,
    variationKey: 'default',
    position: id,
    kind: 'recitation',
    requiredCount: 3,
    speaker: null,
    sourceDuaId: null,
    textEn: null,
    transliteration: null,
    repeatGroup: null,
    repeatTimes: null,
    segments: [textSegment(`نص تجريبي ${id} — ليس ذكرًا`, 1, id)],
    ...overrides,
  };
}

export function makeUnit(overrides: Partial<ReaderUnit> = {}): ReaderUnit {
  return {
    unitKey: 'fixture:item-1',
    entryKey: 'fixture:entry-001',
    kind: 'recitation',
    requiredCount: 3,
    variations: [],
    activeVariation: 'default',
    preface: [],
    body: [makeItem()],
    afterword: [],
    ...overrides,
  };
}

export function makeEntry(overrides: Partial<AzkarEntry> = {}): AzkarEntry {
  return {
    resourceId: -1,
    id: 1,
    entryKey: 'fixture:entry-001',
    chapterId: 1,
    position: 1,
    sourceReference: '20',
    entryType: 'invocation',
    occasion: 'morning',
    timingType: 'time_period',
    timingPrayer: null,
    reviewStatus: 'sourced',
    sourceVersion: 'taybah-dev-fixture',
    importedAt: 0,
    ...overrides,
  };
}

export function makeNote(kind: AzkarNote['kind'], overrides: Partial<AzkarNote> = {}): AzkarNote {
  return {
    resourceId: -1,
    id: 1,
    entryId: 1,
    itemId: null,
    kind,
    textAr: `[ملاحظة تجريبية ${kind} — ليست ذكرًا]`,
    textEn: `FIXTURE note ${kind} — not a dhikr`,
    grader: null,
    sourceType: 'fixture',
    sourceName: '[مصدر تجريبي]',
    sourceReference: '[مرجع تجريبي]',
    sourceUrl: null,
    reviewStatus: 'sourced',
    ...overrides,
  };
}

export function emptyNotes(): AzkarEntryDetail['notes'] {
  return { explanation: [], context: [], virtue: [], reference: [], grade: [] };
}

export function makeDetail(overrides: Partial<AzkarEntryDetail> = {}): AzkarEntryDetail {
  const variations: AzkarVariation[] = overrides.variations ?? [];
  return {
    entry: makeEntry(),
    chapter: null,
    variations,
    activeVariation: 'default',
    items: [makeItem()],
    notes: emptyNotes(),
    recordings: [],
    ...overrides,
  };
}

/**
 * Presses inside an async `act`, so pressability state settles before the next render (see `renderUi`, which is async).
 */
/** The element type `screen.getBy*` returns, so tests pass the queries' results straight in. */
export type TestElement = ReturnType<typeof screen.getByRole>;

export async function press(element: TestElement): Promise<void> {
  await act(async () => {
    fireEvent.press(element);
  });
}
