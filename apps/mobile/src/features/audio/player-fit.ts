// How the full player's column fits the window (developer, 29 Oct 2026): the header, artwork, title, progress,
// transport and options keep their natural heights; the ayah card takes what is left. Pure: PlayerScreen measures
// the window, the fixed parts and the card's natural height, and this module decides.

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

export type PlayerColumnFit = {
  /** Whether the whole column scrolls. Only when the column cannot fit the window as laid out. */
  scrolls: boolean;
  /** The height the card fills, or null when the card stays at its natural height. */
  cardFill: number | null;
};

/**
 * Decides the column layout. `available` is the window height inside the frame's padding (null until measured),
 * `fixedHeight` is the summed natural height of the fixed parts, and `childCount` counts every column child
 * including the card or notice slot, so the gaps between them are counted too.
 *
 * `cardNatural` is the card's own height when its text is not cut: undefined when no card is shown, null until
 * it is measured. A card that fits at its natural height stays natural, exactly as the frame draws it. A longer
 * card fills the room left after the fixed parts and scrolls its text. Only when the room cannot hold even two
 * lines does the column scroll: at the minimum (a few points) or, when the fixed parts alone overflow, as a whole.
 */
export function fitPlayerColumn({
  available,
  cardNatural,
  childCount,
  fixedHeight,
}: {
  available: number | null;
  cardNatural: number | null | undefined;
  childCount: number;
  fixedHeight: number;
}): PlayerColumnFit {
  if (available === null) {
    return { cardFill: null, scrolls: false };
  }
  const room = available - fixedHeight - PLAYER_COLUMN_GAP * Math.max(0, childCount - 1);
  if (cardNatural === undefined) {
    return { cardFill: null, scrolls: room < 0 };
  }
  if (cardNatural === null || cardNatural <= room) {
    return { cardFill: null, scrolls: false };
  }
  if (room >= AYAH_CARD_MIN_HEIGHT) {
    return { cardFill: room, scrolls: false };
  }
  if (room >= 0) {
    return { cardFill: room, scrolls: true };
  }
  return { cardFill: null, scrolls: true };
}
