import { useEffect, useState } from 'react';

import { startNetworkWatch, useNetworkStatus } from './network-state';

/** A change must hold this long before the UI follows it, so a flaky link does not flicker a banner. */
export const ONLINE_DEBOUNCE_MS = 1_000;

/**
 * Whether the UI should show the device as online. It follows the network state after ONLINE_DEBOUNCE_MS, so a
 * brief drop or return does not flicker. Starts as online until the device says otherwise.
 */
export function useOnline(debounceMs: number = ONLINE_DEBOUNCE_MS): boolean {
  const reported = useNetworkStatus((state) => state.online) !== false;
  const [settled, setSettled] = useState(reported);

  useEffect(() => {
    startNetworkWatch();
  }, []);

  useEffect(() => {
    if (reported === settled) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setSettled(reported);
    }, debounceMs);
    return () => {
      clearTimeout(timer);
    };
  }, [reported, settled, debounceMs]);

  return settled;
}
