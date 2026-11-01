// Every request the app makes stops after this long, so a dead connection never holds a screen or a sync run.
export const REQUEST_TIMEOUT_MS = 15_000;

export type NetworkFailure = 'timeout' | 'unreachable';

/**
 * A request that got no answer in time, or never reached the server. Callers show the offline or the retry
 * copy for it. A cancelled request is not a network error: it keeps its AbortError.
 */
export class NetworkError extends Error {
  readonly kind = 'network' as const;
  readonly failure: NetworkFailure;

  constructor(failure: NetworkFailure, options?: { cause?: unknown }) {
    super(failure === 'timeout' ? 'The request timed out.' : 'The request could not reach the server.', options);
    this.name = 'NetworkError';
    this.failure = failure;
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
}

export type RequestSignal = {
  /** Aborts when the timeout fires or the caller's signal aborts, whichever comes first. */
  signal: AbortSignal;
  /** Maps a thrown fetch error: a timeout or an unreachable server becomes a NetworkError; a cancel is returned as it was. */
  fail: (error: unknown) => unknown;
  /** Clears the timer and the listener. Call it once the response headers have arrived (or the request failed). */
  done: () => void;
};

/**
 * One AbortSignal that fires on a timeout or on the caller's signal. Written by hand rather than with
 * AbortSignal.any, which Hermes does not guarantee.
 */
export function requestSignal(timeoutMs: number = REQUEST_TIMEOUT_MS, parent?: AbortSignal): RequestSignal {
  const controller = new AbortController();
  let timedOut = false;
  const onParentAbort = () => {
    controller.abort();
  };
  if (parent?.aborted === true) {
    controller.abort();
  } else {
    parent?.addEventListener('abort', onParentAbort);
  }
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    fail: (error) => {
      if (timedOut) {
        return new NetworkError('timeout', { cause: error });
      }
      if (parent?.aborted === true || isAbortError(error)) {
        return error;
      }
      return new NetworkError('unreachable', { cause: error });
    },
    done: () => {
      clearTimeout(timer);
      parent?.removeEventListener('abort', onParentAbort);
    },
  };
}

/**
 * Rejects with a timeout NetworkError when `promise` has not settled within `timeoutMs`. The promise itself is
 * not cancelled: the caller stops waiting for it, and the timer is cleared as soon as it settles.
 */
export async function withDeadline<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new NetworkError('timeout'));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, deadline]);
  } finally {
    clearTimeout(timer);
  }
}
