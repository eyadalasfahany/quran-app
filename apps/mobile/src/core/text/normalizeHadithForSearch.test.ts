import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { normalizeForSearch } from '@/core/text/normalizeForSearch';

import { normalizeHadithForSearch } from './normalizeHadithForSearch';

type GoldenCase = { name: string; input: string; expected: string };

// Read across the app boundary, the same way __tests__/content-sync.test.ts reads its fixtures (process.cwd() is apps/mobile).
const golden: GoldenCase[] = (
  JSON.parse(readFileSync(join(process.cwd(), '../api/tests/Fixtures/hadith/search-normalizer.json'), 'utf8')) as {
    cases: GoldenCase[];
  }
).cases;

function range(from: number, to: number): number[] {
  const codePoints: number[] = [];
  for (let codePoint = from; codePoint <= to; codePoint += 1) {
    codePoints.push(codePoint);
  }
  return codePoints;
}

const STRIPPED_CODE_POINTS = [
  ...range(0x200b, 0x200f),
  0x061c,
  ...range(0x202a, 0x202e),
  ...range(0x2066, 0x2069),
  0xfeff,
  0x0640,
  ...range(0x064b, 0x065f),
  0x0670,
  ...range(0x06d6, 0x06ed),
];

const WHITESPACE_CODE_POINTS = [...range(0x0009, 0x000d), 0x0020, 0x00a0, 0x1680, ...range(0x2000, 0x200a), 0x2028, 0x2029, 0x202f, 0x205f, 0x3000];

const MAPS: [number, number][] = [
  [0x0622, 0x0627],
  [0x0623, 0x0627],
  [0x0625, 0x0627],
  [0x0671, 0x0627],
  [0x0629, 0x0647],
  [0x0649, 0x064a],
];

describe('normalizeHadithForSearch', () => {
  it('matches the golden fixture shared with the API', () => {
    expect(golden.length).toBeGreaterThanOrEqual(26);

    for (const item of golden) {
      expect({ name: item.name, output: normalizeHadithForSearch(item.input) }).toEqual({
        name: item.name,
        output: item.expected,
      });
    }
  });

  it('is idempotent on every golden case', () => {
    for (const item of golden) {
      expect(normalizeHadithForSearch(item.expected)).toBe(item.expected);
    }
  });

  it('strips the documented sets and maps exactly six code points', () => {
    const letterA = String.fromCodePoint(0x0628);
    const letterB = String.fromCodePoint(0x062a);

    for (const codePoint of STRIPPED_CODE_POINTS) {
      expect(normalizeHadithForSearch(letterA + String.fromCodePoint(codePoint) + letterB)).toBe(letterA + letterB);
    }

    for (const [source, target] of MAPS) {
      expect(normalizeHadithForSearch(String.fromCodePoint(source))).toBe(String.fromCodePoint(target));
    }

    expect(normalizeHadithForSearch(String.fromCodePoint(0x0624))).toBe(String.fromCodePoint(0x0624));
    expect(normalizeHadithForSearch(String.fromCodePoint(0x0626))).toBe(String.fromCodePoint(0x0626));
  });

  it('uses the explicit whitespace set', () => {
    const letterA = String.fromCodePoint(0x0628);
    const letterB = String.fromCodePoint(0x062a);

    for (const codePoint of WHITESPACE_CODE_POINTS) {
      expect(normalizeHadithForSearch(letterA + String.fromCodePoint(codePoint) + letterB)).toBe(`${letterA} ${letterB}`);
    }

    expect(normalizeHadithForSearch(`${letterA}\u0085${letterB}`)).toBe(`${letterA}\u0085${letterB}`);
    expect(normalizeHadithForSearch(`${letterA}\u2060${letterB}`)).toBe(`${letterA}\u2060${letterB}`);
    expect(normalizeHadithForSearch(`${letterA}\uFEFF ${letterB}`)).toBe(`${letterA} ${letterB}`);
  });

  it('does not change the Quran normaliser', () => {
    expect(normalizeForSearch('\u0628\u200F')).toContain('\u200F');
  });
});
