import { size } from '@quran/design-tokens';

import { estimateReadingRowHeight, heightCacheSignature, READING_ROW_ESTIMATE } from './reading-heights';

describe('estimateReadingRowHeight', () => {
  it('adds the 44 pt ayah header row to the Reading row estimate', () => {
    expect(READING_ROW_ESTIMATE).toBe(160 + size.touchTarget);
    expect(estimateReadingRowHeight('reading', 800)).toBe(204);
  });

  it('estimates a Focus row as the whole viewport', () => {
    expect(estimateReadingRowHeight('focus', 800)).toBe(800);
  });
});

describe('heightCacheSignature', () => {
  it('is stable for the same layout and changes with width, font scale and mode', () => {
    const base = heightCacheSignature(390, 1, 'reading');
    expect(heightCacheSignature(390, 1, 'reading')).toBe(base);
    expect(heightCacheSignature(360, 1, 'reading')).not.toBe(base);
    expect(heightCacheSignature(390, 1.2, 'reading')).not.toBe(base);
    expect(heightCacheSignature(390, 1, 'focus')).not.toBe(base);
  });
});
