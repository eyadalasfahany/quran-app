import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PAUSE_MARKS = new Set<number>([
  0x06d6, 0x06d7, 0x06d8, 0x06d9, 0x06da, 0x06db, 0x06dc, 0x06e2, 0x06ed,
]);
const SAJDAH = 0x06e9;
const RUB = 0x06de;
const RUB_PREFIX = '۞ ';
const VOCATIVES = new Set(['يا', 'ويا', 'فيا', 'أيا', 'ها']);

export type CharType = 'word' | 'end';

export type UthmaniWord = {
  position: number;
  char_type: CharType;
  text: string;
};

export type ImlaeiWord = {
  position: number;
  char_type: CharType;
  text_imlaei: string;
};

export type WordException = {
  verse_key: string;
  reason: string;
  join?: readonly [string, string];
  join_simple?: readonly [string, string];
  simple_groups?: readonly (readonly number[])[];
  no_vocative?: readonly string[];
};

export class WordSplitError extends Error {
  override readonly name = 'WordSplitError';
}

let cachedExceptions: readonly WordException[] | undefined;

export function loadWordExceptions(): readonly WordException[] {
  cachedExceptions ??= parseExceptions(JSON.parse(readFileSync(exceptionsPath(), 'utf8')));
  return cachedExceptions;
}

export function splitUthmaniWords(verseKey: string, verseText: string): UthmaniWord[] {
  const exception = exceptionFor(verseKey);
  const words = applyJoins(attachMarks(tokensOf(verseText, verseKey), verseKey), exception?.join, verseKey);

  if (words.join(' ') !== verseText) {
    throw new WordSplitError(`Uthmani words for ${verseKey} do not rejoin the verse.`);
  }

  return withEnd(words);
}

export function alignImlaei(
  uthmaniWords: readonly UthmaniWord[],
  simpleVerseText: string,
  verseKey: string,
): ImlaeiWord[] {
  const exception = exceptionFor(verseKey);
  const marked = attachMarks(tokensOf(simpleVerseText, verseKey), verseKey);
  const merged = applyVocative(marked, exception?.no_vocative);
  const joined = applyJoins(merged, exception?.join_simple ?? exception?.join, verseKey);
  const grouped = exception?.simple_groups
    ? applyGroups(joined, exception.simple_groups, verseKey)
    : joined;
  const wordRows = uthmaniWords.filter((word) => word.char_type === 'word');

  if (grouped.length !== wordRows.length) {
    throw new WordSplitError(
      `Imla'i alignment for ${verseKey} has ${grouped.length} words and Uthmani has ${wordRows.length}.`,
    );
  }

  if (grouped.join(' ') !== simpleVerseText) {
    throw new WordSplitError(`Imla'i alignment for ${verseKey} does not rejoin the Simple text.`);
  }

  const texts = [...grouped, ''];

  return uthmaniWords.map((word, index) => {
    const text = texts[index];

    if (text === undefined) {
      throw new WordSplitError(`Imla'i alignment for ${verseKey} is missing position ${word.position}.`);
    }

    return {
      position: word.position,
      char_type: word.char_type,
      text_imlaei: text,
    };
  });
}

function exceptionsPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '../data/word-exceptions.json');
}

function exceptionFor(verseKey: string): WordException | undefined {
  return loadWordExceptions().find((entry) => entry.verse_key === verseKey);
}

function tokensOf(text: string, verseKey: string): string[] {
  const tokens = text.split(' ');

  if (tokens.some((token) => token === '')) {
    throw new WordSplitError(`${verseKey} contains an empty token.`);
  }

  return tokens;
}

function attachMarks(tokens: readonly string[], verseKey: string): string[] {
  const words: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token === undefined) {
      throw new WordSplitError(`${verseKey} is missing a token.`);
    }

    if (isOnly(token, (codePoint) => codePoint === RUB)) {
      const next = tokens[index + 1];

      if (next === undefined || isAttachedMark(next)) {
        throw new WordSplitError(`A rub mark in ${verseKey} has no following word.`);
      }

      words.push(`${token} ${next}`);
      index += 1;
      continue;
    }

    if (isAttachedMark(token)) {
      const previous = words.at(-1);

      if (previous === undefined) {
        throw new WordSplitError(`A pause or sajdah mark in ${verseKey} has no previous word.`);
      }

      words[words.length - 1] = `${previous} ${token}`;
      continue;
    }

    words.push(token);
  }

  return words;
}

function applyVocative(words: readonly string[], skip: readonly string[] | undefined): string[] {
  const skipped = new Set(skip ?? []);
  const merged: string[] = [];

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const next = words[index + 1];

    if (word === undefined) {
      throw new WordSplitError('A Simple word is missing.');
    }

    // A rub mark is already prepended as "۞ ". Strip it so «۞ يَا» still merges.
    const core = word.startsWith(RUB_PREFIX) ? word.slice(RUB_PREFIX.length) : word;

    if (
      next !== undefined &&
      !core.includes(' ') &&
      !skipped.has(core) &&
      !skipped.has(word) &&
      VOCATIVES.has(lettersOf(core))
    ) {
      merged.push(`${word} ${next}`);
      index += 1;
      continue;
    }

    merged.push(word);
  }

  return merged;
}

function applyJoins(
  words: readonly string[],
  join: readonly [string, string] | undefined,
  verseKey: string,
): string[] {
  if (join === undefined) {
    return [...words];
  }

  const [left, right] = join;
  const result: string[] = [];
  let found = false;

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const next = words[index + 1];

    if (word === left && next === right) {
      result.push(`${word} ${next}`);
      found = true;
      index += 1;
      continue;
    }

    if (word === undefined) {
      throw new WordSplitError(`${verseKey} is missing a word.`);
    }

    result.push(word);
  }

  if (!found) {
    throw new WordSplitError(`Join for ${verseKey} was not found in the verse.`);
  }

  return result;
}

function applyGroups(words: readonly string[], groups: readonly (readonly number[])[], verseKey: string): string[] {
  const flat: number[] = [];
  const result: string[] = [];

  for (const group of groups) {
    if (group.length === 0) {
      throw new WordSplitError(`An empty simple group was listed for ${verseKey}.`);
    }

    const parts: string[] = [];

    for (const index of group) {
      const word = words[index];

      if (word === undefined) {
        throw new WordSplitError(`simple_groups for ${verseKey} indexes a missing word.`);
      }

      parts.push(word);
      flat.push(index);
    }

    result.push(parts.join(' '));
  }

  const coversWordsInOrder = flat.length === words.length && flat.every((value, index) => value === index);

  if (!coversWordsInOrder) {
    throw new WordSplitError(`simple_groups for ${verseKey} must partition the Simple words in order.`);
  }

  return result;
}

function withEnd(words: readonly string[]): UthmaniWord[] {
  const rows: UthmaniWord[] = words.map((text, index) => ({
    position: index + 1,
    char_type: 'word',
    text,
  }));

  rows.push({
    position: words.length + 1,
    char_type: 'end',
    text: '',
  });

  return rows;
}

function lettersOf(token: string): string {
  let letters = '';

  for (const char of token) {
    const codePoint = char.codePointAt(0);

    if (codePoint === undefined || codePoint === 0x0640 || codePoint === 0x0670) {
      continue;
    }

    if (codePoint >= 0x064b && codePoint <= 0x065f) {
      continue;
    }

    letters += char;
  }

  return letters;
}

function isAttachedMark(token: string): boolean {
  return isOnly(token, (codePoint) => PAUSE_MARKS.has(codePoint) || codePoint === SAJDAH);
}

function isOnly(token: string, matches: (codePoint: number) => boolean): boolean {
  if (token === '') {
    return false;
  }

  for (const char of token) {
    const codePoint = char.codePointAt(0);

    if (codePoint === undefined || !matches(codePoint)) {
      return false;
    }
  }

  return true;
}

function parseExceptions(value: unknown): WordException[] {
  if (!Array.isArray(value)) {
    throw new WordSplitError('word-exceptions.json must be an array.');
  }

  const seen = new Set<string>();

  return value.map((entry) => {
    if (!isRecord(entry)) {
      throw new WordSplitError('A word exception is not an object.');
    }

    const verseKey = entry.verse_key;
    const reason = entry.reason;

    if (typeof verseKey !== 'string' || verseKey === '' || typeof reason !== 'string' || reason === '') {
      throw new WordSplitError('A word exception needs verse_key and reason.');
    }

    if (seen.has(verseKey)) {
      throw new WordSplitError(`Duplicate word exception for ${verseKey}.`);
    }

    seen.add(verseKey);

    const parsed: WordException = { verse_key: verseKey, reason };

    if (entry.join !== undefined) {
      parsed.join = pair(entry.join, verseKey, 'join');
    }

    if (entry.join_simple !== undefined) {
      parsed.join_simple = pair(entry.join_simple, verseKey, 'join_simple');
    }

    if (entry.simple_groups !== undefined) {
      parsed.simple_groups = groups(entry.simple_groups, verseKey);
    }

    if (entry.no_vocative !== undefined) {
      parsed.no_vocative = stringList(entry.no_vocative, verseKey, 'no_vocative');
    }

    if (
      parsed.join === undefined &&
      parsed.join_simple === undefined &&
      parsed.simple_groups === undefined &&
      parsed.no_vocative === undefined
    ) {
      throw new WordSplitError(`${verseKey} exception has no effect.`);
    }

    return parsed;
  });
}

function pair(value: unknown, verseKey: string, field: string): readonly [string, string] {
  if (!Array.isArray(value) || value.length !== 2 || typeof value[0] !== 'string' || typeof value[1] !== 'string') {
    throw new WordSplitError(`${verseKey} ${field} must be two strings.`);
  }

  if (value[0] === '' || value[1] === '') {
    throw new WordSplitError(`${verseKey} ${field} must be two non-empty strings.`);
  }

  return [value[0], value[1]];
}

function groups(value: unknown, verseKey: string): readonly (readonly number[])[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new WordSplitError(`${verseKey} simple_groups must be a non-empty array.`);
  }

  return value.map((group) => {
    if (!Array.isArray(group) || group.length === 0) {
      throw new WordSplitError(`${verseKey} simple_groups contains an empty group.`);
    }

    return group.map((index) => {
      if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) {
        throw new WordSplitError(`${verseKey} simple_groups indexes must be non-negative integers.`);
      }

      return index;
    });
  });
}

function stringList(value: unknown, verseKey: string, field: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new WordSplitError(`${verseKey} ${field} must be a non-empty list of strings.`);
  }

  return value.map((item) => {
    if (typeof item !== 'string' || item === '') {
      throw new WordSplitError(`${verseKey} ${field} must be a non-empty list of strings.`);
    }

    return item;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
