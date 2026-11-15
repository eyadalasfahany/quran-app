import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildWordMap, type WordMapRow } from './word-map.ts';

/**
 * The API's word file (ADR 0093): for each verse, the aligned Imla'i words in position order. Position n is the n-th
 * entry (1-based), the same position the device `words` table and QF use. Only `word` rows are kept; the `end` row is
 * not a quoted word. Derived from the Tanzil seed, so it is generated and never typed.
 */
export function renderApiWordMap(rows: readonly WordMapRow[] = buildWordMap()): string {
  const versesInOrder: [string, string[]][] = [];
  const byKey = new Map<string, string[]>();

  for (const row of rows) {
    if (row.char_type !== 'word') {
      continue;
    }

    let words = byKey.get(row.verse_key);

    if (words === undefined) {
      words = [];
      byKey.set(row.verse_key, words);
      versesInOrder.push([row.verse_key, words]);
    }

    words.push(row.text_imlaei);
  }

  const lines = versesInOrder.map(([verseKey, words], index) => {
    const separator = index === versesInOrder.length - 1 ? '' : ',';

    return `${JSON.stringify(verseKey)}:${JSON.stringify(words)}${separator}`;
  });

  return `{\n${lines.join('\n')}\n}\n`;
}

export function apiWordMapPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '../../../apps/api/resources/quran/word-map.json');
}

export function committedApiWordMap(): string {
  return readFileSync(apiWordMapPath(), 'utf8');
}
