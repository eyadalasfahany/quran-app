import type { HighlightColor } from '@/shared/ui';

// The saved ayah's wash. It is display only: never stored as a highlight (ADR 0070).
const SAVED_WASH: HighlightColor = 'green';

/**
 * The highlights the reader draws: the stored ones, with the saved ayah's wash over them. The wash always wins,
 * so the saved ayah shows green even when it has a colour of its own (ADR 0070, decision 3). The input map is
 * never changed; with no saved ayah it is returned as it is.
 */
export function withSavedWash(
  highlights: ReadonlyMap<number, HighlightColor>,
  savedVerseId: number | null,
): ReadonlyMap<number, HighlightColor> {
  if (savedVerseId === null || highlights.get(savedVerseId) === SAVED_WASH) {
    return highlights;
  }
  return new Map(highlights).set(savedVerseId, SAVED_WASH);
}
