import { act } from '@testing-library/react-native';
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';

import { makeDownloadEntry, makeFakeDownloadPort, makeRecording } from '../../../../jest/azkar-audio-fixtures';
import { renderUi } from '../../../../jest/render-ui';

import { isOnline, useAzkarDownloads, useDownloadEntry, useIsDownloaded, useOnline } from './hooks';

const mockState = getNetworkStateAsync as jest.Mock;
const mockListen = addNetworkStateListener as jest.Mock;

/**
 * Renders a hook inside a probe component and keeps its latest return value. Re-renders (from state changes) update
 * `box.value`, so tests read the current value after each act.
 */
async function probe<T>(hook: () => T) {
  const box: { value: T | undefined } = { value: undefined };
  function Probe() {
    box.value = hook();
    return null;
  }
  await renderUi(<Probe />);
  return box as { value: T };
}

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

  it('reads the network state after the first render', async () => {
    mockState.mockResolvedValueOnce({ isConnected: false, isInternetReachable: false, type: 'NONE' });
    const view = await probe(() => useOnline());

    await act(async () => {
      await Promise.resolve();
    });
    expect(view.value).toBe(false);
  });

  it('follows network changes and removes its listener on unmount', async () => {
    const remove = jest.fn();
    mockListen.mockReturnValueOnce({ remove });
    const view = await probe(() => useOnline());

    const listener = mockListen.mock.calls[0]?.[0] as (state: unknown) => void;
    await act(async () => {
      listener({ isConnected: false, isInternetReachable: false, type: 'NONE' });
    });
    expect(view.value).toBe(false);

    await act(async () => {

      listener({ isConnected: true, isInternetReachable: true, type: 'WIFI' });

    });
    expect(view.value).toBe(true);
  });

  it('keeps its last value when the first read fails', async () => {
    mockState.mockRejectedValueOnce(new Error('no network module'));
    const view = await probe(() => useOnline());
    await act(async () => {
      await Promise.resolve();
    });
    expect(view.value).toBe(true);
  });
});

describe('useIsDownloaded and useDownloadEntry', () => {
  it('reads the port for the recording, and reports nothing without one', async () => {
    const recording = makeRecording({ downloadAllowed: true });
    const port = makeFakeDownloadPort([makeDownloadEntry({ recording, recordingKey: recording.recordingKey, state: 'done' })]);

    expect((await probe(() => useIsDownloaded(recording, port))).value).toBe(true);
    expect((await probe(() => useIsDownloaded(null, port))).value).toBe(false);
    expect((await probe(() => useIsDownloaded(recording))).value).toBe(false);
    expect((await probe(() => useDownloadEntry(recording, port))).value?.state).toBe('done');
    expect((await probe(() => useDownloadEntry(null, port))).value).toBeNull();
  });

  it('is not downloaded while downloading', async () => {
    const recording = makeRecording({ downloadAllowed: true });
    const port = makeFakeDownloadPort([makeDownloadEntry({ recording, recordingKey: recording.recordingKey, state: 'downloading' })]);
    expect((await probe(() => useIsDownloaded(recording, port))).value).toBe(false);
  });
});

describe('useAzkarDownloads', () => {
  it('lists the entries and the storage, and changes them through the port', async () => {
    const done = makeDownloadEntry({ recordingKey: 'fixture:a', categoryId: 'c1', state: 'done', bytes: 1_000 });
    const failed = makeDownloadEntry({ recordingKey: 'fixture:b', categoryId: 'c2', state: 'failed', bytes: null, progress: 0 });
    const port = makeFakeDownloadPort([done, failed]);
    const view = await probe(() => useAzkarDownloads(port));

    expect(view.value.entries.map((entry) => entry.recordingKey)).toEqual(['fixture:a', 'fixture:b']);
    expect(view.value.storageBytes).toBe(1_000);

    await act(async () => {

      view.value.remove('fixture:a');

    });
    expect(view.value.entries.map((entry) => entry.recordingKey)).toEqual(['fixture:b']);
    expect(view.value.storageBytes).toBe(0);
  });

  it('retries a failed entry with its recording', async () => {
    const failed = makeDownloadEntry({ recordingKey: 'fixture:b', state: 'failed', bytes: null, progress: 0 });
    const port = makeFakeDownloadPort([failed]);
    const enqueue = jest.spyOn(port, 'enqueue');
    const view = await probe(() => useAzkarDownloads(port));

    await act(async () => {

      view.value.retry(failed);

    });
    expect(enqueue).toHaveBeenCalledWith(failed.recording);
  });

  it('cancels one entry', async () => {
    const port = makeFakeDownloadPort([makeDownloadEntry({ recordingKey: 'fixture:c', state: 'downloading', bytes: null })]);
    const view = await probe(() => useAzkarDownloads(port));
    await act(async () => {
      view.value.cancel('fixture:c');
    });
    expect(view.value.entries).toEqual([]);
  });

  it('removes every category with removeAll', async () => {
    const port = makeFakeDownloadPort([
      makeDownloadEntry({ recordingKey: 'fixture:a', categoryId: 'c1' }),
      makeDownloadEntry({ recordingKey: 'fixture:b', categoryId: 'c2' }),
    ]);
    const removeCategory = jest.spyOn(port, 'removeCategory');
    const view = await probe(() => useAzkarDownloads(port));

    await act(async () => {

      view.value.removeAll();

    });
    expect(removeCategory.mock.calls.map((call) => call[0])).toEqual(['c1', 'c2']);
    expect(view.value.entries).toEqual([]);
  });

  it('is empty with the no-audio port', async () => {
    const view = await probe(() => useAzkarDownloads());
    expect(view.value.entries).toEqual([]);
    expect(view.value.storageBytes).toBe(0);
  });
});
