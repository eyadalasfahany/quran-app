import { addNetworkStateListener, getNetworkStateAsync, type NetworkState } from 'expo-network';
import { create } from 'zustand';

type Subscription = { remove: () => void };

/** A change must hold this long before the UI and playback gate follow it, so a flaky link does not flicker. */
export const ONLINE_DEBOUNCE_MS = 1_000;

type NetworkStatus = {
  /** True or false once the device has answered; null until then. Unknown counts as online, so nothing is blocked early. */
  online: boolean | null;
  /** When `online` last changed; used so sub-second flickers do not block playback. */
  changedAt: number;
};

export const useNetworkStatus = create<NetworkStatus>(() => ({ online: null, changedAt: 0 }));

let watching: Subscription | null = null;

/** Connected, and not known to be cut off from the internet. A connected device with unknown reachability is online. */
export function isOnlineState(state: Pick<NetworkState, 'isConnected' | 'isInternetReachable'>): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

function setOnline(online: boolean): void {
  const prev = useNetworkStatus.getState();
  if (prev.online === online) {
    return;
  }
  useNetworkStatus.setState({ online, changedAt: Date.now() });
}

/**
 * Starts listening to the network, once. Idempotent, so any caller may start it. The first read is asynchronous;
 * until it answers, `online` stays null.
 */
export function startNetworkWatch(): void {
  if (watching !== null) {
    return;
  }
  try {
    watching = addNetworkStateListener((state) => {
      setOnline(isOnlineState(state));
    });
  } catch (error) {
    console.warn('Network state is not available.', error);
    return;
  }
  getNetworkStateAsync()
    .then((state) => {
      setOnline(isOnlineState(state));
    })
    .catch(() => undefined);
}

/**
 * True only when the device is known to be offline and that state has held for ONLINE_DEBOUNCE_MS — the same rule as
 * the offline banner, so a flicker never blocks playback; a real outage is still reported (the load watchdog in
 * player.ts labels it offline later).
 */
export function networkIsOffline(now: number = Date.now()): boolean {
  startNetworkWatch();
  const { online, changedAt } = useNetworkStatus.getState();
  if (online !== false) {
    return false;
  }
  return now - changedAt >= ONLINE_DEBOUNCE_MS;
}

/** Test hook: stop listening and forget the last answer. */
export function resetNetworkStateForTests(): void {
  watching?.remove();
  watching = null;
  useNetworkStatus.setState({ online: null, changedAt: 0 });
}
