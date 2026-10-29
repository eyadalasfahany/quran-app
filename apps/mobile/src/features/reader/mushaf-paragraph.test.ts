import type { VerseRecord } from './data/verses';
import { getVerseByKey } from './data/verses';
import { MUSHAF_WORD_SPACE, paragraphOf, paragraphWordOffset, surahRuns } from './mushaf-paragraph';
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
