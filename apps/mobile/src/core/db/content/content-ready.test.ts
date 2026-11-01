import { publishContentReady, useContentReady } from './content-ready';

describe('shared content readiness', () => {
  afterEach(() => {
    publishContentReady({ ready: false, error: null });
  });

  it('starts not ready, with no error', () => {
    expect(useContentReady.getState()).toEqual({ ready: false, error: null });
  });

  it('publishes the root’s result to every reader of the store', () => {
    const seen: boolean[] = [];
    const unsubscribe = useContentReady.subscribe((state) => seen.push(state.ready));

    publishContentReady({ ready: true, error: null });

    expect(useContentReady.getState().ready).toBe(true);
    expect(seen).toEqual([true]);
    unsubscribe();
  });

  it('publishes a migration error so every reader sees it, not only the root', () => {
    const error = new Error('migration failed');
    publishContentReady({ ready: false, error });

    expect(useContentReady.getState().error).toBe(error);
  });
});
