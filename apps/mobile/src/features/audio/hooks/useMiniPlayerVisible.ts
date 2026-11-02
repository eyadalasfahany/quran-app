import { useWindowClass } from '@/core/layout/useWindowClass';

import { useHasCurrentAyah } from '@/features/reader/anchor/useHasCurrentAyah';
import type { MiniPlayerVariant } from '../mini-player-metrics';
import { usePlayerStore } from '../playerStore';
import { useIdleReciter } from './useIdleReciter';

// The bar shows once something has loaded. While idle, the reader bar shows when a reciter resolves; the tabs and
// sidebar bars show the same way once a current ayah has been saved (ADR 0046), so a fresh install shows no bar.
// Tabs and the reader bar are hidden on an expanded window; the sidebar footer shows only there.
export function useMiniPlayerVisible(variant: MiniPlayerVariant): boolean {
  const status = usePlayerStore((state) => state.status);
  const windowClass = useWindowClass();
  const loaded = status !== 'idle';
  const idleReciter = useIdleReciter(!loaded) !== null;
  const hasCurrentAyah = useHasCurrentAyah();

  if (variant === 'sidebar') {
    return windowClass === 'expanded' && (loaded || (hasCurrentAyah && idleReciter));
  }
  if (variant === 'reader') {
    return (loaded || idleReciter) && windowClass !== 'expanded';
  }
  return windowClass !== 'expanded' && (loaded || (hasCurrentAyah && idleReciter));
}
