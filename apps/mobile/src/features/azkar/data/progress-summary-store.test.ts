import type { ScopeSummary } from './progress';
import { createSharedSummaries, type SummarySource } from './progress-summary-store';

const ROWS: ScopeSummary[] = [{ completedUnits: 1, periodKey: 'session', scopeKey: 'entry:a', updatedAt: 1 }];

function fakeSource(rows: ScopeSummary[] = ROWS) {
  let onChange: (() => void) | null = null;
  const stop = jest.fn();
  const source: SummarySource = {
    load: jest.fn(() => Promise.resolve(rows)),
    watch: jest.fn((listener: () => void) => {
      onChange = listener;
      return stop;
    }),
  };
  return { source, stop, change: () => onChange?.() };
}

const flush = () => new Promise<void>((resolve) => setImmediate(() => resolve()));

describe('shared Azkar progress summaries', () => {
  it('runs one query and one change listener however many consumers subscribe', async () => {
    const { source } = fakeSource();
    const store = createSharedSummaries(source);

    const first = jest.fn();
    const second = jest.fn();
    const third = jest.fn();
    store.subscribe(first);
    store.subscribe(second);
    store.subscribe(third);
    await flush();

    expect(source.load).toHaveBeenCalledTimes(1);
    expect(source.watch).toHaveBeenCalledTimes(1);
  });

  it('shares the loaded rows with every consumer, with the same array identity', async () => {
    const { source } = fakeSource();
    const store = createSharedSummaries(source);
    store.subscribe(() => undefined);
    store.subscribe(() => undefined);
    await flush();

    expect(store.getSnapshot()).toEqual(ROWS);
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it('re-reads once on a change and notifies every consumer', async () => {
    const { source, change } = fakeSource();
    const store = createSharedSummaries(source);
    const first = jest.fn();
    const second = jest.fn();
    store.subscribe(first);
    store.subscribe(second);
    await flush();
    jest.mocked(source.load).mockResolvedValueOnce([{ ...ROWS[0]!, completedUnits: 4 }]);

    change();
    await flush();

    expect(source.load).toHaveBeenCalledTimes(2);
    expect(first).toHaveBeenCalled();
    expect(second).toHaveBeenCalled();
    expect(store.getSnapshot()[0]?.completedUnits).toBe(4);
  });

  it('stops the change listener when the last consumer leaves, and starts it again for a new one', async () => {
    const { source, stop } = fakeSource();
    const store = createSharedSummaries(source);
    const unsubscribeA = store.subscribe(() => undefined);
    const unsubscribeB = store.subscribe(() => undefined);

    unsubscribeA();
    expect(stop).not.toHaveBeenCalled();
    unsubscribeB();
    expect(stop).toHaveBeenCalledTimes(1);

    store.subscribe(() => undefined);
    expect(source.watch).toHaveBeenCalledTimes(2);
  });

  it('keeps the previous rows when a load fails, instead of throwing into the UI', async () => {
    const { source } = fakeSource();
    jest.mocked(source.load).mockRejectedValueOnce(new Error('user.db closed'));
    const store = createSharedSummaries(source);

    expect(() => store.subscribe(() => undefined)).not.toThrow();
    await flush();
    expect(store.getSnapshot()).toEqual([]);
  });
});
