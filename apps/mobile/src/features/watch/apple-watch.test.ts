import { readSibhaTodayTotal } from '@/features/sibha/data/store';
import { storage, storageKeys } from '@/core/storage/mmkv';

import {
  clearWatchMergeState,
  intakeWatchMisbahaDeltas,
  pushStoredSnapshotToWatch,
  pushWatchApplicationContext,
  subscribeWatchUserInfo,
} from './apple-watch';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const mockUpdateApplicationContext = jest.fn();
const mockUserInfoListeners: ((payload: unknown) => void)[] = [];

jest.mock('react-native-watch-connectivity', () => ({
  updateApplicationContext: (...args: unknown[]) => mockUpdateApplicationContext(...args),
  watchEvents: {
    addListener: (_event: string, cb: (payload: unknown) => void) => {
      mockUserInfoListeners.push(cb);
      return () => undefined;
    },
  },
}));

const now = new Date(2026, 10, 2, 9, 0);

function emitUserInfo(payload: unknown): void {
  const listener = mockUserInfoListeners[0];
  if (listener === undefined) {
    throw new Error('no user-info listener subscribed');
  }
  listener(payload);
}

function delta(seq: number, taps: number, installId = 'w1') {
  return { date: '2026-11-02', installId, seq, source: 'watch', taps };
}

describe('apple-watch bridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserInfoListeners.length = 0;
    storage.remove(storageKeys.sibha.today);
    clearWatchMergeState();
  });

  it('pushes snapshot JSON as application context', () => {
    pushWatchApplicationContext('{"schemaVersion":1}');
    expect(mockUpdateApplicationContext).toHaveBeenCalledWith({ snapshot: '{"schemaVersion":1}' });
  });

  it('pushes the stored snapshot JSON when one exists', () => {
    pushStoredSnapshotToWatch(() => '{"schemaVersion":1}');
    expect(mockUpdateApplicationContext).toHaveBeenCalledWith({ snapshot: '{"schemaVersion":1}' });
  });

  it('pushes nothing when no snapshot is stored', () => {
    pushStoredSnapshotToWatch(() => undefined);
    expect(mockUpdateApplicationContext).not.toHaveBeenCalled();
  });

  it('intake adds today taps and persists seq', () => {
    const added = intakeWatchMisbahaDeltas(now, [
      { date: '2026-11-02', installId: 'w1', seq: 1, source: 'watch', taps: 2 },
    ]);
    expect(added).toBe(2);
    const again = intakeWatchMisbahaDeltas(now, [
      { date: '2026-11-02', installId: 'w1', seq: 1, source: 'watch', taps: 2 },
    ]);
    expect(again).toBe(0);
  });

  it('counts both deltas of an array user-info event', () => {
    subscribeWatchUserInfo((payloads) => {
      intakeWatchMisbahaDeltas(now, payloads);
    });
    emitUserInfo([delta(1, 1), delta(2, 1)]);
    expect(readSibhaTodayTotal(now)).toBe(2);
  });

  it('still counts a single-object user-info event', () => {
    subscribeWatchUserInfo((payloads) => {
      intakeWatchMisbahaDeltas(now, payloads);
    });
    emitUserInfo(delta(1, 2));
    expect(readSibhaTodayTotal(now)).toBe(2);
  });

  it('counts the same user-info event once when it is delivered twice', () => {
    subscribeWatchUserInfo((payloads) => {
      intakeWatchMisbahaDeltas(now, payloads);
    });
    emitUserInfo([delta(1, 1)]);
    emitUserInfo([delta(1, 1)]);
    expect(readSibhaTodayTotal(now)).toBe(1);
  });
});
