import { useWindowClass } from '@/core/layout/useWindowClass';

import type { MiniPlayerVariant } from '../mini-player-metrics';
import { usePlayerStore } from '../playerStore';
import { useIdleReciter } from './useIdleReciter';

/**
 * Whether the mini player is drawn for a variant (ADR 0059, amending ADR 0046 §2 and ADR 0051).
 *
 * - `reader`: the reader's own bar shows once a surah is loaded, or while idle when a reciter resolves (ADR 0024).
 *   It stays off the expanded window, where the reader shows its docked panel instead.
 * - `tabs`: the bar in the tab bar or rail slot shows only while audio plays or loads. Loading counts as playing, so
 *   the buffering ring shows on every play (ADR 0046 decision 4). Paused, idle and error hide it, on every window
 *   class. Outside the reader the lock screen and Control Center are the controls.
 */
export function useMiniPlayerVisible(variant: MiniPlayerVariant): boolean {
  const status = usePlayerStore((state) => state.status);
  const windowClass = useWindowClass();
  const loaded = status !== 'idle';
  const idleReciter = useIdleReciter(!loaded) !== null;

  if (variant === 'reader') {
    return (loaded || idleReciter) && windowClass !== 'expanded';
  }
  return status === 'loading' || status === 'playing';
}
