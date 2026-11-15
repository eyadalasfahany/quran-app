import type { WordBox } from '@/core/mushaf-pack';

import { pillMove, pillRectFor, PILL_PAD_X, PILL_PAD_Y } from './word-pill-rect';

const box = (overrides: Partial<WordBox> = {}): WordBox => ({
  ayah: 1,
  line: 1,
  position: 1,
  surah: 1,
  x0: 10,
  x1: 30,
  y0: 20,
  y1: 40,
  ...overrides,
});

describe('pillRectFor', () => {
  it('is the word box inflated by the pill padding', () => {
    expect(pillRectFor(box())).toEqual({
      h: 20 + 2 * PILL_PAD_Y,
      w: 20 + 2 * PILL_PAD_X,
      x: 10 - PILL_PAD_X,
      y: 20 - PILL_PAD_Y,
    });
  });
});

describe('pillMove', () => {
  it('slides to the next word on the same line', () => {
    expect(pillMove(box({ position: 1 }), box({ position: 2 }))).toBe('slide');
  });

  it('jumps on a new line, from nothing, or to nothing', () => {
    expect(pillMove(box({ line: 1 }), box({ line: 2, position: 2 }))).toBe('jump');
    expect(pillMove(null, box())).toBe('jump');
    expect(pillMove(box(), null)).toBe('jump');
    expect(pillMove(null, null)).toBe('jump');
  });
});
