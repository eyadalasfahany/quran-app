import { useEffect, useState } from 'react';

import { ONLINE_DEBOUNCE_MS, startNetworkWatch, useNetworkStatus } from './network-state';

export { ONLINE_DEBOUNCE_MS } from './network-state';

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
