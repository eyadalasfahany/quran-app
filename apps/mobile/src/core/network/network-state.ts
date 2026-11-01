import { addNetworkStateListener, getNetworkStateAsync, type NetworkState } from 'expo-network';
import { create } from 'zustand';

type Subscription = { remove: () => void };

type NetworkStatus = {
  /** True or false once the device has answered; null until then. Unknown counts as online, so nothing is blocked early. */
  online: boolean | null;
};

export const useNetworkStatus = create<NetworkStatus>(() => ({ online: null }));

let watching: Subscription | null = null;

/** Connected, and not known to be cut off from the internet. A connected device with unknown reachability is online. */
export function isOnlineState(state: Pick<NetworkState, 'isConnected' | 'isInternetReachable'>): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
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
      useNetworkStatus.setState({ online: isOnlineState(state) });
    });
  } catch (error) {
    console.warn('Network state is not available.', error);
    return;
  }
  getNetworkStateAsync()
    .then((state) => {
      useNetworkStatus.setState({ online: isOnlineState(state) });
    })
    .catch(() => undefined);
}

/**
 * True only when the device is known to be offline right now. Read synchronously, so a tap can be answered without
 * waiting for the network. It starts the listener the first time it is read.
 */
export function networkIsOffline(): boolean {
  startNetworkWatch();
  return useNetworkStatus.getState().online === false;
}

/** Test hook: stop listening and forget the last answer. */
export function resetNetworkStateForTests(): void {
  watching?.remove();
  watching = null;
  useNetworkStatus.setState({ online: null });
}
