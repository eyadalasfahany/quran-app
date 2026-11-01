import { act, renderHook } from '@testing-library/react-native';
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';

import { makeDownloadEntry, makeFakeDownloadPort, makeRecording } from '../../../../jest/azkar-audio-fixtures';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { isOnline, useAzkarAutoplay, useAzkarDownloads, useAzkarUnitPlayback, useDownloadEntry, useIsDownloaded, useOnline } from './hooks';
import { resetAzkarPlaybackForTests, useAzkarPlaybackStore } from './playback';

const mockState = getNetworkStateAsync as jest.Mock;
const mockListen = addNetworkStateListener as jest.Mock;

describe('isOnline', () => {
  it('is online when connected and reachable', () => {
    expect(isOnline({ isConnected: true, isInternetReachable: true, type: 'WIFI' } as never)).toBe(true);
  });

  it('is offline when not connected', () => {
    expect(isOnline({ isConnected: false, isInternetReachable: false, type: 'NONE' } as never)).toBe(false);
  });

  it('is offline when connected but the internet is not reachable', () => {
    expect(isOnline({ isConnected: true, isInternetReachable: false, type: 'WIFI' } as never)).toBe(false);
  });

  it('is online when connected and reachability is still unknown', () => {
    expect(isOnline({ isConnected: true, isInternetReachable: undefined, type: 'CELLULAR' } as never)).toBe(true);
  });
});

describe('useOnline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts online, then reads the network state', async () => {
    mockState.mockResolvedValueOnce({ isConnected: false, isInternetReachable: false, type: 'NONE' });
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(false);
  });

  it('follows network changes and removes its listener on unmount', async () => {
    const remove = jest.fn();
    mockListen.mockReturnValueOnce({ remove });
    const { result, unmount } = renderHook(() => useOnline());
    await act(async () => {
      await Promise.resolve();
    });

    const listener = mockListen.mock.calls[0]?.[0] as (state: unknown) => void;
    act(() => listener({ isConnected: false, isInternetReachable: false, type: 'NONE' }));
    expect(result.current).toBe(false);

    act(() => listener({ isConnected: true, isInternetReachable: true, type: 'WIFI' }));
    expect(result.current).toBe(true);

    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('keeps its last value when the first read fails', async () => {
    mockState.mockRejectedValueOnce(new Error('no network module'));
    const { result } = renderHook(() => useOnline());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(true);
  });
});

describe('useIsDownloaded and useDownloadEntry', () => {
  it('reads the port for the recording, and reports nothing without one', () => {
    const recording = makeRecording({ downloadAllowed: true });
    const port = makeFakeDownloadPort([makeDownloadEntry({ recording, recordingKey: recording.recordingKey, state: 'done' })]);

    expect(renderHook(() => useIsDownloaded(recording, port)).result.current).toBe(true);
    expect(renderHook(() => useIsDownloaded(null, port)).result.current).toBe(false);
    expect(renderHook(() => useIsDownloaded(recording)).result.current).toBe(false);
    expect(renderHook(() => useDownloadEntry(recording, port)).result.current?.state).toBe('done');
    expect(renderHook(() => useDownloadEntry(null, port)).result.current).toBeNull();
  });

  it('is not downloaded while downloading', () => {
    const recording = makeRecording({ downloadAllowed: true });
    const port = makeFakeDownloadPort([makeDownloadEntry({ recording, recordingKey: recording.recordingKey, state: 'downloading' })]);
    expect(renderHook(() => useIsDownloaded(recording, port)).result.current).toBe(false);
  });
});

describe('useAzkarDownloads', () => {
  it('lists the entries and the storage, and changes them through the port', () => {
    const done = makeDownloadEntry({ recordingKey: 'fixture:a', categoryId: 'c1', state: 'done', bytes: 1_000 });
    const failed = makeDownloadEntry({ recordingKey: 'fixture:b', categoryId: 'c2', state: 'failed', bytes: null, progress: 0 });
    const port = makeFakeDownloadPort([done, failed]);
    const { result } = renderHook(() => useAzkarDownloads(port));

    expect(result.current.entries.map((entry) => entry.recordingKey)).toEqual(['fixture:a', 'fixture:b']);
    expect(result.current.storageBytes).toBe(1_000);

    act(() => result.current.remove('fixture:a'));
    expect(result.current.entries.map((entry) => entry.recordingKey)).toEqual(['fixture:b']);
    expect(result.current.storageBytes).toBe(0);
  });

  it('retries a failed entry with its recording', () => {
    const failed = makeDownloadEntry({ recordingKey: 'fixture:b', state: 'failed', bytes: null, progress: 0 });
    const port = makeFakeDownloadPort([failed]);
    const enqueue = jest.spyOn(port, 'enqueue');
    const { result } = renderHook(() => useAzkarDownloads(port));

    act(() => result.current.retry(failed));
    expect(enqueue).toHaveBeenCalledWith(failed.recording);
  });

  it('cancels one entry', () => {
    const port = makeFakeDownloadPort([makeDownloadEntry({ recordingKey: 'fixture:c', state: 'downloading', bytes: null })]);
    const { result } = renderHook(() => useAzkarDownloads(port));
    act(() => result.current.cancel('fixture:c'));
    expect(result.current.entries).toEqual([]);
  });

  it('removes every category with removeAll', () => {
    const port = makeFakeDownloadPort([
      makeDownloadEntry({ recordingKey: 'fixture:a', categoryId: 'c1' }),
      makeDownloadEntry({ recordingKey: 'fixture:b', categoryId: 'c2' }),
    ]);
    const removeCategory = jest.spyOn(port, 'removeCategory');
    const { result } = renderHook(() => useAzkarDownloads(port));

    act(() => result.current.removeAll());
    expect(removeCategory.mock.calls.map((call) => call[0])).toEqual(['c1', 'c2']);
    expect(result.current.entries).toEqual([]);
  });

  it('is empty with the no-audio port', () => {
    const { result } = renderHook(() => useAzkarDownloads());
    expect(result.current.entries).toEqual([]);
    expect(result.current.storageBytes).toBe(0);
  });
});

describe('useAzkarAutoplay', () => {
  afterEach(() => {
    storage.remove(storageKeys.azkar.audioAutoplay);
  });

  it('reads the saved preference and saves changes', () => {
    storage.set(storageKeys.azkar.audioAutoplay, true);
    const { result } = renderHook(() => useAzkarAutoplay());
    expect(result.current[0]).toBe(true);

    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
    expect(storage.getBoolean(storageKeys.azkar.audioAutoplay)).toBe(false);
  });
});

describe('useAzkarUnitPlayback', () => {
  beforeEach(() => {
    resetAzkarPlaybackForTests();
  });

  it('reports the loaded recording for its own unit only', () => {
    useAzkarPlaybackStore.setState({ unitKey: 'u1', status: 'playing', positionMs: 5_000, durationMs: 65_000 });
    expect(renderHook(() => useAzkarUnitPlayback('u1')).result.current).toEqual({
      active: true,
      status: 'playing',
      positionMs: 5_000,
      durationMs: 65_000,
    });
    expect(renderHook(() => useAzkarUnitPlayback('u2')).result.current).toEqual({
      active: false,
      status: 'idle',
      positionMs: 0,
      durationMs: 0,
    });
  });
});
