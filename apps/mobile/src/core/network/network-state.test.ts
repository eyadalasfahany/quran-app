import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';

import {
  isOnlineState,
  networkIsOffline,
  ONLINE_DEBOUNCE_MS,
  resetNetworkStateForTests,
  startNetworkWatch,
  useNetworkStatus,
} from './network-state';

const listen = jest.mocked(addNetworkStateListener);
const read = jest.mocked(getNetworkStateAsync);

async function settle(): Promise<void> {
  for (let step = 0; step < 4; step += 1) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  resetNetworkStateForTests();
  listen.mockClear();
  read.mockClear();
});

describe('isOnlineState', () => {
  it('counts a connected device as online, and an unknown reachability as online too', () => {
    expect(isOnlineState({ isConnected: true, isInternetReachable: true })).toBe(true);
    expect(isOnlineState({ isConnected: true, isInternetReachable: undefined })).toBe(true);
  });

  it('counts a device with no connection, or one cut off from the internet, as offline', () => {
    expect(isOnlineState({ isConnected: false, isInternetReachable: false })).toBe(false);
    expect(isOnlineState({ isConnected: true, isInternetReachable: false })).toBe(false);
  });
});

describe('startNetworkWatch', () => {
  it('starts one listener and one read, however often it is called', () => {
    startNetworkWatch();
    startNetworkWatch();

    expect(listen).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('keeps the answer unknown (null) until the device has replied', () => {
    startNetworkWatch();

    expect(useNetworkStatus.getState().online).toBeNull();
  });

  it('records the first read and every later change', async () => {
    read.mockResolvedValueOnce({ isConnected: false, isInternetReachable: false, type: 'NONE' } as never);
    let emit: ((state: { isConnected: boolean; isInternetReachable: boolean }) => void) | undefined;
    listen.mockImplementationOnce((listener) => {
      emit = listener as unknown as typeof emit;
      return { remove: jest.fn() };
    });

    startNetworkWatch();
    await settle();
    expect(useNetworkStatus.getState().online).toBe(false);

    emit?.({ isConnected: true, isInternetReachable: true });
    expect(useNetworkStatus.getState().online).toBe(true);
  });
});

describe('networkIsOffline', () => {
  it('is false while the device has not answered, so nothing is blocked early', () => {
    expect(networkIsOffline()).toBe(false);
  });

  it('is false when offline for less than the debounce window', () => {
    useNetworkStatus.setState({ online: false, changedAt: Date.now() });
    expect(networkIsOffline()).toBe(false);
  });

  it('is true once offline has held for at least the debounce window', () => {
    useNetworkStatus.setState({ online: false, changedAt: Date.now() - ONLINE_DEBOUNCE_MS });
    expect(networkIsOffline()).toBe(true);
  });

  it('does not restart the debounce window on repeated identical offline events', async () => {
    read.mockResolvedValueOnce({ isConnected: true, isInternetReachable: true, type: 'WIFI' } as never);
    let emit: ((state: { isConnected: boolean; isInternetReachable: boolean }) => void) | undefined;
    listen.mockImplementationOnce((listener) => {
      emit = listener as unknown as typeof emit;
      return { remove: jest.fn() };
    });

    jest.useFakeTimers();
    try {
      startNetworkWatch();
      await settle();
      emit?.({ isConnected: false, isInternetReachable: false });
      const firstAt = useNetworkStatus.getState().changedAt;
      jest.advanceTimersByTime(500);
      emit?.({ isConnected: false, isInternetReachable: false });
      expect(useNetworkStatus.getState().changedAt).toBe(firstAt);
      expect(networkIsOffline()).toBe(false);
      jest.advanceTimersByTime(500);
      expect(networkIsOffline()).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('is false at once when the device is back online', () => {
    useNetworkStatus.setState({ online: false, changedAt: Date.now() - ONLINE_DEBOUNCE_MS });
    expect(networkIsOffline()).toBe(true);

    useNetworkStatus.setState({ online: true, changedAt: Date.now() });
    expect(networkIsOffline()).toBe(false);
  });

  it('starts the watch the first time it is read', () => {
    networkIsOffline();

    expect(listen).toHaveBeenCalledTimes(1);
  });
});
