import { AYAH_CARD_MIN_HEIGHT, PLAYER_COLUMN_GAP, fitPlayerColumn } from './player-fit';

// The iPhone 17 frame: 844 pt less the 52 pt top and 30 pt bottom padding, six fixed parts and the card.
const available = 762;
const sevenChildren = 7;

describe('fitPlayerColumn', () => {
  it('keeps the two-line minimum at two lines of glyphs, not two full line boxes', () => {
    expect(AYAH_CARD_MIN_HEIGHT).toBeCloseTo(145.75, 2);
    expect(PLAYER_COLUMN_GAP).toBe(20);
  });

  it('does not scroll and fills nothing until the window is measured', () => {
    expect(fitPlayerColumn({ available: null, cardNatural: 900, childCount: sevenChildren, fixedHeight: 900 })).toEqual({
      cardFill: null,
      scrolls: false,
    });
  });

  it('keeps a card that fits at its natural height, so the column distributes as the frame draws it', () => {
    expect(fitPlayerColumn({ available, cardNatural: 110, childCount: sevenChildren, fixedHeight: 494 })).toEqual({
      cardFill: null,
      scrolls: false,
    });
  });

  it('keeps the card natural until its height is measured', () => {
    expect(fitPlayerColumn({ available, cardNatural: null, childCount: sevenChildren, fixedHeight: 494 })).toEqual({
      cardFill: null,
      scrolls: false,
    });
  });

  it('fills the room left after the fixed parts when a long card does not fit, and does not scroll', () => {
    // 762 - 494 - 120 = 148 pt of room, which holds the two-line minimum.
    expect(fitPlayerColumn({ available, cardNatural: 400, childCount: sevenChildren, fixedHeight: 494 })).toEqual({
      cardFill: 148,
      scrolls: false,
    });
  });

  it('scrolls the few points the minimum overflows when the room is below two lines', () => {
    expect(fitPlayerColumn({ available, cardNatural: 400, childCount: sevenChildren, fixedHeight: 540 })).toEqual({
      cardFill: 102,
      scrolls: true,
    });
  });

  it('falls back to the whole column scrolling when the fixed parts alone overflow', () => {
    expect(fitPlayerColumn({ available, cardNatural: 400, childCount: sevenChildren, fixedHeight: 700 })).toEqual({
      cardFill: null,
      scrolls: true,
    });
  });

  it('scrolls the column without a card only when its parts overflow', () => {
    expect(fitPlayerColumn({ available, cardNatural: undefined, childCount: 6, fixedHeight: 600 })).toEqual({
      cardFill: null,
      scrolls: false,
    });
    expect(fitPlayerColumn({ available, cardNatural: undefined, childCount: 6, fixedHeight: 700 })).toEqual({
      cardFill: null,
      scrolls: true,
    });
  });
});
