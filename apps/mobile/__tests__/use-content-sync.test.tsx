import { act, render } from '@testing-library/react-native';
import { createElement } from 'react';
import { AppState } from 'react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';
import {
  CONTENT_SYNC_FOREGROUND_MS,
  createContentSyncScheduler,
  shouldSyncOnForeground,
  useContentSync,
} from '@/core/sync/use-content-sync';

function flush(): Promise<void> {
  return act(async () => {
    for (let step = 0; step < 8; step += 1) {
      await Promise.resolve();
    }
  });
}

describe('content sync trigger', () => {
  afterEach(() => {
    storage.remove(storageKeys.contentLastSyncAt);
    jest.restoreAllMocks();
  });

  it('retries on foreground only after more than six hours', () => {
    const now = 10_000_000;
    expect(shouldSyncOnForeground(undefined, now)).toBe(true);
    expect(shouldSyncOnForeground(String(now - CONTENT_SYNC_FOREGROUND_MS), now)).toBe(false);
    expect(shouldSyncOnForeground(String(now - CONTENT_SYNC_FOREGROUND_MS - 1), now)).toBe(true);
  });

  it('does not run two syncs at once and records a successful run', async () => {
    const now = 50_000;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    const scheduler = createContentSyncScheduler(async () => {
      calls += 1;
      await gate;
    }, () => now);

    scheduler.start();
    scheduler.start();
    await Promise.resolve();
    expect(calls).toBe(1);

    release();
    await flush();
    expect(storage.getString(storageKeys.contentLastSyncAt)).toBe(String(now));

    scheduler.onForeground();
    await Promise.resolve();
    expect(calls).toBe(1);

    storage.set(storageKeys.contentLastSyncAt, String(now - CONTENT_SYNC_FOREGROUND_MS - 1));
    scheduler.onForeground();
    await Promise.resolve();
    expect(calls).toBe(2);
  });

  it('swallows a network error and leaves the foreground timer unset', async () => {
    const scheduler = createContentSyncScheduler(async () => {
      throw new Error('offline');
    }, () => 5);

    scheduler.start();
    await flush();

    expect(storage.getString(storageKeys.contentLastSyncAt)).toBeUndefined();
  });

  it('starts once when the database is ready', async () => {
    const run = jest.fn(async () => undefined);
    const listeners: ((state: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      listeners.push(handler as (state: string) => void);
      return { remove: jest.fn() } as ReturnType<typeof AppState.addEventListener>;
    });

    render(createElement(() => {
      useContentSync(run);
      return null;
    }));
    await flush();

    expect(run).toHaveBeenCalledTimes(1);
    listeners[0]?.('background');
    listeners[0]?.('active');
    await flush();
    expect(run).toHaveBeenCalledTimes(1);
  });
});
