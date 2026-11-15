import { makeItem, makeUnit, quranSegment, textSegment } from '../../../../jest/azkar-ui-fixtures';
import { buildCategoryCards } from './category-cards';

describe('buildCategoryCards', () => {
  const units = [
    makeUnit({ unitKey: 'a:1', entryKey: 'entry-a', requiredCount: 3, body: [makeItem({ id: 1 })] }),
    makeUnit({ unitKey: 'a:2', entryKey: 'entry-a', requiredCount: 7, body: [makeItem({ id: 2 })] }),
    makeUnit({ unitKey: 'b:1', entryKey: 'entry-b', requiredCount: null, body: [makeItem({ id: 3, requiredCount: null })] }),
  ];

  it('makes one card per entry, in unit order, opening at its first unit', () => {
    const cards = buildCategoryCards(units, new Set());

    expect(cards.map((card) => card.entryKey)).toEqual(['entry-a', 'entry-b']);
    expect(cards[0]).toMatchObject({ unitKey: 'a:1', requiredCount: 3, done: false });
    expect(cards[1]).toMatchObject({ unitKey: 'b:1', requiredCount: null });
  });

  it('marks an entry done only when all its units are completed', () => {
    expect(buildCategoryCards(units, new Set(['a:1'])).map((card) => card.done)).toEqual([false, false]);
    expect(buildCategoryCards(units, new Set(['a:1', 'a:2', 'b:1'])).map((card) => card.done)).toEqual([true, true]);
  });

  it('takes the preview from the first unit body, and no Quran references when there are none', () => {
    expect(buildCategoryCards(units, new Set())[0]?.preview).toBe('نص تجريبي 1 — ليس ذكرًا');
    expect(buildCategoryCards(units, new Set())[0]?.quranRefs).toEqual([]);
  });

  it('gives an entry that opens with a Quran passage its surah and verses instead of a preview', () => {
    const quran = [makeUnit({ unitKey: 'q:1', entryKey: 'entry-q', body: [makeItem({ id: 4, segments: [quranSegment(255)] })] })];

    expect(buildCategoryCards(quran, new Set())[0]).toMatchObject({
      preview: null,
      quranRefs: [{ surah: 1, verseFrom: 255, verseTo: 255 }],
    });
  });

  it('keeps every Quran reference of an entry even when it also has a text preview', () => {
    const lead = [
      makeUnit({
        unitKey: 'l:1',
        entryKey: 'entry-l',
        body: [
          makeItem({ id: 5, segments: [textSegment('نص تجريبي ١ — ليس ذكرًا'), quranSegment(255)] }),
          makeItem({ id: 6, segments: [quranSegment(1, 7)] }),
        ],
      }),
    ];

    expect(buildCategoryCards(lead, new Set())[0]).toMatchObject({
      preview: 'نص تجريبي ١ — ليس ذكرًا',
      quranRefs: [
        { surah: 1, verseFrom: 255, verseTo: 255 },
        { surah: 1, verseFrom: 1, verseTo: 7 },
      ],
    });
  });

  it('returns no cards for no units', () => {
    expect(buildCategoryCards([], new Set())).toEqual([]);
  });
});
