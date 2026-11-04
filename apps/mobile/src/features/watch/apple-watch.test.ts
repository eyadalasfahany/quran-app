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

function defaultWatchConnectivityPackage(): unknown {
  return {
    updateApplicationContext: (...args: unknown[]) => mockUpdateApplicationContext(...args),
    watchEvents: {
      addListener: (_event: string, cb: (payload: unknown) => void) => {
        mockUserInfoListeners.push(cb);
        return () => undefined;
      },
    },
  };
}

// Swappable so availability tests can make the package require throw or return partial exports.
let mockWatchConnectivityPackage: () => unknown = defaultWatchConnectivityPackage;

jest.mock('react-native-watch-connectivity', () => mockWatchConnectivityPackage());

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

describe('apple-watch WatchConnectivity availability', () => {
  type AppleWatchModule = typeof import('./apple-watch');

  /** Loads a fresh apple-watch module so its module-level loader state starts empty. */
  function loadWithPackage(factory: () => unknown): AppleWatchModule {
    mockWatchConnectivityPackage = factory;
    // Drops the mock registry so the package factory runs for this load, not an earlier test's cached result.
    jest.resetModules();
    let loaded: AppleWatchModule | undefined;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      loaded = require('./apple-watch') as AppleWatchModule;
    });
    if (loaded === undefined) {
      throw new Error('apple-watch did not load');
    }
    return loaded;
  }

  afterEach(() => {
    mockWatchConnectivityPackage = defaultWatchConnectivityPackage;
  });

  it('is a no-op when the native package require throws', () => {
    const watch = loadWithPackage(() => {
      throw new Error("TurboModuleRegistry.getEnforcing(...): 'WatchConnectivity' could not be found");
    });

    const unsubscribe = watch.subscribeWatchUserInfo(() => undefined);
    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
    expect(() => watch.pushWatchApplicationContext('{"schemaVersion":1}')).not.toThrow();
  });

  it('is a no-op when the package resolves to partial exports, even on a later call', () => {
    // Mirrors Metro: the first require throws, a later require returns an empty exports object.
    let calls = 0;
    const watch = loadWithPackage(() => {
      calls += 1;
      if (calls === 1) {
        throw new Error("TurboModuleRegistry.getEnforcing(...): 'WatchConnectivity' could not be found");
      }
      return {};
    });

    expect(() => watch.subscribeWatchUserInfo(() => undefined)).not.toThrow();
    expect(() => watch.subscribeWatchUserInfo(() => undefined)).not.toThrow();
    expect(() => watch.pushWatchApplicationContext('{"schemaVersion":1}')).not.toThrow();
  });

  it('is a no-op when the package resolves to exports without watchEvents', () => {
    const watch = loadWithPackage(() => ({ updateApplicationContext: jest.fn() }));

    expect(() => watch.subscribeWatchUserInfo(() => undefined)).not.toThrow();
    expect(() => watch.pushWatchApplicationContext('{"schemaVersion":1}')).not.toThrow();
  });

  it('requires the package at most once across multiple calls', () => {
    const factory = jest.fn(() => {
      throw new Error("TurboModuleRegistry.getEnforcing(...): 'WatchConnectivity' could not be found");
    });
    const watch = loadWithPackage(factory);

    watch.subscribeWatchUserInfo(() => undefined);
    watch.subscribeWatchUserInfo(() => undefined);
    watch.pushWatchApplicationContext('{"schemaVersion":1}');
    watch.pushStoredSnapshotToWatch(() => '{"schemaVersion":1}');

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('registers the user-info listener once when the package is valid', () => {
    const listener = jest.fn((_event: string, _cb: (payload: unknown) => void) => () => undefined);
    const updateApplicationContext = jest.fn();
    const factory = jest.fn(() => ({ updateApplicationContext, watchEvents: { addListener: listener } }));
    const watch = loadWithPackage(factory);

    const onDeltas = jest.fn();
    watch.subscribeWatchUserInfo(onDeltas);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('user-info', expect.any(Function));

    const handler = listener.mock.calls[0]?.[1] as (payload: unknown) => void;
    handler([{ seq: 1 }, { seq: 2 }]);
    handler({ seq: 3 });
    expect(onDeltas).toHaveBeenNthCalledWith(1, [{ seq: 1 }, { seq: 2 }]);
    expect(onDeltas).toHaveBeenNthCalledWith(2, [{ seq: 3 }]);

    watch.pushWatchApplicationContext('{"schemaVersion":1}');
    expect(updateApplicationContext).toHaveBeenCalledWith({ snapshot: '{"schemaVersion":1}' });
  });
});
