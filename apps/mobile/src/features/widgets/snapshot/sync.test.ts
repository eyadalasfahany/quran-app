import { createWidgetSync } from './sync';
import { fullSnapshot } from './test-fixtures';
import type { WidgetSnapshot } from './types';

function setup(initialStored?: WidgetSnapshot) {
  let stored: string | undefined = initialStored === undefined ? undefined : JSON.stringify(initialStored);
  let current = fullSnapshot();
  const publish = jest.fn((snapshot: WidgetSnapshot) => {
    stored = JSON.stringify(snapshot);
  });
  const build = jest.fn(async () => current);
  const sync = createWidgetSync({ build, publish, readStoredJson: () => stored }, 1000);
  return {
    build,
    publish,
    sync,
    setCurrent: (snapshot: WidgetSnapshot) => {
      current = snapshot;
    },
  };
}

describe('createWidgetSync', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('collapses a burst of schedules into one rebuild after the debounce', async () => {
    const { build, sync } = setup();
    sync.schedule();
    sync.schedule();
    sync.schedule();
    jest.advanceTimersByTime(999);
    expect(build).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await jest.runOnlyPendingTimersAsync();
    expect(build).toHaveBeenCalledTimes(1);
  });

  it('publishes a new snapshot', async () => {
    const { publish, sync } = setup();
    await sync.flush();
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('writes nothing when the content is unchanged, even with a newer build time', async () => {
    const stored = fullSnapshot();
    const { publish, setCurrent, sync } = setup(stored);
    setCurrent({ ...stored, writtenAt: stored.writtenAt + 60_000 });
    await sync.flush();
    expect(publish).not.toHaveBeenCalled();
  });

  it('publishes when the content changed', async () => {
    const stored = fullSnapshot();
    const { publish, setCurrent, sync } = setup(stored);
    setCurrent({ ...stored, misbaha: { count: 34, target: 100, todayTotal: 151 } });
    await sync.flush();
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('flush runs at once and cancels the pending debounce', async () => {
    const { build, sync } = setup();
    sync.schedule();
    await sync.flush();
    expect(build).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(5000);
    await jest.runOnlyPendingTimersAsync();
    expect(build).toHaveBeenCalledTimes(1);
  });

  it('drops a failed build without throwing, so the next trigger tries again', async () => {
    const publish = jest.fn();
    const sync = createWidgetSync(
      { build: async () => Promise.reject(new Error('no database')), publish, readStoredJson: () => undefined },
      1000,
    );
    await expect(sync.flush()).resolves.toBeUndefined();
    expect(publish).not.toHaveBeenCalled();
  });
});
