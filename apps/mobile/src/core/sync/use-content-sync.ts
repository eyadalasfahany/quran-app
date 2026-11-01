import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useContentDb } from '@/core/db/content/open';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { withDeadline } from '../api/request-timeout';
import { markSyncSettled } from './catalog-version';
import { runDeviceContentSync } from './device-sync';

export const CONTENT_SYNC_FOREGROUND_MS = 6 * 60 * 60 * 1000;
// A run that has not finished by now is given up on, so the next foreground sync can start. The run itself is not
// cancelled (syncContent takes no signal yet), so it may still finish in the background.
export const CONTENT_SYNC_RUN_TIMEOUT_MS = 10 * 60 * 1000;

type SyncRun = () => Promise<unknown>;

export function shouldSyncOnForeground(lastSyncAt: string | undefined, now: number): boolean {
  if (lastSyncAt === undefined) {
    return true;
  }
  const parsed = Number(lastSyncAt);
  if (!Number.isFinite(parsed)) {
    return true;
  }
  return now - parsed > CONTENT_SYNC_FOREGROUND_MS;
}

export function createContentSyncScheduler(run: SyncRun, now: () => number = Date.now): {
  start: () => void;
  onForeground: () => void;
} {
  let running = false;

  function start(): void {
    if (running) {
      return;
    }
    running = true;
    void withDeadline(Promise.resolve().then(run), CONTENT_SYNC_RUN_TIMEOUT_MS)
      .then(() => {
        storage.set(storageKeys.contentLastSyncAt, String(now()));
      })
      .catch(() => {
        // Offline is normal. The next launch or foreground tries again.
      })
      .finally(() => {
        running = false;
        markSyncSettled();
      });
  }

  function onForeground(): void {
    if (!shouldSyncOnForeground(storage.getString(storageKeys.contentLastSyncAt), now())) {
      return;
    }
    start();
  }

  return { start, onForeground };
}

export function useContentSync(run: SyncRun = runDeviceContentSync): void {
  const { ready } = useContentDb();
  const runRef = useRef(run);
  const scheduler = useRef<ReturnType<typeof createContentSyncScheduler> | null>(null);

  useEffect(() => {
    runRef.current = run;
  }, [run]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    schedulerFor(scheduler, runRef).start();
  }, [ready]);

  useEffect(() => {
    const current = schedulerFor(scheduler, runRef);
    let subscription: { remove: () => void } | undefined;
    try {
      subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          current.onForeground();
        }
      });
    } catch {
      return undefined;
    }
    return () => subscription?.remove();
  }, []);
}

function schedulerFor(
  scheduler: { current: ReturnType<typeof createContentSyncScheduler> | null },
  runRef: { current: SyncRun },
): ReturnType<typeof createContentSyncScheduler> {
  scheduler.current ??= createContentSyncScheduler(() => runRef.current());
  return scheduler.current;
}
