import { clampMushafZoom, effectiveZoom, pinchMushafZoom, stepMushafZoom, zoomAvailable } from './mushaf-zoom';

describe('clampMushafZoom (settings)', () => {
  it('reads a missing or non-numeric value as 1', () => {
    expect(clampMushafZoom(undefined)).toBe(1);
    expect(clampMushafZoom(null)).toBe(1);
    expect(clampMushafZoom('1.5')).toBe(1);
    expect(clampMushafZoom(Number.NaN)).toBe(1);
  });

  it('snaps to 25% steps', () => {
    expect(clampMushafZoom(1.37)).toBe(1.25);
    expect(clampMushafZoom(1.4)).toBe(1.5);
    expect(clampMushafZoom(1.75)).toBe(1.75);
  });

  it('clamps to [1, 3]', () => {
    expect(clampMushafZoom(4)).toBe(3);
    expect(clampMushafZoom(0.5)).toBe(1);
    expect(clampMushafZoom(-4)).toBe(1);
  });
});

describe('pinchMushafZoom', () => {
  it('multiplies the start by the pinch and snaps', () => {
    expect(pinchMushafZoom(1, 1.3)).toBe(1.25);
    expect(pinchMushafZoom(1.5, 1.2)).toBe(1.75);
  });

  it('holds at the limits', () => {
    expect(pinchMushafZoom(1, 0.4)).toBe(1);
    expect(pinchMushafZoom(2, 3)).toBe(3);
  });
});

describe('stepMushafZoom', () => {
  it('steps by 25% each way and stops at the limits', () => {
    expect(stepMushafZoom(1, 1)).toBe(1.25);
    expect(stepMushafZoom(1.25, -1)).toBe(1);
    expect(stepMushafZoom(1, -1)).toBe(1);
    expect(stepMushafZoom(2, 1)).toBe(2.25);
    expect(stepMushafZoom(3, 1)).toBe(3);
  });
});

describe('zoomAvailable', () => {
  it('needs both word boxes and contours', () => {
    expect(zoomAvailable({ hasWordBoxes: true, hasWordContours: true })).toBe(true);
    expect(zoomAvailable({ hasWordBoxes: true, hasWordContours: false })).toBe(false);
    expect(zoomAvailable({ hasWordBoxes: false, hasWordContours: true })).toBe(false);
    expect(zoomAvailable(null)).toBe(false);
  });
});

describe('effectiveZoom', () => {
  it('keeps the stored zoom when available and draws 100% when not', () => {
    expect(effectiveZoom(1.5, true)).toBe(1.5);
    expect(effectiveZoom(1.5, false)).toBe(1);
  });
});
