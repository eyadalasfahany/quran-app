import { makeItem, makeUnit } from '../../../../jest/azkar-ui-fixtures';
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

  it('takes the preview from the first unit body', () => {
    expect(buildCategoryCards(units, new Set())[0]?.preview).toBe('نص تجريبي 1 — ليس ذكرًا');
  });

  it('returns no cards for no units', () => {
    expect(buildCategoryCards([], new Set())).toEqual([]);
  });
});
