// Where the ayah card scrolls to keep the recited word on screen (developer, 29 Oct 2026). Pure: the card
// reads the text's lines and its own scroll offset, and this module decides. It reuses the reader's word-follow
// helpers unchanged, so the card follows the same comfort band and the same "a third down" landing.

import { comfortBand, lineForOffset, scrollTargetForLine, type TextLine } from '@/features/reader/word-follow';

/**
 * The scroll offset that puts the recited word's line a third down the card, or null when the line already sits
 * in the comfort band (or the word has no line yet). `lines` are the Text's lines in its own content, whose top
 * is the content's top; `scrollOffset` is the card's offset now, so the line's on-screen top is `line.y - scrollOffset`.
 */
export function ayahFollowTarget({
  lines,
  offset,
  viewportHeight,
  scrollOffset,
}: {
  lines: readonly TextLine[];
  offset: number;
  viewportHeight: number;
  scrollOffset: number;
}): number | null {
  const index = lineForOffset(lines, offset);
  if (index < 0) {
    return null;
  }
  const line = lines[index]!;
  const delta = scrollTargetForLine(line.y - scrollOffset, line.height, { height: viewportHeight }, comfortBand(viewportHeight));
  if (delta === null) {
    return null;
  }
  return Math.max(0, scrollOffset + delta);
}
