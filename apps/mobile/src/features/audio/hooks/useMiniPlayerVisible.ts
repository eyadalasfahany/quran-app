import { useWindowClass } from '@/core/layout/useWindowClass';

import type { MiniPlayerVariant } from '../mini-player-metrics';
import { usePlayerStore } from '../playerStore';
import { useIdleReciter } from './useIdleReciter';

// Whether a mini player bar shows. The bar and everything that makes room for it (list insets, the resume
// pill) read this one rule, so they can't disagree. Nothing shows while nothing has loaded, except the reader
// bar: it also shows while idle when a reciter resolves, so the reader can start playing from the top ayah.
// `tabs` and `reader` are phone and medium placements, hidden on expanded windows. `sidebar` is the expanded
// window's footer, shown only there. The reader adds its own mode check (Reading and Mushaf only).
export function useMiniPlayerVisible(variant: MiniPlayerVariant): boolean {
  const status = usePlayerStore((state) => state.status);
  const windowClass = useWindowClass();
  const loaded = status !== 'idle';
  const idleReciter = useIdleReciter(variant === 'reader' && !loaded) !== null;

  if (variant === 'sidebar') {
    return loaded && windowClass === 'expanded';
  }
  if (variant === 'reader') {
    return (loaded || idleReciter) && windowClass !== 'expanded';
  }
  return loaded && windowClass !== 'expanded';
}
