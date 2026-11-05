import {
  MINI_PLAYER_CAPSULE,
  MINI_PLAYER_CAPSULE_FOOTPRINT,
  MINI_PLAYER_METRICS,
  MINI_PLAYER_READER_BOTTOM,
  MINI_PLAYER_READER_FOOTPRINT,
  MINI_PLAYER_READER_UNAVAILABLE_FOOTPRINT,
  MINI_PLAYER_NOTICE_HEIGHT,
  MINI_PLAYER_READER_UNAVAILABLE_HEIGHT,
} from '@/features/audio/mini-player-metrics';
import { useMiniPlayerVisible } from '@/features/audio/hooks/useMiniPlayerVisible';
import { useMiniUnavailable } from '@/features/audio/hooks/useMiniUnavailable';
import { useSkipNoticeShown } from '@/features/audio/skip-notice';

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

export function readerMiniFootprint(shown: boolean, collapsed: boolean, unavailable = false, notice = false): ReaderMiniFootprint {
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
  // The unavailable bar is taller than the playing bar, so the lists clear its larger box.
  if (unavailable) {
    return {
      bottom: MINI_PLAYER_READER_BOTTOM,
      collapsed,
      footprint: MINI_PLAYER_READER_UNAVAILABLE_FOOTPRINT,
      height: MINI_PLAYER_READER_UNAVAILABLE_HEIGHT,
      shown: true,
    };
  }
  // The playing bar grows by the skip notice's line while it shows (ADR 0062).
  const noticeHeight = notice ? MINI_PLAYER_NOTICE_HEIGHT : 0;
  return {
    bottom: MINI_PLAYER_READER_BOTTOM,
    collapsed,
    footprint: MINI_PLAYER_READER_FOOTPRINT + noticeHeight,
    height: MINI_PLAYER_METRICS.reader.height + noticeHeight,
    shown: true,
  };
}

export function useReaderMiniFootprint(): ReaderMiniFootprint {
  const mode = useReaderSettings((state) => state.mode);
  const collapsed = useReaderMiniCollapse((state) => state.collapsed);
  const visible = useMiniPlayerVisible('reader');
  const unavailable = useMiniUnavailable() !== null;
  const notice = useSkipNoticeShown();
  return readerMiniFootprint(visible && (mode === 'reading' || mode === 'mushaf'), collapsed, unavailable, notice);
}
