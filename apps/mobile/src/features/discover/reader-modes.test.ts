import { READER_MODES } from '@/features/reader/anchor/reading-anchor';

import { discoverIdForMode } from './reader-modes';
import { DISCOVER_IDS } from './registry';

describe('discoverIdForMode', () => {
  it('maps each reader mode to its own Discover row', () => {
    expect(discoverIdForMode('mushaf')).toBe('reader.mushaf');
    expect(discoverIdForMode('reading')).toBe('reader.reading');
    expect(discoverIdForMode('focus')).toBe('reader.focus');
  });

  it('maps every reader mode to a registry id', () => {
    for (const mode of READER_MODES) {
      expect(DISCOVER_IDS).toContain(discoverIdForMode(mode));
    }
  });
});
