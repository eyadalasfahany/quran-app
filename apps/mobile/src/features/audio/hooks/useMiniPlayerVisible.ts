import { useWindowClass } from '@/core/layout/useWindowClass';

import { useHasCurrentAyah } from '@/features/reader/anchor/useHasCurrentAyah';
import type { MiniPlayerVariant } from '../mini-player-metrics';
import { usePlayerStore } from '../playerStore';
import { useIdleReciter } from './useIdleReciter';

// Whether a mini player bar shows. The bar and everything that makes room for it (list insets, the resume
// pill) read this one rule, so they can't disagree. The bar shows once something has loaded. While idle, the reader
// bar shows when a reciter resolves; the tabs bar shows the same way once a current ayah has been saved (ADR 0046),
// so a fresh install shows no bar. `tabs` shows on every window, tablets included, as it does on a phone (ADR 0051).
// `reader` is a phone and medium placement, hidden on expanded windows, where the reader's own panel takes over. The
// reader adds its own mode check (Reading and Mushaf only).
export function useMiniPlayerVisible(variant: MiniPlayerVariant): boolean {
  const status = usePlayerStore((state) => state.status);
  const windowClass = useWindowClass();
  const loaded = status !== 'idle';
  const idleReciter = useIdleReciter(!loaded) !== null;
  const hasCurrentAyah = useHasCurrentAyah();

  if (variant === 'reader') {
    return (loaded || idleReciter) && windowClass !== 'expanded';
  }
  return loaded || (hasCurrentAyah && idleReciter);
}
