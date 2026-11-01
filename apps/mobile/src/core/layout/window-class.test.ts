import {
  isShortWindowHeight,
  nextWindowClass,
  widthClassFor,
  windowClassFor,
  WINDOW_SHORT_HEIGHT,
} from './window-class';

describe('windowClassFor (ADR 0036)', () => {
  it.each<[number, number, string]>([
    // A landscape phone is short, so it stays compact even when it is wide.
    [844, 390, 'compact'],
    [956, 440, 'compact'],
    [1024, 479, 'compact'],
    // Wide and not short: the sidebar's windows.
    [1024, 480, 'expanded'],
    [1024, 768, 'expanded'],
    [1366, 1024, 'expanded'],
    // Tall windows follow the width alone.
    [700, 1000, 'medium'],
    [390, 844, 'compact'],
    [599, 844, 'compact'],
    [600, 844, 'medium'],
    [839, 844, 'medium'],
    [840, 844, 'expanded'],
  ])('at %i by %i resolves to %s', (width, height, expected) => {
    expect(windowClassFor(width, height)).toBe(expected);
  });

  it('treats an unknown height (0) as not short, so the width decides', () => {
    expect(windowClassFor(1024, 0)).toBe('expanded');
  });
});

describe('isShortWindowHeight', () => {
  it('is short from 1 to 479 pt and not short at 480', () => {
    expect(WINDOW_SHORT_HEIGHT).toBe(480);
    expect(isShortWindowHeight(479)).toBe(true);
    expect(isShortWindowHeight(480)).toBe(false);
    expect(isShortWindowHeight(1)).toBe(true);
  });

  it('is not short when the height is unknown', () => {
    expect(isShortWindowHeight(0)).toBe(false);
  });
});

describe('widthClassFor', () => {
  it('ignores height: a landscape phone is wide', () => {
    expect(widthClassFor(844)).toBe('expanded');
    expect(widthClassFor(700)).toBe('medium');
    expect(widthClassFor(390)).toBe('compact');
  });
});

describe('nextWindowClass keeps the width hysteresis', () => {
  it('still holds a class at a boundary by 16', () => {
    expect(nextWindowClass(824, 'expanded')).toBe('expanded');
    expect(nextWindowClass(823, 'expanded')).toBe('medium');
  });
});
