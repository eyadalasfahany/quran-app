import { dismissDistance, dragOffset, shouldDismiss } from './player-dismiss';

const HEIGHT = 1000;

describe('dismissDistance', () => {
  it('is a quarter of the window height', () => {
    expect(dismissDistance(HEIGHT)).toBe(250);
    expect(dismissDistance(844)).toBe(211);
  });
});

describe('shouldDismiss', () => {
  it('closes once the drag passes 25% of the window', () => {
    expect(shouldDismiss(250, 0, HEIGHT)).toBe(true);
    expect(shouldDismiss(600, 0, HEIGHT)).toBe(true);
  });

  it('does not close just short of 25% of the window', () => {
    expect(shouldDismiss(249, 0, HEIGHT)).toBe(false);
    expect(shouldDismiss(100, 0, HEIGHT)).toBe(false);
  });

  it('closes on a downward flick over 800 pt/s, even over a short distance', () => {
    expect(shouldDismiss(20, 801, HEIGHT)).toBe(true);
    expect(shouldDismiss(0, 2000, HEIGHT)).toBe(true);
  });

  it('does not close on a downward velocity of exactly 800 pt/s', () => {
    expect(shouldDismiss(20, 800, HEIGHT)).toBe(false);
  });

  it('springs back for a small, slow drag', () => {
    expect(shouldDismiss(40, 120, HEIGHT)).toBe(false);
  });

  it('never closes on an upward drag, however far or fast', () => {
    expect(shouldDismiss(-500, 0, HEIGHT)).toBe(false);
    expect(shouldDismiss(-500, -2000, HEIGHT)).toBe(false);
    expect(shouldDismiss(0, -900, HEIGHT)).toBe(false);
  });

  it('never closes with no window height and no drag', () => {
    expect(shouldDismiss(0, 0, 0)).toBe(false);
  });
});

describe('dragOffset', () => {
  it('follows a downward drag from where the pan activated', () => {
    expect(dragOffset(0, 10, 60)).toBe(50);
    expect(dragOffset(50, 0, 80)).toBe(130);
  });

  it('holds at the top for an upward drag rather than rising above the window', () => {
    expect(dragOffset(50, 0, -100)).toBe(0);
    expect(dragOffset(0, 0, -30)).toBe(0);
  });
});
