import { at } from '../../../../jest/azkar-test-db';
import type { AzkarItemDetail, AzkarSegment } from './model';
import { buildCategoryUnits, buildReaderUnits, visibleItems } from './reader-units';

// Placeholder text only («نص تجريبي» = "placeholder text"); never a real dhikr.
const PLACEHOLDER_1 = 'نص تجريبي ١ — ليس ذكرًا';
const PLACEHOLDER_2 = 'نص تجريبي ٢ — ليس ذكرًا';

function text(textAr: string | null, position = 1): AzkarSegment {
  return {
    resourceId: -1,
    itemId: 0,
    position,
    kind: 'text',
    textAr,
    quranSurah: null,
    quranVerseFrom: null,
    quranVerseTo: null,
    textSearch: null,
  };
}

function item(
  id: number,
  overrides: Partial<AzkarItemDetail> & { textAr?: string | null } = {},
): AzkarItemDetail {
  const { textAr = PLACEHOLDER_1, ...rest } = overrides;
  return {
    resourceId: -1,
    id,
    entryId: 1,
    itemKey: `fixture:item-${id}`,
    variationKey: 'default',
    position: id,
    kind: 'recitation',
    requiredCount: null,
    speaker: null,
    sourceDuaId: null,
    textEn: null,
    transliteration: null,
    repeatGroup: null,
    repeatTimes: null,
    segments: [{ ...text(textAr), itemId: id }],
    ...rest,
  };
}

const ENTRY = 'fixture:entry-001';

describe('buildReaderUnits', () => {
  it('makes one counted unit per recitation with its sourced count', () => {
    const units = buildReaderUnits(ENTRY, [item(1, { requiredCount: 3 }), item(2, { requiredCount: 33 })], 'ar');

    expect(units.map((unit) => [unit.unitKey, unit.kind, unit.requiredCount])).toEqual([
      ['fixture:item-1', 'recitation', 3],
      ['fixture:item-2', 'recitation', 33],
    ]);
    expect(at(units, 0).body).toHaveLength(1);
  });

  it('keeps a missing count null and never reads it as 1', () => {
    const unit = at(buildReaderUnits(ENTRY, [item(1, { requiredCount: null })], 'ar'), 0);

    expect(unit.requiredCount).toBeNull();
    expect(unit.requiredCount).not.toBe(1);
  });

  it('attaches instructions and narrations as preface, and steps after the last count as afterword', () => {
    const units = buildReaderUnits(
      ENTRY,
      [
        item(1, { kind: 'instruction', textAr: 'تعليمات تجريبية ١ — ليست ذكرًا' }),
        item(2, { kind: 'narration', textAr: 'نص تجريبي ٣ — ليس ذكرًا' }),
        item(3, { requiredCount: 7 }),
        item(4, { requiredCount: 2 }),
        item(5, { kind: 'narration', textAr: 'نص تجريبي ٤ — ليس ذكرًا' }),
      ],
      'ar',
    );

    expect(units).toHaveLength(2);
    expect(at(units, 0).preface.map((step) => step.id)).toEqual([1, 2]);
    expect(at(units, 0).afterword).toEqual([]);
    expect(at(units, 1).preface).toEqual([]);
    expect(at(units, 1).afterword.map((step) => step.id)).toEqual([5]);
  });

  it('builds one unit per repeat group, counted by repeat_times, with its steps in order', () => {
    const units = buildReaderUnits(
      ENTRY,
      [
        item(1, { repeatGroup: 1, repeatTimes: 3 }),
        item(2, { repeatGroup: 1, repeatTimes: 3, textAr: PLACEHOLDER_2 }),
        item(3, { requiredCount: 5 }),
      ],
      'ar',
    );

    expect(units).toHaveLength(2);
    expect(at(units, 0)).toMatchObject({ unitKey: `${ENTRY}:default:g1`, kind: 'recitation', requiredCount: 3 });
    expect(at(units, 0).body.map((step) => step.id)).toEqual([1, 2]);
    expect(at(units, 1).unitKey).toBe('fixture:item-3');
  });

  it('keeps a repeat group count null when the group has no repeat_times', () => {
    const unit = at(buildReaderUnits(ENTRY, [item(1, { repeatGroup: 2, repeatTimes: null })], 'ar'), 0);
    expect(unit.requiredCount).toBeNull();
  });

  it('turns an entry with no recitation into one read unit with a null count', () => {
    const units = buildReaderUnits(
      ENTRY,
      [item(1, { kind: 'instruction', textAr: 'تعليمات تجريبية ٢ — ليست ذكرًا' }), item(2, { kind: 'narration' })],
      'ar',
    );

    expect(units).toHaveLength(1);
    expect(at(units, 0)).toMatchObject({ unitKey: `${ENTRY}:default:read`, kind: 'read', requiredCount: null });
    expect(at(units, 0).body.map((step) => step.id)).toEqual([1, 2]);
  });

  it('returns no units for an entry with no visible step', () => {
    expect(buildReaderUnits(ENTRY, [], 'ar')).toEqual([]);
  });

  it('drops English-only steps from the Arabic interface and shows them in English', () => {
    const items = [
      item(1, { requiredCount: 2 }),
      item(2, { kind: 'narration', textAr: null, textEn: 'FIXTURE text 6 — not a dhikr' }),
    ];

    const arabic = buildReaderUnits(ENTRY, items, 'ar');
    const english = buildReaderUnits(ENTRY, items, 'en');

    expect(arabic).toHaveLength(1);
    expect(at(arabic, 0).afterword).toEqual([]);
    expect(english).toHaveLength(1);
    expect(at(english, 0).afterword.map((step) => step.id)).toEqual([2]);
    expect(visibleItems(items, 'ar').map((step) => step.id)).toEqual([1]);
  });

  it('carries the alternatives and the active one on every unit of the entry', () => {
    const variations = [
      { key: 'a', labelIndex: 1, labelEn: null },
      { key: 'b', labelIndex: 2, labelEn: null },
    ];
    const units = buildReaderUnits(ENTRY, [item(1, { requiredCount: 3, variationKey: 'b' })], 'ar', {
      variations,
      activeVariation: 'b',
    });

    expect(at(units, 0)).toMatchObject({ activeVariation: 'b', variations });
  });

  it('makes a read unit key per active variation, so switching never mixes counts', () => {
    const first = buildReaderUnits(ENTRY, [item(1, { kind: 'narration', variationKey: 'a' })], 'ar');
    const second = buildReaderUnits(ENTRY, [item(2, { kind: 'narration', variationKey: 'b' })], 'ar');

    expect(at(first, 0).unitKey).not.toBe(at(second, 0).unitKey);
  });

  it('builds category units as the concatenation of entry units in entry order', () => {
    const units = buildCategoryUnits(
      [
        { entryKey: 'fixture:entry-001', items: [item(1, { requiredCount: 3 })] },
        { entryKey: 'fixture:entry-002', items: [item(2, { requiredCount: null })] },
      ],
      'ar',
    );

    expect(units.map((unit) => unit.entryKey)).toEqual(['fixture:entry-001', 'fixture:entry-002']);
    expect(units.map((unit) => unit.requiredCount)).toEqual([3, null]);
  });
});
