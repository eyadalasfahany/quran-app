import { MUSHAF_PAGE_MAX } from '@/features/reader/layout';

import {
  MUSHAF_FRAME_SIDE,
  pageHeightFor,
  pageItemHeight,
  pageWidthFor,
  PAGE_VIEWBOX,
  scaleFor,
  toPage,
  toScreen,
} from './page-layout';

describe('pageWidthFor', () => {
  it('takes the gutters and both frame sides off a 390 window', () => {
    // 2 × 16 gutters plus 2 × (6 + 1.5 + 10 + 0.75) of frame: the artwork box is 321.5 wide, the frame's own width.
    expect(pageWidthFor(390, 2 * 16 + 2 * MUSHAF_FRAME_SIDE)).toBeCloseTo(358, 5);
  });

  it('caps the width at 600 on a wide window', () => {
    expect(pageWidthFor(1024, 2 * 16 + 2 * MUSHAF_FRAME_SIDE)).toBe(MUSHAF_PAGE_MAX);
  });

  it('never goes below 0', () => {
    expect(pageWidthFor(20, 100)).toBe(0);
  });
});

describe('page heights and scale', () => {
  it('follows the 345 × 550 box', () => {
    expect(PAGE_VIEWBOX).toEqual({ height: 550, width: 345 });
    expect(pageHeightFor(345)).toBe(550);
    expect(pageHeightFor(321.5)).toBeCloseTo((321.5 * 550) / 345, 9);
    expect(scaleFor(690)).toBe(2);
  });

  it('adds the framed page and its divider to the item height', () => {
    expect(pageItemHeight(345, 0)).toBe(550 + 2 * MUSHAF_FRAME_SIDE);
    expect(pageItemHeight(345, 30)).toBe(550 + 2 * MUSHAF_FRAME_SIDE + 30);
  });
});

describe('round trips', () => {
  it('maps a point to page units and back', () => {
    const width = 321.5;
    const page = toPage({ x: 160.75, y: 256.25 }, width);
    expect(page.x).toBeCloseTo(172.5, 9);
    expect(page.y).toBeCloseTo((256.25 * 345) / 321.5, 9);
    const screen = toScreen({ x0: 0, x1: 345, y0: 0, y1: 550 }, width);
    expect(screen.x1).toBeCloseTo(width, 9);
    expect(screen.y1).toBeCloseTo(pageHeightFor(width), 9);
  });
});
