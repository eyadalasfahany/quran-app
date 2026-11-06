import type { HighlightColor } from '@/shared/ui';

// The saved ayah's wash. It is display only: never stored as a highlight (ADR 0070).
const SAVED_WASH: HighlightColor = 'green';

/**
 * The highlights the reader draws: the stored ones, with the saved ayah's wash over them when it has no colour of
 * its own. An ayah's own colour wins over the saved green (ADR 0073, decision 5). The input map is never changed;
 * with no saved ayah, or a saved ayah that already has a colour, it is returned as it is.
 */
export function withSavedWash(
  highlights: ReadonlyMap<number, HighlightColor>,
  savedVerseId: number | null,
): ReadonlyMap<number, HighlightColor> {
  if (savedVerseId === null || highlights.has(savedVerseId)) {
    return highlights;
  }
  return new Map(highlights).set(savedVerseId, SAVED_WASH);
}
