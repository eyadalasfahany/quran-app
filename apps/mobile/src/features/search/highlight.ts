import { normalizeForSearch } from '@/core/text/normalizeForSearch';

import type { WordRecord } from '@/features/reader/data/words';

export function matchedWordPositions(words: WordRecord[], tokens: readonly string[]): number[] {
  if (tokens.length === 0) {
    return [];
  }

  const positions = new Set<number>();

  for (const word of words) {
    if (word.charType !== 'word') {
      continue;
    }
    const normalized = normalizeForSearch(word.textImlaei);
    for (const token of tokens) {
      if (token.length === 0) {
        continue;
      }
      if (normalized.startsWith(token) || normalized === token) {
        positions.add(word.position);
        break;
      }
    }
  }

  return [...positions].sort((a, b) => a - b);
}
