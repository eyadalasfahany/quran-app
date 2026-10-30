// Where the recited word sits on screen, for the follow-scroll (developer, 29 Oct 2026). Pure: useWordFollow
// measures the text and the list, and this module decides. Every function here only counts or measures what the
// page renders; none of them changes the Quran text.

import { isWordToken, splitRecitedText, type TextPiece } from './recited-text';

/** One laid-out line of a Text, as onTextLayout reports it (only the fields used here). */
export type TextLine = { text: string; y: number; height: number };

/** A vertical band inside a viewport, from its top edge. */
export type Band = { top: number; bottom: number };

/** The comfort band is the middle share of the visible area: a line outside it scrolls back to the target. */
export const COMFORT_BAND_SHARE = 0.6;
/** Where the followed line lands after a scroll: a third of the way down the viewport (the ayah follow uses it too). */
export const FOLLOW_VIEW_POSITION = 1 / 3;

/**
 * The character offset of the `activeWord`-th word (1-based, counted as splitRecitedText counts them) in the
 * text the pieces came from. Null when there are fewer words than that.
 */
export function wordCharOffset(pieces: readonly TextPiece[], activeWord: number): number | null {
  let words = 0;
  let offset = 0;
  for (const piece of pieces) {
    if (!piece.separator && isWordToken(piece.text)) {
      words += 1;
      if (words === activeWord) {
        return offset;
      }
    }
    offset += piece.text.length;
  }
  return null;
}

/** The offset of the recited word inside an ayah's own text. */
export function recitedWordOffset(text: string, activeWord: number): number | null {
  return wordCharOffset(splitRecitedText(text, activeWord), activeWord);
}

/**
 * The index of the line holding the character at `offset`, by the lines' cumulative lengths. An offset that
 * falls on a line break belongs to the line after it. -1 when no line holds it (no lines, or past the end).
 */
export function lineForOffset(lines: readonly TextLine[], offset: number): number {
  if (offset < 0) {
    return -1;
  }
  let start = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const end = start + lines[index]!.text.length;
    if (offset < end) {
      return index;
    }
    start = end;
  }
  return -1;
}

/** The band a viewport of `visibleHeight` keeps the recited line in: its middle COMFORT_BAND_SHARE. */
export function comfortBand(visibleHeight: number): Band {
  const margin = (visibleHeight * (1 - COMFORT_BAND_SHARE)) / 2;
  return { bottom: visibleHeight - margin, top: margin };
}

/**
 * The scroll change that puts a line a third down the viewport, or null when the whole line already sits in the
 * band. `lineY` is the line's top in viewport coordinates; a positive result scrolls the content up (down the
 * text), a negative one back up.
 */
export function scrollTargetForLine(
  lineY: number,
  lineHeight: number,
  viewport: { height: number },
  band: Band,
): number | null {
  const inside = lineY >= band.top && lineY + lineHeight <= band.bottom;
  if (inside) {
    return null;
  }
  return lineY - viewport.height * FOLLOW_VIEW_POSITION;
}
