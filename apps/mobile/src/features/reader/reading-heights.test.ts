import { size } from '@quran/design-tokens';

import { estimateReadingRowHeight, READING_ROW_ESTIMATE } from './reading-heights';

describe('estimateReadingRowHeight', () => {
  it('adds the 44 pt ayah header row to the Reading row estimate', () => {
    expect(READING_ROW_ESTIMATE).toBe(160 + size.touchTarget);
    expect(estimateReadingRowHeight('reading', 800)).toBe(204);
  });

  it('estimates a Focus row as the whole viewport', () => {
    expect(estimateReadingRowHeight('focus', 800)).toBe(800);
  });
});
