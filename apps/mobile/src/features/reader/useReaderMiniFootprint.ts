import {
  MINI_PLAYER_CAPSULE,
  MINI_PLAYER_CAPSULE_FOOTPRINT,
  MINI_PLAYER_METRICS,
  MINI_PLAYER_READER_BOTTOM,
  MINI_PLAYER_READER_FOOTPRINT,
} from '@/features/audio/mini-player-metrics';
import { useMiniPlayerVisible } from '@/features/audio/hooks/useMiniPlayerVisible';

import { useReaderMiniCollapse } from './mini-bar-collapse';
import { useReaderSettings } from './settings';

// The one source for where the reader's mini element sits and what the reader clears for it. The dock, the resume
// pill and the lists' content insets all read it, so they can't disagree.
export type ReaderMiniFootprint = {
  /** Whether the bar or the capsule is drawn: the shared visibility rule, in Reading and Mushaf only. */
  shown: boolean;
  collapsed: boolean;
  /** Bottom edge above the safe area. */
  bottom: number;
  /** Height of the element's box. 0 when hidden. */
  height: number;
  /** The bottom content inset the lists take. 0 when hidden. */
  footprint: number;
};

export function readerMiniFootprint(shown: boolean, collapsed: boolean): ReaderMiniFootprint {
  if (!shown) {
    return { bottom: MINI_PLAYER_READER_BOTTOM, collapsed, footprint: 0, height: 0, shown: false };
  }
  if (collapsed) {
    return {
      bottom: MINI_PLAYER_CAPSULE.bottom,
      collapsed,
      footprint: MINI_PLAYER_CAPSULE_FOOTPRINT,
      height: MINI_PLAYER_CAPSULE.hitHeight,
      shown: true,
    };
  }
  return {
    bottom: MINI_PLAYER_READER_BOTTOM,
    collapsed,
    footprint: MINI_PLAYER_READER_FOOTPRINT,
    height: MINI_PLAYER_METRICS.reader.height,
    shown: true,
  };
}

export function useReaderMiniFootprint(): ReaderMiniFootprint {
  const mode = useReaderSettings((state) => state.mode);
  const collapsed = useReaderMiniCollapse((state) => state.collapsed);
  const visible = useMiniPlayerVisible('reader');
  return readerMiniFootprint(visible && (mode === 'reading' || mode === 'mushaf'), collapsed);
}
