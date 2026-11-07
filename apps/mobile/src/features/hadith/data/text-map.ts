import { normalizeHadithForSearch } from '@/core/text/normalizeHadithForSearch';

import type { HadithTextRange } from '../types';

/**
 * Maps the normalised search text back to the original Arabic. The twin of `normalizeHadithForSearch.ts`: the four
 * steps there (strip marks, map letters, collapse whitespace, trim one space at each end) run here in one pass that
 * records offsets. Keep the code points in the same sets.
 */
export type MappedHadithText = {
  normalized: string;
  /** For each UTF-16 unit of `normalized`, the offset in the original where its source character starts. */
  starts: number[];
  /** Same, where its source character ends (exclusive), extended over the stripped marks that directly follow it. */
  ends: number[];
};

const SPACE = 0x20;

const LETTER_MAP: ReadonlyMap<number, number> = new Map([
  [0x0622, 0x0627],
  [0x0623, 0x0627],
  [0x0625, 0x0627],
  [0x0671, 0x0627],
  [0x0629, 0x0647],
  [0x0649, 0x064a],
]);

function isStripped(cp: number): boolean {
  return (
    (cp >= 0x200b && cp <= 0x200f) ||
    cp === 0x061c ||
    (cp >= 0x202a && cp <= 0x202e) ||
    (cp >= 0x2066 && cp <= 0x2069) ||
    cp === 0xfeff ||
    cp === 0x0640 ||
    (cp >= 0x064b && cp <= 0x065f) ||
    cp === 0x0670 ||
    (cp >= 0x06d6 && cp <= 0x06ed)
  );
}

function isWhitespace(cp: number): boolean {
  return (
    (cp >= 0x0009 && cp <= 0x000d) ||
    cp === SPACE ||
    cp === 0x00a0 ||
    cp === 0x1680 ||
    (cp >= 0x2000 && cp <= 0x200a) ||
    cp === 0x2028 ||
    cp === 0x2029 ||
    cp === 0x202f ||
    cp === 0x205f ||
    cp === 0x3000
  );
}

function unit(list: readonly number[], index: number): number {
  const value = list[index];
  if (value === undefined) {
    throw new Error('Offset index out of range.');
  }
  return value;
}

export function mapHadithText(original: string): MappedHadithText {
  const starts: number[] = [];
  const ends: number[] = [];
  let normalized = '';
  // UTF-16 units emitted for the last character (2 for a code point outside the BMP).
  let lastUnits = 0;
  let offset = 0;

  for (const char of original) {
    const cp = char.codePointAt(0) ?? 0;
    const start = offset;
    const end = offset + char.length;
    offset = end;

    if (isStripped(cp)) {
      if (lastUnits > 0) {
        for (let k = 1; k <= lastUnits; k += 1) {
          ends[ends.length - k] = end;
        }
      }
      continue;
    }

    if (isWhitespace(cp)) {
      if (normalized.length > 0 && normalized[normalized.length - 1] !== ' ') {
        normalized += ' ';
        starts.push(start);
        ends.push(end);
        lastUnits = 1;
      }
      continue;
    }

    const mapped = LETTER_MAP.get(cp) ?? cp;
    const text = String.fromCodePoint(mapped);
    normalized += text;
    for (let k = 0; k < text.length; k += 1) {
      starts.push(start);
      ends.push(end);
    }
    lastUnits = text.length;
  }

  if (normalized.endsWith(' ')) {
    normalized = normalized.slice(0, -1);
    starts.pop();
    ends.pop();
  }

  return { normalized, starts, ends };
}

/** The distinct query words in the hadith normalisation (punctuation dropped), in their first-seen order. */
export function queryTokens(rawQuery: string): string[] {
  const words = normalizeHadithForSearch(rawQuery).match(/[\p{L}\p{N}]+/gu) ?? [];
  return [...new Set(words)];
}

/**
 * Highlight spans on the original text. A word is highlighted when it equals a token or starts with one (the rule of
 * `src/features/search/highlight.ts`). Touching or overlapping spans merge.
 */
export function highlightRanges(original: string, tokens: readonly string[]): HadithTextRange[] {
  if (tokens.length === 0) {
    return [];
  }
  const mapped = mapHadithText(original);
  const ranges: HadithTextRange[] = [];

  for (const match of mapped.normalized.matchAll(/[\p{L}\p{N}]+/gu)) {
    const word = match[0];
    const a = match.index;
    const b = a + word.length;
    if (!tokens.some((token) => word === token || word.startsWith(token))) {
      continue;
    }
    ranges.push({ start: unit(mapped.starts, a), end: unit(mapped.ends, b - 1) });
  }

  ranges.sort((left, right) => left.start - right.start);
  const merged: HadithTextRange[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last !== undefined && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}
