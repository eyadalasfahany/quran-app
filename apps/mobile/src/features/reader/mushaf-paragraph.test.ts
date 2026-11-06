import type { VerseRecord } from './data/verses';
import { getVerseByKey } from './data/verses';
import {
  MUSHAF_WORD_SPACE,
  paragraphOf,
  paragraphVerseRanges,
  paragraphWordOffset,
  surahRuns,
  verseKeyAtOffset,
} from './mushaf-paragraph';
import { recitedWordOffset } from './word-follow';
import { ayahEndMarkText } from '@/shared/ui/AyahEndMark';
import { openReaderTestContent } from '../../../jest/reader-test-db';

function verse(verseKey: string, verseNumber: number, textUthmani: string): VerseRecord {
  return { chapterId: Number(verseKey.split(':')[0]), textUthmani, verseKey, verseNumber } as unknown as VerseRecord;
}

// The paragraph as the page draws it: each ayah, the space, the end mark, and the space before the next ayah.
function drawnParagraph(run: VerseRecord[]): string {
  return run
    .map(
      (item, index) =>
        `${index > 0 ? MUSHAF_WORD_SPACE : ''}${item.textUthmani}${MUSHAF_WORD_SPACE}${ayahEndMarkText(item.verseNumber)}`,
    )
    .join('');
}

describe('paragraphWordOffset', () => {
  const run = [
    verse('2:1', 1, 'الم'),
    verse('2:2', 2, 'ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ فِيهِ'),
    verse('2:3', 3, 'ٱلَّذِينَ يُؤْمِنُونَ'),
  ];

  it('is zero at the first word of the first ayah', () => {
    expect(paragraphWordOffset(run, '2:1', 1)).toBe(0);
  });

  it('counts the earlier ayahs with their spaces and end marks', () => {
    const offset = paragraphWordOffset(run, '2:2', 1);
    const paragraph = drawnParagraph(run);
    expect(offset).not.toBeNull();
    expect(paragraph.slice(offset!).startsWith('ذَٰلِكَ')).toBe(true);
  });

  it('lands on the recited word inside a later ayah, past the waqf mark', () => {
    const offset = paragraphWordOffset(run, '2:2', 3);
    const paragraph = drawnParagraph(run);
    expect(offset).not.toBeNull();
    expect(paragraph.slice(offset!).startsWith('لَا')).toBe(true);
  });

  it('is null when the ayah is not in the paragraph or has too few words', () => {
    expect(paragraphWordOffset(run, '2:9', 1)).toBeNull();
    expect(paragraphWordOffset(run, '2:3', 9)).toBeNull();
  });
});

describe('paragraphVerseRanges', () => {
  // Placeholder text: the ranges depend only on the lengths and the marks, never on the words.
  const run = [verse('2:1', 1, 'aaaa'), verse('2:2', 2, 'bb'), verse('2:3', 3, 'cccccc')];

  it('gives each ayah its own text span, which the drawn paragraph holds', () => {
    const paragraph = drawnParagraph(run);
    const ranges = paragraphVerseRanges(run);

    expect(ranges.map((range) => range.verseKey)).toEqual(['2:1', '2:2', '2:3']);
    run.forEach((item, index) => {
      const range = ranges[index]!;
      expect(paragraph.slice(range.start, range.textEnd)).toBe(item.textUthmani);
    });
  });

  it('starts each later ayah after its space, the previous end mark and the space before it', () => {
    const ranges = paragraphVerseRanges(run);
    const gap = MUSHAF_WORD_SPACE.length * 2 + ayahEndMarkText(1).length;

    expect(ranges[0]!.start).toBe(0);
    expect(ranges[1]!.start).toBe(ranges[0]!.textEnd + gap);
  });

  it('counts the first word of each ayah the way paragraphWordOffset does', () => {
    const paragraph = drawnParagraph(run);

    for (const [index, item] of run.entries()) {
      const offset = paragraphWordOffset(run, item.verseKey, 1);
      expect(offset).toBe(paragraphVerseRanges(run)[index]!.start + recitedWordOffset(item.textUthmani, 1)!);
      expect(paragraph.slice(offset!).startsWith(item.textUthmani)).toBe(true);
    }
  });

  it('is empty for an empty run', () => {
    expect(paragraphVerseRanges([])).toEqual([]);
  });
});

describe('paragraphWordOffset and paragraphVerseRanges agree', () => {
  it('place every counted word inside its own ayah, across a real run', async () => {
    const { executor } = await openReaderTestContent();
    const run = paragraphOf(executor, '2:255')!;
    const ranges = paragraphVerseRanges(run);
    const paragraph = drawnParagraph(run);

    run.forEach((item, index) => {
      const range = ranges[index]!;
      expect(paragraph.slice(range.start, range.textEnd)).toBe(item.textUthmani);
      const offset = paragraphWordOffset(run, item.verseKey, 1);
      expect(offset).toBe(range.start + recitedWordOffset(item.textUthmani, 1)!);
      expect(verseKeyAtOffset(run, offset!)).toBe(item.verseKey);
    });
  });
});

describe('verseKeyAtOffset', () => {
  const run = [verse('2:1', 1, 'aaaa'), verse('2:2', 2, 'bb'), verse('2:3', 3, 'cccccc')];

  it('gives the ayah whose own text holds the offset', () => {
    const ranges = paragraphVerseRanges(run);

    expect(verseKeyAtOffset(run, ranges[0]!.start)).toBe('2:1');
    expect(verseKeyAtOffset(run, ranges[0]!.textEnd - 1)).toBe('2:1');
    expect(verseKeyAtOffset(run, ranges[1]!.start)).toBe('2:2');
    expect(verseKeyAtOffset(run, ranges[2]!.start + 3)).toBe('2:3');
  });

  it('gives the next ayah for an offset in the space or end mark after an ayah', () => {
    const ranges = paragraphVerseRanges(run);

    // The space right after the first ayah's text, and the end mark itself.
    expect(verseKeyAtOffset(run, ranges[0]!.textEnd)).toBe('2:2');
    expect(verseKeyAtOffset(run, ranges[0]!.textEnd + MUSHAF_WORD_SPACE.length)).toBe('2:2');
    expect(verseKeyAtOffset(run, ranges[1]!.textEnd + 1)).toBe('2:3');
  });

  it('gives the last ayah for an offset in its end mark or past the paragraph', () => {
    const ranges = paragraphVerseRanges(run);

    expect(verseKeyAtOffset(run, ranges[2]!.textEnd + 2)).toBe('2:3');
    expect(verseKeyAtOffset(run, 10_000)).toBe('2:3');
  });

  it('is null for an empty run or a negative offset', () => {
    expect(verseKeyAtOffset([], 0)).toBeNull();
    expect(verseKeyAtOffset(run, -1)).toBeNull();
  });
});

describe('surahRuns', () => {
  it('starts a new run at each surah, and at the first ayah of the page', () => {
    const runs = surahRuns([verse('1:6', 6, 'a'), verse('1:7', 7, 'b'), verse('2:1', 1, 'c'), verse('2:2', 2, 'd')]);
    expect(runs.map((run) => run.map((item) => item.verseKey))).toEqual([
      ['1:6', '1:7'],
      ['2:1', '2:2'],
    ]);
  });
});

describe('paragraphOf', () => {
  it('returns the surah run on the page that holds the ayah', async () => {
    const { executor } = await openReaderTestContent();
    const key = getVerseByKey(executor, '2:255');
    expect(key).toBeDefined();
    const run = paragraphOf(executor, '2:255');
    expect(run).not.toBeNull();
    expect(run!.some((item) => item.verseKey === '2:255')).toBe(true);
    expect(new Set(run!.map((item) => item.chapterId))).toEqual(new Set([2]));
  });

  it('is null for an ayah the content does not hold', async () => {
    const { executor } = await openReaderTestContent();
    expect(paragraphOf(executor, '999:1')).toBeNull();
  });
});
