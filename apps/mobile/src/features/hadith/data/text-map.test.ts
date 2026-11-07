import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { normalizeHadithForSearch } from '@/core/text/normalizeHadithForSearch';

import { highlightRanges, mapHadithText, queryTokens } from './text-map';

type GoldenCase = { name: string; input: string; expected: string };

function goldenCases(): GoldenCase[] {
  const file = JSON.parse(
    readFileSync(join(process.cwd(), '../api/tests/Fixtures/hadith/search-normalizer.json'), 'utf8'),
  ) as { cases: GoldenCase[] };
  return file.cases;
}

describe('mapHadithText', () => {
  it('maps to the same normalised text as normalizeHadithForSearch for every golden case', () => {
    const cases = goldenCases();
    expect(cases.length).toBeGreaterThanOrEqual(26);
    for (const item of cases) {
      const mapped = mapHadithText(item.input).normalized;
      expect(mapped).toBe(item.expected);
      expect(mapped).toBe(normalizeHadithForSearch(item.input));
    }
  });

  it('records one start and one end per normalised unit', () => {
    for (const item of goldenCases()) {
      const mapped = mapHadithText(item.input);
      expect(mapped.starts.length).toBe(mapped.normalized.length);
      expect(mapped.ends.length).toBe(mapped.normalized.length);
    }
  });

  it('maps offsets back to the original letters', () => {
    // Placeholder letters ب ت ث with a fatha after the first one.
    const mapped = mapHadithText('بَتث');
    expect(mapped.normalized).toBe('بتث');
    expect(mapped.starts).toEqual([0, 2, 3]);
    expect(mapped.ends).toEqual([2, 3, 4]);
  });

  it('collapses whitespace and invisible marks without losing offsets', () => {
    const original = ' ب ‏ ت ';
    const mapped = mapHadithText(original);
    expect(mapped.normalized).toBe('ب ت');
    const index = mapped.normalized.indexOf('ت');
    expect(original.slice(mapped.starts[index], mapped.ends[index])).toBe('ت');
  });

  it('maps the six code points', () => {
    // U+0623 (alef with hamza above) becomes the plain alef; its offsets cover the original character.
    const original = 'xأy';
    const mapped = mapHadithText(original);
    expect(mapped.normalized).toBe('xاy');
    expect(mapped.starts[1]).toBe(1);
    expect(mapped.ends[1]).toBe(2);
  });

  it('handles a code point outside the BMP', () => {
    const original = 'ب\u{1F600}ت';
    const mapped = mapHadithText(original);
    expect(mapped.normalized).toBe(normalizeHadithForSearch(original));
    const index = mapped.normalized.length - 1;
    expect(original.slice(mapped.starts[index], mapped.ends[index])).toBe('ت');
  });
});

describe('queryTokens', () => {
  it('normalises with the hadith normaliser and drops punctuation', () => {
    expect(queryTokens('  أَب   ‏')).toEqual(['اب']);
    expect(queryTokens('')).toEqual([]);
  });

  it('removes a bidi mark inside a token, as the hadith normaliser does', () => {
    expect(queryTokens('ب‏ت')).toEqual(['بت']);
  });
});

describe('highlightRanges', () => {
  const original = 'نص تجريبي ١ — ليس حديثًا';

  it('highlights a whole word including its marks', () => {
    const ranges = highlightRanges(original, queryTokens('حديثا'));
    expect(ranges).toHaveLength(1);
    const [range] = ranges;
    expect(range).toBeDefined();
    expect(original.slice(range?.start, range?.end)).toBe('حديثًا');
  });

  it('highlights by prefix on word starts', () => {
    const ranges = highlightRanges(original, ['تجر']);
    expect(ranges.map((range) => original.slice(range.start, range.end))).toEqual(['تجريبي']);
  });

  it('returns highlighted words sorted by position, keeping separate words apart', () => {
    const text = 'ابت ابث';
    const ranges = highlightRanges(text, ['اب']);
    expect(ranges).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 7 },
    ]);
    const merged = highlightRanges('اب اب', ['اب']);
    expect(merged).toEqual([
      { start: 0, end: 2 },
      { start: 3, end: 5 },
    ]);
  });

  it('returns no range for an empty token list or no match', () => {
    expect(highlightRanges(original, [])).toEqual([]);
    expect(highlightRanges(original, ['غيرموجود'])).toEqual([]);
  });
});
