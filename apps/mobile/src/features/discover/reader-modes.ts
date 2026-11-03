import type { ReaderMode } from '@/features/reader/anchor/reading-anchor';

import type { DiscoverId } from './registry';

const MODE_IDS: Record<ReaderMode, DiscoverId> = {
  mushaf: 'reader.mushaf',
  reading: 'reader.reading',
  focus: 'reader.focus',
};

/** The Discover row a reader mode ticks (ADR 0053). */
export function discoverIdForMode(mode: ReaderMode): DiscoverId {
  return MODE_IDS[mode];
}
