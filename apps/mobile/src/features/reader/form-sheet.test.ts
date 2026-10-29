import { DETENT_DISTANCE_RATIO, DETENT_VELOCITY, SHEET_MARGIN, nextDetent, sheetDetents, sheetScreenOptions, sheetShapeFor } from './form-sheet';

// 844 × 47 (the 390 × 844 frame with its 47 pt safe area): full 55, mid 422, closed 844.
const phone = sheetDetents(844, 47);

describe('sheetDetents', () => {
  it('puts full under the safe area plus the card margin, mid at half the window, closed off the bottom', () => {
    expect(phone).toEqual({ closed: 844, full: 47 + SHEET_MARGIN, mid: 422 });
    expect(phone.full).toBe(55);
    expect(phone.mid).toBe(422);
    expect(phone.closed).toBe(844);
  });

  it('uses the phone frame when the window height is unknown', () => {
    expect(sheetDetents(0, 47)).toEqual(phone);
  });

  it('clamps mid to full in a window too short for half to clear the safe area', () => {
    const short = sheetDetents(100, 47);
    expect(short.full).toBe(55);
    expect(short.mid).toBe(55);
    expect(short.closed).toBe(100);
  });

  it('keeps full below a large safe area and moves mid with it only when it is taller', () => {
    const large = sheetDetents(844, 100);
    expect(large.full).toBe(108);
    expect(large.mid).toBe(422);
  });
});

describe('nextDetent', () => {
  describe('from mid, dragging down', () => {
    // The distance from mid to closed is 422, so the threshold is 105.5.
    it('stays just below 25% of the way to closed', () => {
      expect(nextDetent('mid', 105, 0, phone)).toBe('mid');
    });

    it('goes to closed at 25%', () => {
      expect(nextDetent('mid', 422 * DETENT_DISTANCE_RATIO, 0, phone)).toBe('closed');
    });

    it('goes to closed past 25%', () => {
      expect(nextDetent('mid', 106, 0, phone)).toBe('closed');
    });
  });

  describe('from mid, dragging up', () => {
    // The distance from mid to full is 367, so the threshold is 91.75.
    it('stays just below 25% of the way to full', () => {
      expect(nextDetent('mid', -91, 0, phone)).toBe('mid');
    });

    it('goes to full at 25%', () => {
      expect(nextDetent('mid', -367 * DETENT_DISTANCE_RATIO, 0, phone)).toBe('full');
    });
  });

  describe('from full, dragging down', () => {
    // The distance from full to mid is 367, so the threshold is 91.75.
    it('stays just below 25% of the way to mid', () => {
      expect(nextDetent('full', 91, 0, phone)).toBe('full');
    });

    it('goes to mid at 25% and past it', () => {
      expect(nextDetent('full', 92, 0, phone)).toBe('mid');
      expect(nextDetent('full', 367 * DETENT_DISTANCE_RATIO, 0, phone)).toBe('mid');
    });
  });

  it('never skips a detent: a long drag down from full stops at mid', () => {
    expect(nextDetent('full', 1000, 0, phone)).toBe('mid');
  });

  it('stays at full when dragged up from full', () => {
    expect(nextDetent('full', -500, 0, phone)).toBe('full');
    expect(nextDetent('full', -500, -5000, phone)).toBe('full');
  });

  it('stays put for a drag of no distance and no velocity', () => {
    expect(nextDetent('mid', 0, 0, phone)).toBe('mid');
    expect(nextDetent('full', 0, 0, phone)).toBe('full');
  });

  describe('flicks above the velocity threshold', () => {
    it('moves one detent down on a fast downward flick, without any distance', () => {
      expect(nextDetent('mid', 0, DETENT_VELOCITY + 1, phone)).toBe('closed');
      expect(nextDetent('full', 0, DETENT_VELOCITY + 1, phone)).toBe('mid');
    });

    it('moves one detent up on a fast upward flick', () => {
      expect(nextDetent('mid', 0, -(DETENT_VELOCITY + 1), phone)).toBe('full');
    });

    it('lets velocity override a drag in the other direction', () => {
      expect(nextDetent('mid', -300, DETENT_VELOCITY + 1, phone)).toBe('closed');
      expect(nextDetent('mid', 300, -(DETENT_VELOCITY + 1), phone)).toBe('full');
    });

    it('does not count a velocity at exactly the threshold as a flick', () => {
      expect(nextDetent('mid', 0, DETENT_VELOCITY, phone)).toBe('mid');
      expect(nextDetent('mid', 0, -DETENT_VELOCITY, phone)).toBe('mid');
    });

    it('stays at full on a fast upward flick, and at closed on a fast downward one', () => {
      expect(nextDetent('full', 0, -5000, phone)).toBe('full');
      expect(nextDetent('closed', 0, 5000, phone)).toBe('closed');
    });
  });

  it('returns closed for a sheet that is already closed', () => {
    expect(nextDetent('closed', -500, -5000, phone)).toBe('closed');
  });

  describe('a window where mid and full are the same position', () => {
    const tiny = sheetDetents(60, 47);

    it('stays at mid when dragged up from mid', () => {
      expect(tiny.mid).toBe(tiny.full);
      expect(nextDetent('mid', -100, 0, tiny)).toBe('mid');
    });

    it('goes toward closed when dragged down from mid', () => {
      expect(nextDetent('mid', 10, 0, tiny)).toBe('closed');
    });

    it('passes over the same-position mid when dragged down from full', () => {
      expect(nextDetent('full', 10, 0, tiny)).toBe('closed');
    });
  });
});

describe('sheet presentation', () => {
  it('shows the card as an inset card for actions and a full-width sheet for tafsir', () => {
    expect(sheetShapeFor('actions')).toBe('card');
    expect(sheetShapeFor('tafsir')).toBe('full');
  });

  it('lays over the screen behind it, with no native animation or swipe, so the card owns the motion', () => {
    expect(sheetScreenOptions.presentation).toBe('transparentModal');
    expect(sheetScreenOptions.animation).toBe('none');
    expect(sheetScreenOptions.gestureEnabled).toBe(false);
    expect(sheetScreenOptions.headerShown).toBe(false);
    expect(sheetScreenOptions.contentStyle.backgroundColor).toBe('transparent');
  });
});
