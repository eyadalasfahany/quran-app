import { ayahFollowTarget } from './ayah-follow';

// Two-line text: the first line is 'a b ' (offsets 0 to 3), the second 'c d' (4 to 6) and the third 'e f' (7 to 9).
const lines = [
  { height: 50, text: 'a b ', y: 0 },
  { height: 50, text: 'c d', y: 50 },
  { height: 50, text: 'e f', y: 250 },
];
// A 300 pt viewport keeps its middle 60% (60 to 240) in the comfort band.
const viewportHeight = 300;

describe('ayahFollowTarget', () => {
  it('scrolls a line below the band so that it sits a third down the viewport', () => {
    expect(ayahFollowTarget({ lines, offset: 7, scrollOffset: 0, viewportHeight })).toBe(150);
  });

  it('does not scroll a line that is already inside the band', () => {
    expect(ayahFollowTarget({ lines, offset: 7, scrollOffset: 100, viewportHeight })).toBeNull();
  });

  it('reaches the same target from any scroll offset, since the line is measured on screen', () => {
    expect(ayahFollowTarget({ lines, offset: 7, scrollOffset: 200, viewportHeight })).toBe(150);
  });

  it('never scrolls above the top of the card', () => {
    const top = [{ height: 50, text: 'a', y: 20 }];
    expect(ayahFollowTarget({ lines: top, offset: 0, scrollOffset: 100, viewportHeight })).toBe(0);
  });

  it('does nothing when the offset is past the text', () => {
    expect(ayahFollowTarget({ lines, offset: 99, scrollOffset: 0, viewportHeight })).toBeNull();
    expect(ayahFollowTarget({ lines: [], offset: 0, scrollOffset: 0, viewportHeight })).toBeNull();
  });
});
