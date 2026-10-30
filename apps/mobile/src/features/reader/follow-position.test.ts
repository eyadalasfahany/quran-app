import { capWordScrollStep, followedTextScreenTop, isPlausibleScreenTop, rowContentTop } from './follow-position';

describe('rowContentTop', () => {
  it('adds the first item offset to the layout y, which excludes it', () => {
    expect(rowContentTop(1200, 0)).toBe(1200);
    expect(rowContentTop(1200, 36)).toBe(1236);
  });
});

describe('followedTextScreenTop', () => {
  it('is the row top plus the text offset inside the row, minus the scroll', () => {
    // Row 3 starts at 1000 in content (layout y 964 plus a 36 first item offset); the text sits 40 down the row;
    // the list has scrolled 900. The text's top is at 1000 + 40 - 900 = 140 on screen.
    expect(followedTextScreenTop({ rowTop: rowContentTop(964, 36), scrollOffset: 900, textTopInRow: 40 })).toBe(140);
  });

  it('is right at a non-zero scroll with no first item offset', () => {
    expect(followedTextScreenTop({ rowTop: rowContentTop(2000, 0), scrollOffset: 1800, textTopInRow: 16 })).toBe(216);
  });

  it('is the text offset alone for a Text that is the scroll content child at the top', () => {
    expect(followedTextScreenTop({ rowTop: 0, scrollOffset: 0, textTopInRow: 120 })).toBe(120);
  });
});

describe('isPlausibleScreenTop', () => {
  it('accepts tops from one viewport above to two below the viewport', () => {
    expect(isPlausibleScreenTop(-844, 844)).toBe(true);
    expect(isPlausibleScreenTop(1688, 844)).toBe(true);
  });

  it('rejects a stale top beyond that range', () => {
    expect(isPlausibleScreenTop(-845, 844)).toBe(false);
    expect(isPlausibleScreenTop(1689, 844)).toBe(false);
    expect(isPlausibleScreenTop(250000, 844)).toBe(false);
  });
});

describe('capWordScrollStep', () => {
  it('passes a step within one viewport height', () => {
    expect(capWordScrollStep(300, 600)).toBe(300);
    expect(capWordScrollStep(-200, 600)).toBe(-200);
  });

  it('caps a larger step at one viewport height, either way', () => {
    expect(capWordScrollStep(5000, 600)).toBe(600);
    expect(capWordScrollStep(-5000, 600)).toBe(-600);
  });
});
