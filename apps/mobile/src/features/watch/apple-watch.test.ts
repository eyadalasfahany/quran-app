import { storage, storageKeys } from '@/core/storage/mmkv';

import { clearWatchMergeState, intakeWatchMisbahaDeltas, pushWatchApplicationContext } from './apple-watch';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const mockUpdateApplicationContext = jest.fn();

jest.mock('react-native-watch-connectivity', () => ({
  updateApplicationContext: (...args: unknown[]) => mockUpdateApplicationContext(...args),
  watchEvents: { addListener: jest.fn(() => () => undefined) },
}));

describe('apple-watch bridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storage.remove(storageKeys.sibha.today);
    clearWatchMergeState();
  });

  it('pushes snapshot JSON as application context', () => {
    pushWatchApplicationContext('{"schemaVersion":1}');
    expect(mockUpdateApplicationContext).toHaveBeenCalledWith({ snapshot: '{"schemaVersion":1}' });
  });

  it('intake adds today taps and persists seq', () => {
    const now = new Date(2026, 10, 2, 9, 0);
    const added = intakeWatchMisbahaDeltas(now, [
      { date: '2026-11-02', installId: 'w1', seq: 1, source: 'watch', taps: 2 },
    ]);
    expect(added).toBe(2);
    const again = intakeWatchMisbahaDeltas(now, [
      { date: '2026-11-02', installId: 'w1', seq: 1, source: 'watch', taps: 2 },
    ]);
    expect(again).toBe(0);
  });
});
