import { makeItem, quranSegment, textSegment } from '../../../../jest/azkar-ui-fixtures';
import { firstArabicText, firstQuranRef } from './preview';

describe('firstArabicText', () => {
  it('returns the first text segment unaltered', () => {
    const items = [makeItem({ id: 1, segments: [textSegment('  نص تجريبي ١ — ليس ذكرًا  ')] })];
    expect(firstArabicText(items)).toBe('  نص تجريبي ١ — ليس ذكرًا  ');
  });

  it('skips Quran segments and empty text', () => {
    const items = [
      makeItem({ id: 1, segments: [quranSegment(1)] }),
      makeItem({ id: 2, segments: [textSegment(null, 1, 2)] }),
      makeItem({ id: 3, segments: [textSegment('نص تجريبي ٢ — ليس ذكرًا', 1, 3)] }),
    ];
    expect(firstArabicText(items)).toBe('نص تجريبي ٢ — ليس ذكرًا');
  });

  it('is null when nothing is text', () => {
    expect(firstArabicText([])).toBeNull();
    expect(firstArabicText([makeItem({ segments: [quranSegment(1)] })])).toBeNull();
  });
});

describe('firstQuranRef', () => {
  it('returns the surah and verse range of the first Quran segment', () => {
    const items = [makeItem({ id: 1, segments: [quranSegment(285, 286)] })];
    expect(firstQuranRef(items)).toEqual({ surah: 1, verseFrom: 285, verseTo: 286 });
  });

  it('uses the first verse as the end of a single-verse passage', () => {
    expect(firstQuranRef([makeItem({ segments: [quranSegment(255)] })])).toEqual({ surah: 1, verseFrom: 255, verseTo: 255 });
  });

  it('is null when no item has a Quran segment', () => {
    expect(firstQuranRef([])).toBeNull();
    expect(firstQuranRef([makeItem({ segments: [textSegment('نص تجريبي ١ — ليس ذكرًا')] })])).toBeNull();
  });
});
