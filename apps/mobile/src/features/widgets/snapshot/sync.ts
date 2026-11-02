import type { WidgetSnapshot } from './types';

/** How long a burst of changes waits before one rebuild (ADR 0035 §4: debounced). */
export const WIDGET_SYNC_DEBOUNCE_MS = 1500;

export type WidgetSyncPorts = {
  /** Reads the local data and builds a snapshot. */
  build: () => Promise<WidgetSnapshot>;
  /** The stored JSON, to skip a write when nothing changed. */
  readStoredJson: () => string | undefined;
  /** Stores the snapshot and asks the widgets to redraw. */
  publish: (snapshot: WidgetSnapshot) => Promise<void> | void;
};

export type WidgetSync = {
  /** Asks for a rebuild after the debounce. Calls inside the window collapse into one. */
  schedule: () => void;
  /** Cancels the pending debounce and rebuilds now. Used when the app goes to the background. */
  flush: () => Promise<void>;
  /** Drops a pending rebuild without running it. */
  cancel: () => void;
};

/** The snapshot's content without its build time: two snapshots that differ only in `writtenAt` are the same. */
export function snapshotContent(snapshot: WidgetSnapshot): string {
  const { writtenAt: _writtenAt, ...content } = snapshot;
  return JSON.stringify(content);
}

function sameAsStored(storedJson: string | undefined, snapshot: WidgetSnapshot): boolean {
  if (storedJson === undefined) {
    return false;
  }
  try {
    return snapshotContent(JSON.parse(storedJson) as WidgetSnapshot) === snapshotContent(snapshot);
  } catch {
    return false;
  }
}

/**
 * A debounced, serialised rebuild. Rebuilds never overlap, so an older build cannot overwrite a newer one. A failed
 * build is dropped: the widgets keep the last snapshot they were given, and the next trigger tries again.
 */
export function createWidgetSync(ports: WidgetSyncPorts, delayMs: number = WIDGET_SYNC_DEBOUNCE_MS): WidgetSync {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let chain: Promise<void> = Promise.resolve();

  const run = (): Promise<void> => {
    chain = chain
      .then(async () => {
        const snapshot = await ports.build();
        if (sameAsStored(ports.readStoredJson(), snapshot)) {
          return;
        }
        await ports.publish(snapshot);
      })
      .catch(() => undefined);
    return chain;
  };

  const clearTimer = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    cancel: clearTimer,
    flush: () => {
      clearTimer();
      return run();
    },
    schedule: () => {
      clearTimer();
      timer = setTimeout(() => {
        timer = null;
        void run();
      }, delayMs);
    },
  };
}
