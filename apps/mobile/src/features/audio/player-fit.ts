// How the full player's column fits the window (developer, 29 Oct 2026, revised for a fixed card height): the header,
// title, progress, transport and options keep their natural heights. The artwork and the ayah card share the room
// left. The artwork gives way first, and the card takes a share of the window's height. Pure: PlayerScreen measures
// the window and the fixed parts, and this module decides.

/** The column's gap between its children, from the #Player frame. */
export const PLAYER_COLUMN_GAP = 20;

/** One line of Quran text at the card's size: 25 pt with the 2.1 line height (NowPlayingAyah). */
export const AYAH_LINE_HEIGHT = 52.5;

/** The glyph height of one Quran line, about 1.2 em at 25 pt. */
const AYAH_GLYPH_HEIGHT = 30;

/** The card's own chrome: 14 pt padding top and bottom, the border, the 6 pt gap and a counter line. */
const AYAH_CARD_CHROME = 28 + 2 + 6 + 16;

/**
 * The smallest the card may be: two lines of glyphs. The second line's glyphs start in the first line's leading,
 * so the text needs one line box plus half a leading and a glyph height, not two full line boxes.
 */
export const AYAH_CARD_MIN_HEIGHT = AYAH_LINE_HEIGHT + (AYAH_LINE_HEIGHT + AYAH_GLYPH_HEIGHT) / 2 + AYAH_CARD_CHROME;

/** The artwork's largest size: the frame's 220 pt tile. */
export const ARTWORK_MAX = 220;

/** The artwork's smallest size. Below this it is hidden rather than drawn too small to read as the reciter's tile. */
export const ARTWORK_MIN = 120;

/** The card's target share of the window's height. The card gets this much before the artwork takes any room. */
export const CARD_SHARE = 0.22;

/** The card's largest share of the window's height. Taller room than this stays as space above the options bar. */
export const CARD_MAX_SHARE = 0.4;

export type PlayerColumnFit = {
  /** The artwork's size, or null to hide the artwork. */
  artworkSize: number | null;
  /** The card's height, or null for the card's natural height. */
  cardHeight: number | null;
  /** Whether the whole column scrolls. Only when even the minimum card does not fit the window. */
  scrolls: boolean;
};

/**
 * Decides the column layout. `available` is the window height inside the frame's padding (null until measured).
 * `fixedHeight` is the summed measured height of the fixed parts shown (header, title, progress, transport, options,
 * and the notice when it is shown), not the artwork. `fixedCount` counts those same parts, so the gaps between them
 * are counted. `hasCard` is true when the ayah card or the notice slot is shown.
 *
 * The artwork and the card share the room the fixed parts leave. The card gets its target share first, the artwork
 * takes the rest up to its largest size, and the card then grows toward its largest share with whatever is left. If
 * the artwork would fall below its smallest size it is hidden and its room goes to the card. Only when even the
 * minimum card does not fit does the column scroll.
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
    return { artworkSize: ARTWORK_MAX, cardHeight: null, scrolls: false };
  }
  // The artwork is one more child than the fixed parts, and the card is one more when it is shown.
  const children = fixedCount + (hasCard ? 1 : 0) + 1;
  const room = available - fixedHeight - PLAYER_COLUMN_GAP * (children - 1);

  if (!hasCard) {
    const artwork = Math.min(room, ARTWORK_MAX);
    if (artwork >= ARTWORK_MIN) {
      return { artworkSize: artwork, cardHeight: null, scrolls: false };
    }
    return { artworkSize: null, cardHeight: null, scrolls: room + PLAYER_COLUMN_GAP < 0 };
  }

  const target = Math.max(AYAH_CARD_MIN_HEIGHT, Math.round(available * CARD_SHARE));
  const largestCard = Math.max(target, Math.round(available * CARD_MAX_SHARE));
  const artwork = Math.min(ARTWORK_MAX, room - target);
  if (artwork >= ARTWORK_MIN) {
    return { artworkSize: artwork, cardHeight: Math.min(room - artwork, largestCard), scrolls: false };
  }

  // The artwork and its gap are freed for the card.
  const cardRoom = room + PLAYER_COLUMN_GAP;
  if (cardRoom >= AYAH_CARD_MIN_HEIGHT) {
    return { artworkSize: null, cardHeight: Math.min(cardRoom, largestCard), scrolls: false };
  }
  // Last resort (a very large text size): the minimum card, and the column scrolls to show it whole.
  return { artworkSize: null, cardHeight: AYAH_CARD_MIN_HEIGHT, scrolls: true };
}
