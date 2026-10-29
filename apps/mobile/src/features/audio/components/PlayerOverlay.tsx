import { useEffect, type ReactNode } from 'react';

import { useOptionalPlayerHost } from './player-host-context';

/**
 * Renders `children` in the PlayerHost's overlay, above the player's content and outside its scroll view.
 * Outside a host (a component rendered on its own) it renders them in place.
 */
export function PlayerOverlay({ children }: { children: ReactNode }) {
  const host = useOptionalPlayerHost();
  const setOverlay = host?.setOverlay;

  useEffect(() => {
    if (setOverlay === undefined) {
      return undefined;
    }
    setOverlay(children);
    return () => {
      setOverlay(null);
    };
  }, [children, setOverlay]);

  return setOverlay === undefined ? children : null;
}
