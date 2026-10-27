import { normalizeForSearch } from '@/core/text/normalizeForSearch';

const WESTERN_VERSE = /^([1-9]\d{0,2}):([1-9]\d{0,3})$/;
const SURAH_NUMBER = /^([1-9]\d{0,2})$/;

export type ParsedQuery =
  | { kind: 'empty' }
  | { kind: 'verse'; verseKey: string }
  | { kind: 'text'; tokens: string[]; normalized: string };

export function parseQuery(raw: string): ParsedQuery {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { kind: 'empty' };
  }

  const western = toWesternDigits(trimmed);
  const verseMatch = WESTERN_VERSE.exec(western);
  if (verseMatch !== null) {
    const chapter = Number(verseMatch[1]);
    const ayah = Number(verseMatch[2]);
    if (chapter >= 1 && chapter <= 114 && ayah >= 1) {
      return { kind: 'verse', verseKey: `${chapter}:${ayah}` };
    }
  }

  const normalized = normalizeForSearch(western);
  const tokens = normalized.length === 0 ? [] : normalized.split(' ').filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return { kind: 'empty' };
  }

  return { kind: 'text', tokens, normalized };
}

export function parseSurahNumber(raw: string): number | undefined {
  const trimmed = toWesternDigits(raw.trim());
  const match = SURAH_NUMBER.exec(trimmed);
  if (match === null) {
    return undefined;
  }
  const id = Number(match[1]);
  return id >= 1 && id <= 114 ? id : undefined;
}

function toWesternDigits(value: string): string {
  return value.replace(/[\u0660-\u0669]/gu, (digit) => String(digit.charCodeAt(0) - 0x0660));
}
