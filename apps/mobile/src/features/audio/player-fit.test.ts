import { ARTWORK_MAX, AYAH_CARD_MIN_HEIGHT, PLAYER_COLUMN_GAP, fitPlayerColumn } from './player-fit';

// The fixed parts on an iPhone 17 frame: header, title, progress, transport and options.
const fixedHeight = 298;
const fixedCount = 5;

describe('fitPlayerColumn', () => {
  it('keeps the two-line minimum at two lines of glyphs, not two full line boxes', () => {
    expect(AYAH_CARD_MIN_HEIGHT).toBeCloseTo(145.75, 2);
    expect(PLAYER_COLUMN_GAP).toBe(20);
  });

  it('shows the full artwork and no card height until the window is measured', () => {
    expect(fitPlayerColumn({ available: null, fixedCount, fixedHeight: 900, hasCard: true })).toEqual({
      artworkSize: ARTWORK_MAX,
      cardHeight: null,
      scrolls: false,
    });
  });

  it('gives an iPhone 17 a 189 pt artwork and a 171 pt card, with no scroll', () => {
    // 778 - 298 - 6 gaps of 20 = 360 pt shared: the card takes 22% (171), the artwork the rest (189).
    const fit = fitPlayerColumn({ available: 778, fixedCount, fixedHeight, hasCard: true });

    expect(fit.artworkSize).toBeCloseTo(189, 5);
    expect(fit.cardHeight).toBe(171);
    expect(fit.scrolls).toBe(false);
  });

  it('hides the artwork on an iPhone SE, and the card fills the room the artwork freed', () => {
    // 585 - 298 - 120 = 167 pt: the artwork would be 21 pt, below its minimum, so it is hidden and the card fills 187 pt.
    expect(fitPlayerColumn({ available: 585, fixedCount, fixedHeight, hasCard: true })).toEqual({
      artworkSize: null,
      cardHeight: 187,
      scrolls: false,
    });
  });

  it('keeps the full artwork on a tall iPad and caps the card at 40% of the window', () => {
    // 1284 - 298 - 120 = 866 pt: the card's 22% target is 282, the artwork is 220, and the card's 40% cap is 514.
    expect(fitPlayerColumn({ available: 1284, fixedCount, fixedHeight, hasCard: true })).toEqual({
      artworkSize: 220,
      cardHeight: 514,
      scrolls: false,
    });
  });

  it('shows the artwork at its largest size with no card, and hides it when the room is below its minimum', () => {
    expect(fitPlayerColumn({ available: 778, fixedCount, fixedHeight, hasCard: false })).toEqual({
      artworkSize: 220,
      cardHeight: null,
      scrolls: false,
    });
    expect(fitPlayerColumn({ available: 778, fixedCount, fixedHeight: 700, hasCard: false })).toEqual({
      artworkSize: null,
      cardHeight: null,
      scrolls: true,
    });
  });

  it('hides the artwork without a scroll while the fixed parts still fit', () => {
    // 778 - 600 - 100 = 78 pt of room: below the artwork's minimum, so it is hidden, and the column still fits.
    expect(fitPlayerColumn({ available: 778, fixedCount, fixedHeight: 600, hasCard: false })).toEqual({
      artworkSize: null,
      cardHeight: null,
      scrolls: false,
    });
  });

  it('scrolls only as a last resort, with the minimum card, when even the card cannot fit', () => {
    expect(fitPlayerColumn({ available: 778, fixedCount, fixedHeight: 700, hasCard: true })).toEqual({
      artworkSize: null,
      cardHeight: AYAH_CARD_MIN_HEIGHT,
      scrolls: true,
    });
  });

  it('never lets the artwork, the card and the gaps overflow a window that does not scroll', () => {
    for (const available of [400, 585, 650, 778, 900, 1024, 1284]) {
      for (const hasCard of [true, false]) {
        for (const height of [200, 298, 380, 420]) {
          const fit = fitPlayerColumn({ available, fixedCount, fixedHeight: height, hasCard });
          if (fit.scrolls) {
            continue;
          }
          const children = fixedCount + (hasCard ? 1 : 0) + (fit.artworkSize === null ? 0 : 1);
          const used =
            height +
            (fit.artworkSize ?? 0) +
            (fit.cardHeight ?? 0) +
            PLAYER_COLUMN_GAP * (children - 1);
          expect(used).toBeLessThanOrEqual(available);
        }
      }
    }
  });
});
