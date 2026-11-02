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
  it('changes with the Quran font, so rows measured in one font are not reused for another', () => {
    const amiri = heightCacheSignature(390, 1, 'reading', 'amiriQuran');
    expect(heightCacheSignature(390, 1, 'reading', 'scheherazadeNew')).not.toBe(amiri);
    expect(heightCacheSignature(390, 1, 'reading', 'amiriQuran')).toBe(amiri);
  });
});
