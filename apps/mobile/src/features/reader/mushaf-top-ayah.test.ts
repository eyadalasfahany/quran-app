import type { VerseRecord } from './data/verses';
import { MUSHAF_WORD_SPACE, paragraphVerseRanges } from './mushaf-paragraph';
import { type MeasuredRun, topVisibleVerseKey } from './mushaf-top-ayah';
import { ayahEndMarkText } from '@/shared/ui/AyahEndMark';

// Placeholder text: only the lengths of the ayahs and their end marks matter to the top ayah.
function verse(verseKey: string, verseNumber: number, textUthmani: string): VerseRecord {
  return { chapterId: Number(verseKey.split(':')[0]), textUthmani, verseKey, verseNumber } as unknown as VerseRecord;
}

// The paragraph as the page draws it: each ayah, its space and end mark, and the space before the next ayah.
function drawnParagraph(run: VerseRecord[]): string {
  return run
    .map(
      (item, index) =>
        `${index > 0 ? MUSHAF_WORD_SPACE : ''}${item.textUthmani}${MUSHAF_WORD_SPACE}${ayahEndMarkText(item.verseNumber)}`,
    )
    .join('');
}

function line(text: string, y: number, height = 50) {
  return { height, text, y };
}

const run = [verse('2:1', 1, 'aaaa'), verse('2:2', 2, 'bbbb')];
const text = drawnParagraph(run);
const ranges = paragraphVerseRanges(run);

describe('topVisibleVerseKey', () => {
  it('picks the next line when the first line is more than half hidden', () => {
    // The first line holds ayah 2:1 and is hidden past its middle; the second line starts in 2:2.
    const runs: MeasuredRun[] = [
      {
        lines: [line(text.slice(0, ranges[1]!.start), -40), line(text.slice(ranges[1]!.start), 10)],
        run,
        screenTop: 0,
      },
    ];

    expect(topVisibleVerseKey(runs)).toBe('2:2');
  });

  it('counts a line exactly half visible', () => {
    const runs: MeasuredRun[] = [
      {
        lines: [line(text.slice(0, ranges[1]!.start), -25), line(text.slice(ranges[1]!.start), 25)],
        run,
        screenTop: 0,
      },
    ];

    expect(topVisibleVerseKey(runs)).toBe('2:1');
  });

  it('gives the next ayah for a line that starts with the end mark of the ayah before it', () => {
    const runs: MeasuredRun[] = [
      {
        lines: [line(text.slice(0, ranges[0]!.textEnd), -100), line(text.slice(ranges[0]!.textEnd), 0)],
        run,
        screenTop: 0,
      },
    ];

    expect(topVisibleVerseKey(runs)).toBe('2:2');
  });

  it('reads the runs on screen in the order of their top, whatever order they come in', () => {
    const later = [verse('3:1', 1, 'cc')];
    const runs: MeasuredRun[] = [
      { lines: [line('cc', 0)], run: later, screenTop: 0 },
      { lines: [line('aaaa', 0)], run, screenTop: -10 },
    ];

    expect(topVisibleVerseKey(runs)).toBe('2:1');
  });

  it('moves past a run that is entirely above the viewport to the one on screen', () => {
    const later = [verse('3:1', 1, 'cc')];
    const runs: MeasuredRun[] = [
      { lines: [line('aaaa', 0)], run, screenTop: -500 },
      { lines: [line('cc', 0)], run: later, screenTop: 100 },
    ];

    expect(topVisibleVerseKey(runs)).toBe('3:1');
  });

  it('is null when nothing is measured', () => {
    expect(topVisibleVerseKey([])).toBeNull();
    expect(topVisibleVerseKey([{ lines: [], run, screenTop: 0 }])).toBeNull();
  });

  it('is null when every line sits above the viewport', () => {
    const runs: MeasuredRun[] = [
      { lines: [line('aaaa', -200), line('bbbb', -150)], run, screenTop: 0 },
    ];

    expect(topVisibleVerseKey(runs)).toBeNull();
  });
});
