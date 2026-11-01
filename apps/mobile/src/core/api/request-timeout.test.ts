import { isAbortError, isNetworkError, NetworkError, REQUEST_TIMEOUT_MS, requestSignal, withDeadline } from './request-timeout';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('requestSignal', () => {
  it('aborts after the timeout and maps the failure to a timeout network error', () => {
    const request = requestSignal(REQUEST_TIMEOUT_MS);
    jest.advanceTimersByTime(REQUEST_TIMEOUT_MS - 1);
    expect(request.signal.aborted).toBe(false);

    jest.advanceTimersByTime(1);
    expect(request.signal.aborted).toBe(true);

    const error = request.fail(new Error('aborted'));
    expect(isNetworkError(error)).toBe(true);
    expect(error).toMatchObject({ failure: 'timeout', kind: 'network' });
  });

  it('aborts at once when the caller cancels, and returns the cancel as it was', () => {
    const parent = new AbortController();
    const request = requestSignal(REQUEST_TIMEOUT_MS, parent.signal);

    parent.abort();

    expect(request.signal.aborted).toBe(true);
    const cancel = Object.assign(new Error('cancelled'), { name: 'AbortError' });
    expect(request.fail(cancel)).toBe(cancel);
    expect(isNetworkError(request.fail(cancel))).toBe(false);
  });

  it('starts already aborted when the caller had cancelled before the request', () => {
    const parent = new AbortController();
    parent.abort();

    expect(requestSignal(REQUEST_TIMEOUT_MS, parent.signal).signal.aborted).toBe(true);
  });

  it('maps an error that is neither a timeout nor a cancel to an unreachable network error', () => {
    const request = requestSignal(REQUEST_TIMEOUT_MS);

    const error = request.fail(new TypeError('Network request failed'));

    expect(error).toBeInstanceOf(NetworkError);
    expect(error).toMatchObject({ failure: 'unreachable' });
  });

  it('clears its timer when done, so nothing aborts later', () => {
    const request = requestSignal(REQUEST_TIMEOUT_MS);
    request.done();

    jest.advanceTimersByTime(REQUEST_TIMEOUT_MS * 2);

    expect(request.signal.aborted).toBe(false);
  });
});

describe('withDeadline', () => {
  it('resolves with the promise when it settles in time', async () => {
    await expect(withDeadline(Promise.resolve('done'), 1_000)).resolves.toBe('done');
  });

  it('rejects with a timeout network error when the promise is too slow', async () => {
    const pending = withDeadline(new Promise<string>(() => undefined), 1_000).catch((reason: unknown) => reason);

    jest.advanceTimersByTime(1_000);

    const error = await pending;
    expect(isNetworkError(error)).toBe(true);
    expect(error).toMatchObject({ failure: 'timeout' });
  });
});

describe('isAbortError', () => {
  it('recognises an AbortError by name and nothing else', () => {
    expect(isAbortError(Object.assign(new Error('x'), { name: 'AbortError' }))).toBe(true);
    expect(isAbortError(new Error('x'))).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});
