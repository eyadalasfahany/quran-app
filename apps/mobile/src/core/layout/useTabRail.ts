import { useIsShortWindow, useWindowClass } from './useWindowClass';

/**
 * Whether the main tabs are the vertical rail on the start edge (ADR 0036; ADR 0051 as amended on 2 Nov 2026). The rail
 * shows on a short window (a landscape phone) and on an expanded window (a tablet or iPad, 840 pt wide and not short).
 * Phones keep the bottom bar, and so do medium windows. Every navigation choice reads this hook, not `useIsShortWindow`,
 * which stays for layouts that must reflow to fit their height.
 */
export function useTabRail(): boolean {
  // Both hooks run on every render, so the hook order never depends on the window size.
  const short = useIsShortWindow();
  const windowClass = useWindowClass();
  return short || windowClass === 'expanded';
}
