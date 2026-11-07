import { act } from '@testing-library/react-native';
import { getNetworkStateAsync } from 'expo-network';

import { installResource, type InstallOptions, type InstallResult } from '@/core/sync';
import { getWifiOnlyDownloads } from '@/features/audio/settings';

import { downloadStateFor, resetHadithDownloads, useHadithDownloads } from './downloads';

jest.mock('@/core/sync', () => ({ installResource: jest.fn() }));
jest.mock('@/features/audio/settings', () => ({ getWifiOnlyDownloads: jest.fn(() => false) }));

const RESOURCE = -1;

type Pending = { resolve: (result: InstallResult) => void; options: InstallOptions };

// Each install waits until the test resolves it, so progress and the running state can be read.
function deferInstalls(): Pending[] {
  const pending: Pending[] = [];
  jest.mocked(installResource).mockImplementation(
    (_id, options = {}) =>
      new Promise<InstallResult>((resolve) => {
        pending.push({ resolve, options });
      }),
  );
  return pending;
}

function onWifi(on: boolean) {
  jest.mocked(getNetworkStateAsync).mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: on ? 'WIFI' : 'CELLULAR',
  } as Awaited<ReturnType<typeof getNetworkStateAsync>>);
}

describe('useHadithDownloads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetHadithDownloads();
    jest.mocked(getWifiOnlyDownloads).mockReturnValue(false);
    onWifi(true);
  });

  it('starts an install and tracks progress', async () => {
    const pending = deferInstalls();
    void act(() => useHadithDownloads.getState().start(RESOURCE));
    await act(async () => {
      await Promise.resolve();
    });
    expect(installResource).toHaveBeenCalledWith(RESOURCE, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(useHadithDownloads.getState().byId[RESOURCE]).toEqual({ status: 'downloading', progress: 0 });
    act(() => pending[0]?.options.onProgress?.(0.4));
    expect(useHadithDownloads.getState().byId[RESOURCE]).toEqual({ status: 'downloading', progress: 0.4 });
  });

  it('removes the entry when the install finishes', async () => {
    const pending = deferInstalls();
    void act(() => useHadithDownloads.getState().start(RESOURCE));
    await act(async () => {
      pending[0]?.resolve({ status: 'installed' });
      await Promise.resolve();
    });
    expect(useHadithDownloads.getState().byId[RESOURCE]).toBeUndefined();
  });

  it('removes the entry when the install is cancelled', async () => {
    const pending = deferInstalls();
    void act(() => useHadithDownloads.getState().start(RESOURCE));
    await act(async () => {
      pending[0]?.resolve({ status: 'cancelled' });
      await Promise.resolve();
    });
    expect(useHadithDownloads.getState().byId[RESOURCE]).toBeUndefined();
  });

  it('marks the entry failed with reason network when the install cannot reach the network', async () => {
    const pending = deferInstalls();
    void act(() => useHadithDownloads.getState().start(RESOURCE));
    await act(async () => {
      pending[0]?.resolve({ status: 'failed', reason: 'network' });
      await Promise.resolve();
    });
    expect(useHadithDownloads.getState().byId[RESOURCE]).toEqual({ status: 'failed', progress: 0, reason: 'network' });
  });

  it('does not start twice for the same resource', async () => {
    deferInstalls();
    void act(() => useHadithDownloads.getState().start(RESOURCE));
    await act(async () => {
      await useHadithDownloads.getState().start(RESOURCE);
    });
    expect(installResource).toHaveBeenCalledTimes(1);
  });

  it('cancel aborts the running install', async () => {
    const pending = deferInstalls();
    void act(() => useHadithDownloads.getState().start(RESOURCE));
    const signal = pending[0]?.options.signal;
    act(() => useHadithDownloads.getState().cancel(RESOURCE));
    expect(signal?.aborted).toBe(true);
  });

  it('does not start on cellular when Wi-Fi only is on and records reason wifi', async () => {
    jest.mocked(getWifiOnlyDownloads).mockReturnValue(true);
    onWifi(false);
    deferInstalls();
    await act(async () => {
      await useHadithDownloads.getState().start(RESOURCE);
    });
    expect(installResource).not.toHaveBeenCalled();
    expect(useHadithDownloads.getState().byId[RESOURCE]).toEqual({ status: 'failed', progress: 0, reason: 'wifi' });
  });

  it('starts on Wi-Fi when Wi-Fi only is on', async () => {
    jest.mocked(getWifiOnlyDownloads).mockReturnValue(true);
    onWifi(true);
    deferInstalls();
    await act(async () => {
      void useHadithDownloads.getState().start(RESOURCE);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(installResource).toHaveBeenCalledTimes(1);
  });

  it('starts on cellular when Wi-Fi only is off', async () => {
    jest.mocked(getWifiOnlyDownloads).mockReturnValue(false);
    onWifi(false);
    deferInstalls();
    await act(async () => {
      void useHadithDownloads.getState().start(RESOURCE);
      await Promise.resolve();
    });
    expect(installResource).toHaveBeenCalledTimes(1);
  });

  it('downloadStateFor maps installed, downloading, failed and available', () => {
    expect(downloadStateFor(1, true, 100, false, {})).toEqual({ kind: 'installed' });
    expect(downloadStateFor(1, false, 100, false, { 1: { status: 'downloading', progress: 0.5 } })).toEqual({
      kind: 'downloading',
      progress: 0.5,
    });
    expect(downloadStateFor(1, false, 100, false, { 1: { status: 'failed', progress: 0 } })).toEqual({ kind: 'failed' });
    expect(downloadStateFor(1, false, 100, true, {})).toEqual({ kind: 'available', sizeBytes: 100, offline: true });
  });
});
