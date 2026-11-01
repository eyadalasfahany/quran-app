import { useCallback, useEffect, useRef, useState } from 'react';

import { useOnline } from '@/core/network/useOnline';

import { ensurePageFont } from './fonts';

export type MushafPageFontState =
  | { status: 'loading' }
  | { status: 'ready'; fontFamily: string }
  /** `retry` loads the font again; it also runs by itself when the connection comes back. */
  | { status: 'error'; retry: () => void };

export function useMushafPageFont(page: number): MushafPageFontState {
  const [ready, setReady] = useState<{ page: number; fontFamily: string } | null>(null);
  const [failedPage, setFailedPage] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const online = useOnline();
  const previouslyOnline = useRef(online);

  const retry = useCallback(() => {
    setFailedPage(null);
    setAttempt((count) => count + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void ensurePageFont(page)
      .then((fontFamily) => {
        if (!cancelled) {
          setReady({ page, fontFamily });
          setFailedPage(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailedPage(page);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page, attempt]);

  // The connection came back while this page's font was failing: try again. Only the change counts, so a page
  // that fails while online does not retry in a loop.
  useEffect(() => {
    const returned = online && !previouslyOnline.current;
    previouslyOnline.current = online;
    if (returned && failedPage === page) {
      retry();
    }
  }, [online, failedPage, page, retry]);

  if (failedPage === page) {
    return { retry, status: 'error' };
  }
  if (ready?.page === page) {
    return { status: 'ready', fontFamily: ready.fontFamily };
  }
  return { status: 'loading' };
}
