import { DETENT_VELOCITY } from './form-sheet';
import { COLLAPSE_DISTANCE_RATIO, EXPAND_DISTANCE_RATIO, shouldCollapse, shouldExpand } from './mini-bar-release';

const BAR_HEIGHT = 68;

describe('shouldCollapse', () => {
  it('collapses once a drag down passes half the bar height', () => {
    expect(COLLAPSE_DISTANCE_RATIO).toBe(0.5);
    expect(shouldCollapse(BAR_HEIGHT / 2 + 1, 0, BAR_HEIGHT)).toBe(true);
    expect(shouldCollapse(BAR_HEIGHT / 2, 0, BAR_HEIGHT)).toBe(false);
  });

  it('collapses on a flick faster than 800 pt/s, however short the drag', () => {
    expect(DETENT_VELOCITY).toBe(800);
    expect(shouldCollapse(4, DETENT_VELOCITY + 1, BAR_HEIGHT)).toBe(true);
    expect(shouldCollapse(4, DETENT_VELOCITY, BAR_HEIGHT)).toBe(false);
  });

  it('springs back for a short, slow drag and for an upward drag', () => {
    expect(shouldCollapse(10, 100, BAR_HEIGHT)).toBe(false);
    expect(shouldCollapse(-80, -200, BAR_HEIGHT)).toBe(false);
    expect(shouldCollapse(0, 0, BAR_HEIGHT)).toBe(false);
  });
});

describe('shouldExpand', () => {
  it('expands once a drag up passes half the bar height', () => {
    expect(EXPAND_DISTANCE_RATIO).toBe(0.5);
    expect(shouldExpand(-(BAR_HEIGHT / 2 + 1), 0, BAR_HEIGHT)).toBe(true);
    expect(shouldExpand(-BAR_HEIGHT / 2, 0, BAR_HEIGHT)).toBe(false);
  });

  it('expands on a flick up faster than 800 pt/s', () => {
    expect(shouldExpand(-4, -(DETENT_VELOCITY + 1), BAR_HEIGHT)).toBe(true);
    expect(shouldExpand(-4, -DETENT_VELOCITY, BAR_HEIGHT)).toBe(false);
  });

  it('ignores a drag down', () => {
    expect(shouldExpand(60, 900, BAR_HEIGHT)).toBe(false);
  });
});
