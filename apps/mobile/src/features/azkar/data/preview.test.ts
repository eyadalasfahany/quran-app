import { makeItem, quranSegment, textSegment } from '../../../../jest/azkar-ui-fixtures';
import { firstArabicText, firstQuranRef, isLeadInFragment, quranRefs, recitationPreview } from './preview';

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

describe('quranRefs', () => {
  it('returns every Quran segment in order, across items, even after a text preview', () => {
    const items = [
      makeItem({ id: 1, segments: [textSegment('نص تجريبي ١ — ليس ذكرًا'), quranSegment(255)] }),
      makeItem({ id: 2, segments: [quranSegment(1, 7)] }),
    ];
    expect(quranRefs(items)).toEqual([
      { surah: 1, verseFrom: 255, verseTo: 255 },
      { surah: 1, verseFrom: 1, verseTo: 7 },
    ]);
  });

  it('is empty when no item has a Quran segment', () => {
    expect(quranRefs([])).toEqual([]);
    expect(quranRefs([makeItem({ segments: [textSegment('نص تجريبي ١ — ليس ذكرًا')] })])).toEqual([]);
  });

  it('keeps firstQuranRef as the first of them', () => {
    const items = [makeItem({ id: 1, segments: [quranSegment(255), quranSegment(1, 7)] })];
    expect(firstQuranRef(items)).toEqual(quranRefs(items)[0]);
  });
});

describe('isLeadInFragment', () => {
  it.each(['ويقول:', '…ويقول:', 'يقول:', 'FIXTURE lead-in:'])('treats %s as a lead-in', (text) => {
    expect(isLeadInFragment(text)).toBe(true);
  });

  it('keeps a body text, and a colon after more than four words', () => {
    expect(isLeadInFragment('FIXTURE one two three four five:')).toBe(false);
    expect(isLeadInFragment('نص تجريبي ١ — ليس ذكرًا')).toBe(false);
  });
});

describe('recitationPreview', () => {
  it('ignores instruction and narration steps', () => {
    const items = [
      makeItem({ id: 1, kind: 'instruction', segments: [textSegment('نص تجريبي ١ — تعليمات')] }),
      makeItem({ id: 2, kind: 'narration', segments: [textSegment('نص تجريبي ٢ — رواية')] }),
      makeItem({ id: 3, kind: 'recitation', segments: [textSegment('نص تجريبي ٣ — ليس ذكرًا', 1, 3)] }),
    ];
    expect(recitationPreview(items)).toBe('نص تجريبي ٣ — ليس ذكرًا');
  });

  it('skips a lead-in fragment and takes the recitation body', () => {
    const items = [makeItem({ id: 1, kind: 'recitation', segments: [textSegment('ويقول:')] }), makeItem({ id: 2, segments: [textSegment('نص تجريبي ٤ — ليس ذكرًا', 1, 2)] })];
    expect(recitationPreview(items)).toBe('نص تجريبي ٤ — ليس ذكرًا');
  });

  it('is null with no recitation text', () => {
    expect(recitationPreview([makeItem({ kind: 'instruction', segments: [textSegment('نص تجريبي ١ — تعليمات')] })])).toBeNull();
  });
});
