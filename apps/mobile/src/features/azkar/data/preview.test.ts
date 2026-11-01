import { makeItem, quranSegment, textSegment } from '../../../../jest/azkar-ui-fixtures';
import { firstArabicText } from './preview';

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
