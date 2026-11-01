import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';

import {
  isOnlineState,
  networkIsOffline,
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

  it('is true only once the device is known to be offline', () => {
    useNetworkStatus.setState({ online: false });
    expect(networkIsOffline()).toBe(true);

    useNetworkStatus.setState({ online: true });
    expect(networkIsOffline()).toBe(false);
  });

  it('starts the watch the first time it is read', () => {
    networkIsOffline();

    expect(listen).toHaveBeenCalledTimes(1);
  });
});
