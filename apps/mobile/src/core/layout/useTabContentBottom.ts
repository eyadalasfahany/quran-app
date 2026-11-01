import { MINI_PLAYER_TABS_FOOTPRINT } from '@/features/audio/mini-player-metrics';
import { useMiniPlayerVisible } from '@/features/audio/hooks/useMiniPlayerVisible';

import { useTabBarClearance } from './useTabBarClearance';

// The bottom padding of a tab screen's scroll content: the bar's clearance, plus the tabs mini player while it
// shows. Every tab screen that scrolls reads this one value, so none can sit under the bar or the mini player.
export function useTabContentBottom(): number {
  const clearance = useTabBarClearance();
  const miniShown = useMiniPlayerVisible('tabs');
  return clearance + (miniShown ? MINI_PLAYER_TABS_FOOTPRINT : 0);
}
