import { AYAH_CARD_ONE_LINE_HEIGHT, PLAYER_COLUMN_GAP, RECITERS_LIST_MIN_HEIGHT, fitPlayerColumn } from './player-fit';

// The fixed parts on an iPhone 17 frame: header 44, title 56, progress 25, transport 76 and options 74 (275 pt).
const fixedHeight = 275;
const fixedCount = 5;
// The iPhone 17 frame's column: 844 pt less the 52 and 30 pt frame padding.
const iPhone17 = 762;

describe('fitPlayerColumn', () => {
  it('keeps the list floor at its label plus two 56 pt rows, and the gap at 20 pt as in the frame', () => {
    expect(RECITERS_LIST_MIN_HEIGHT).toBe(136);
    expect(PLAYER_COLUMN_GAP).toBe(20);
  });

  it('defines the one-line card as one line of text plus the card chrome', () => {
    expect(AYAH_CARD_ONE_LINE_HEIGHT).toBeCloseTo(104.5, 5);
  });

  it('returns no cap before the window is measured', () => {
    expect(fitPlayerColumn({ available: null, fixedCount, fixedHeight: 900, hasCard: true })).toEqual({
      cardMaxHeight: null,
      scrolls: false,
    });
  });

  it('gives an iPhone 17 a 231 pt cap for the card, with no page scroll and the list at its floor', () => {
    // 762 - 275 - 6 gaps of 20 - 136 = 231 pt of room for the card.
    expect(fitPlayerColumn({ available: iPhone17, fixedCount, fixedHeight, hasCard: true })).toEqual({
      cardMaxHeight: 231,
      scrolls: false,
    });
  });

  it('keeps the same cap for a one- or two-line ayah on an iPhone 17: the card is as tall as its text, up to the cap', () => {
    // The fit does not depend on the text: a short card sits at its text height, a long one at the cap.
    const fit = fitPlayerColumn({ available: iPhone17, fixedCount, fixedHeight, hasCard: true });

    expect(fit.scrolls).toBe(false);
    expect(fit.cardMaxHeight).toBeGreaterThan(AYAH_CARD_ONE_LINE_HEIGHT);
  });

  it('allows a page scroll on a very short window (about 330 pt, a landscape phone)', () => {
    // 330 - 82 = 248 pt available: 248 - 275 is negative, so even the fixed parts do not fit and the column scrolls.
    expect(fitPlayerColumn({ available: 248, fixedCount, fixedHeight, hasCard: true })).toEqual({
      cardMaxHeight: AYAH_CARD_ONE_LINE_HEIGHT,
      scrolls: true,
    });
  });

  it('scrolls when the room is below a one-line card, even though the fixed parts fit', () => {
    // 762 - 275 - 120 - 136 = 231; at 600 pt available the room is 69, below the 104.5 pt one-line card.
    expect(fitPlayerColumn({ available: 600, fixedCount, fixedHeight, hasCard: true })).toEqual({
      cardMaxHeight: AYAH_CARD_ONE_LINE_HEIGHT,
      scrolls: true,
    });
  });

  it('never lets the cap fall below a one-line card', () => {
    const fit = fitPlayerColumn({ available: 640, fixedCount, fixedHeight, hasCard: true });

    expect(fit.cardMaxHeight).toBeGreaterThanOrEqual(AYAH_CARD_ONE_LINE_HEIGHT);
  });

  it('without a card, scrolls only when the fixed parts and the list floor do not fit', () => {
    expect(fitPlayerColumn({ available: iPhone17, fixedCount, fixedHeight, hasCard: false })).toEqual({
      cardMaxHeight: null,
      scrolls: false,
    });
    expect(fitPlayerColumn({ available: 500, fixedCount, fixedHeight, hasCard: false })).toEqual({
      cardMaxHeight: null,
      scrolls: true,
    });
  });

  it('lets the card grow with a tall window, with no scroll', () => {
    expect(fitPlayerColumn({ available: 1284, fixedCount, fixedHeight, hasCard: true })).toEqual({
      cardMaxHeight: 1284 - fixedHeight - PLAYER_COLUMN_GAP * 6 - RECITERS_LIST_MIN_HEIGHT,
      scrolls: false,
    });
  });

  it('never lets the card, the list floor and the gaps overflow a window that does not scroll', () => {
    for (const available of [400, 585, 650, 762, 900, 1024, 1284]) {
      for (const hasCard of [true, false]) {
        for (const height of [200, 275, 380, 420]) {
          const fit = fitPlayerColumn({ available, fixedCount, fixedHeight: height, hasCard });
          if (fit.scrolls) {
            continue;
          }
          const children = fixedCount + 1 + (hasCard ? 1 : 0);
          const used = height + (hasCard ? AYAH_CARD_ONE_LINE_HEIGHT : 0) + RECITERS_LIST_MIN_HEIGHT + PLAYER_COLUMN_GAP * (children - 1);
          expect(used).toBeLessThanOrEqual(available);
        }
      }
    }
  });
});
