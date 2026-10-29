import { useWindowClass } from '@/core/layout/useWindowClass';

import type { MiniPlayerVariant } from '../mini-player-metrics';
import { usePlayerStore } from '../playerStore';

// Whether a mini player bar shows. The bar and everything that makes room for it (list insets, the resume
// pill) read this one rule, so they can't disagree. Nothing shows while nothing has loaded.
// `tabs` and `reader` are phone and medium placements, hidden on expanded windows. `sidebar` is the expanded
// window's footer, shown only there. The reader adds its own mode check (Reading and Mushaf only).
export function useMiniPlayerVisible(variant: MiniPlayerVariant): boolean {
  const status = usePlayerStore((state) => state.status);
  const windowClass = useWindowClass();
  const loaded = status !== 'idle';

  if (variant === 'sidebar') {
    return loaded && windowClass === 'expanded';
  }
  return loaded && windowClass !== 'expanded';
}
