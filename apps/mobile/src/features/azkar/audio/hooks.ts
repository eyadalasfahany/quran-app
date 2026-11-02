import { addNetworkStateListener, getNetworkStateAsync, type NetworkState } from 'expo-network';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';

import type { AzkarRecording } from '../data/model';
import { NoAudioDownloadPort, type AzkarDownloadEntry, type AzkarDownloadPort } from './downloads';

/** Whether the device can reach the network. A connected device with unknown reachability counts as online. */
export function isOnline(state: NetworkState): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

/** Live connectivity, read once and then on every network change. Starts online until the first read answers. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let active = true;
    getNetworkStateAsync()
      .then((state) => {
        if (active) {
          setOnline(isOnline(state));
        }
      })
      .catch(() => undefined);
    const subscription = addNetworkStateListener((state) => {
      setOnline(isOnline(state));
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return online;
}

/**
 * Whether a recording is downloaded. The port is read on every render: the port has no change signal yet, so the
 * screen that drives downloads re-reads it after each action.
 */
export function useIsDownloaded(recording: AzkarRecording | null, port: AzkarDownloadPort = NoAudioDownloadPort): boolean {
  if (recording === null) {
    return false;
  }
  return port.status(recording.recordingKey)?.state === 'done';
}

/** The download entry of one recording, or null. Read through the port, like `useIsDownloaded`. */
export function useDownloadEntry(recording: AzkarRecording | null, port: AzkarDownloadPort = NoAudioDownloadPort): AzkarDownloadEntry | null {
  if (recording === null) {
    return null;
  }
  return port.status(recording.recordingKey);
}

/** The downloads list and the storage used, with the actions that change them. Each action re-reads the port. */
export function useAzkarDownloads(port: AzkarDownloadPort = NoAudioDownloadPort) {
  const [, refresh] = useReducer((count: number) => count + 1, 0);
  const entries = port.list();
  const storageBytes = port.storageBytes();

  const cancel = useCallback(
    (recordingKey: string) => {
      port.cancel(recordingKey);
      refresh();
    },
    [port],
  );
  const remove = useCallback(
    (recordingKey: string) => {
      port.remove(recordingKey);
      refresh();
    },
    [port],
  );
  const retry = useCallback(
    (entry: AzkarDownloadEntry) => {
      port.enqueue(entry.recording);
      refresh();
    },
    [port],
  );
  const removeAll = useCallback(() => {
    const categories = new Set(port.list().map((entry) => entry.categoryId));
    for (const categoryId of categories) {
      port.removeCategory(categoryId);
    }
    refresh();
  }, [port]);

  return useMemo(() => ({ entries, storageBytes, cancel, remove, retry, removeAll }), [entries, storageBytes, cancel, remove, retry, removeAll]);
}
