// How the full player's column fits the window (ADR 0062 decision 5: no artwork). The header, reciter and surah,
// the ayah card, progress, transport and the options bar keep their natural heights; the reciters list takes the
// room below them. The ayah card is as tall as its text, up to the largest height the room allows. Pure:
// PlayerScreen measures the window and the fixed parts, and this module decides.

/** The column's gap between its children, from the #Player frame. */
export const PLAYER_COLUMN_GAP = 20;

/** One line of Quran text at the card's size: 25 pt with the 2.1 line height (NowPlayingAyah). */
export const AYAH_LINE_HEIGHT = 52.5;

/** The card's own chrome: 14 pt padding top and bottom, the border, the 6 pt gap and a counter line. */
const AYAH_CARD_CHROME = 28 + 2 + 6 + 16;

/**
 * The smallest the card may be: one line of Quran text and the card's chrome. A longer ayah is capped at the room the
 * column gives it and scrolls its own text, so the page never needs more than this for the card.
 */
export const AYAH_CARD_ONE_LINE_HEIGHT = AYAH_LINE_HEIGHT + AYAH_CARD_CHROME;

/**
 * Room kept for the reciters list: its section label plus two 56 pt rows. The list scrolls inside the room it gets
 * (step 7), so this is its floor, not its full height.
 */
export const RECITERS_LIST_MIN_HEIGHT = 24 + 2 * 56;

export type PlayerColumnFit = {
  /** The ayah card's largest height; the card is its text's height up to this. Null until the window is measured. */
  cardMaxHeight: number | null;
  /** Only when even the minimum card and the list's minimum do not fit (a very large text size): the column scrolls. */
  scrolls: boolean;
};

/**
 * Decides the column layout. `available` is the window height inside the frame's padding (null until measured).
 * `fixedHeight` is the summed measured height of the fixed parts shown (header, title, progress, transport, options,
 * and the notice when it is shown), not the list. `fixedCount` counts those same parts, so the gaps between them are
 * counted. `hasCard` is true when the ayah card is shown.
 *
 * The reciters list is one more child, and it keeps at least RECITERS_LIST_MIN_HEIGHT. The card takes the room left
 * after that, up to its cap; its natural height is its text's (one line, or more up to the cap), measured by
 * NowPlayingAyah. The column scrolls only when even a one-line card and the list's floor do not fit, so a long ayah
 * never pushes the page: its card stays at the cap and scrolls its own text.
 */
export function fitPlayerColumn({
  available,
  fixedCount,
  fixedHeight,
  hasCard,
}: {
  available: number | null;
  fixedCount: number;
  fixedHeight: number;
  hasCard: boolean;
}): PlayerColumnFit {
  if (available === null) {
    return { cardMaxHeight: null, scrolls: false };
  }
  // The reciters list is one more child than the fixed parts, and the card is one more when it is shown.
  const children = fixedCount + 1 + (hasCard ? 1 : 0);
  const room = available - fixedHeight - PLAYER_COLUMN_GAP * (children - 1) - RECITERS_LIST_MIN_HEIGHT;

  if (!hasCard) {
    return { cardMaxHeight: null, scrolls: room < 0 };
  }
  return {
    cardMaxHeight: Math.max(AYAH_CARD_ONE_LINE_HEIGHT, room),
    scrolls: room < AYAH_CARD_ONE_LINE_HEIGHT,
  };
}
