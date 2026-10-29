import { useWindowClass } from '@/core/layout/useWindowClass';

import type { MiniPlayerVariant } from '../mini-player-metrics';
import { usePlayerStore } from '../playerStore';

// Whether the mini player's bar shows. The bar and everything that makes room for it (list insets, the resume
// pill) read this one rule, so they can't disagree. Hidden while nothing has loaded and on expanded windows, whose
// placements come in step 4b2. The reader adds its own mode check (Reading and Mushaf only).
// Both variants follow the same rule today; the variant is in the signature so each caller names the bar it draws.
export function useMiniPlayerVisible(variant: MiniPlayerVariant): boolean {
  const status = usePlayerStore((state) => state.status);
  const windowClass = useWindowClass();

  return status !== 'idle' && windowClass !== 'expanded';
}
