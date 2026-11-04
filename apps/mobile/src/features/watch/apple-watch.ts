import { Platform } from 'react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { addSibhaTodayTap } from '@/features/sibha/data/store';

import { mergeWatchMisbahaDeltas, type WatchMergeState } from './misbaha-delta';

const WATCH_MERGE_KEY = storageKeys.widgets.watchMerge;

type WatchConnectivityModule = {
  updateApplicationContext: (context: Record<string, string>) => void;
  watchEvents: { addListener: (event: string, cb: (payload: unknown) => void) => () => void };
};

function loadWatchConnectivity(): WatchConnectivityModule | null {
  if (Platform.OS !== 'ios') {
    return null;
  }
  try {
    // Lazy require so Jest and non-iOS builds do not load the native module at import time.
    return require('react-native-watch-connectivity') as WatchConnectivityModule;
  } catch {
    return null;
  }
}

function readWatchMergeState(): WatchMergeState {
  const raw = storage.getString(WATCH_MERGE_KEY);
  if (raw === undefined) {
    return { lastSeqByInstallId: {} };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<WatchMergeState>;
    const map = parsed.lastSeqByInstallId;
    if (typeof map !== 'object' || map === null) {
      return { lastSeqByInstallId: {} };
    }
    return { lastSeqByInstallId: { ...map } };
  } catch {
    return { lastSeqByInstallId: {} };
  }
}

function writeWatchMergeState(state: WatchMergeState): void {
  storage.set(WATCH_MERGE_KEY, JSON.stringify(state));
}

/** Cleared with personal data (`clear.ts`). */
export function clearWatchMergeState(): void {
  storage.remove(WATCH_MERGE_KEY);
}

/** Pushes the widget snapshot JSON to the paired watch (ADR 0035 §3). No-op off iOS. */
export function pushWatchApplicationContext(snapshotJson: string): void {
  const wc = loadWatchConnectivity();
  if (wc === null) {
    return;
  }
  try {
    wc.updateApplicationContext({ snapshot: snapshotJson });
  } catch {
    // WatchConnectivity unavailable in tests or before activation.
  }
}

/**
 * Pushes the stored snapshot JSON, if there is one, so a watch that was just paired or installed gets the context
 * without waiting for a rebuild. `updateApplicationContext` with an identical payload is cheap.
 */
export function pushStoredSnapshotToWatch(readJson: () => string | undefined): void {
  const json = readJson();
  if (json !== undefined) {
    pushWatchApplicationContext(json);
  }
}

/**
 * Applies queued watch misbaha deltas to today's total. Call on launch and when the app becomes active.
 */
export function intakeWatchMisbahaDeltas(now: Date, deltas: readonly unknown[]): number {
  const { mergeState, tapsToAdd } = mergeWatchMisbahaDeltas({
    deltas,
    mergeState: readWatchMergeState(),
    now,
  });
  writeWatchMergeState(mergeState);
  for (let index = 0; index < tapsToAdd; index += 1) {
    addSibhaTodayTap(now);
  }
  return tapsToAdd;
}

/**
 * Subscribes to live `user-info` events from the watch (iOS only). The library delivers an array of payloads per event;
 * a single object is wrapped. Returns an unsubscribe function.
 */
export function subscribeWatchUserInfo(onDeltas: (payloads: readonly unknown[]) => void): () => void {
  const wc = loadWatchConnectivity();
  if (wc === null) {
    return () => undefined;
  }
  return wc.watchEvents.addListener('user-info', (payload: unknown) => {
    onDeltas(Array.isArray(payload) ? payload : [payload]);
  });
}
