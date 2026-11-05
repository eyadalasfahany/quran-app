import { MINI_PLAYER_NOTICE_HEIGHT, MINI_PLAYER_TABS_FOOTPRINT } from '@/features/audio/mini-player-metrics';
import { useMiniPlayerVisible } from '@/features/audio/hooks/useMiniPlayerVisible';
import { useSkipNoticeShown } from '@/features/audio/skip-notice';

import { useTabBarClearance } from './useTabBarClearance';

// The bottom padding of a tab screen's scroll content: the bar's clearance, plus the tabs mini player while it
// shows. Every tab screen that scrolls reads this one value, so none can sit under the bar or the mini player.
// While the skip notice shows (ADR 0062) the mini player is taller by its line, and the padding takes that too.
export function useTabContentBottom(): number {
  const clearance = useTabBarClearance();
  const miniShown = useMiniPlayerVisible('tabs');
  const noticeShown = useSkipNoticeShown();
  return clearance + (miniShown ? MINI_PLAYER_TABS_FOOTPRINT + (noticeShown ? MINI_PLAYER_NOTICE_HEIGHT : 0) : 0);
}
