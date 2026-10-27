import { useEffect, useState } from 'react';

import { ensurePageFont } from './fonts';

export type MushafPageFontState =
  | { status: 'loading' }
  | { status: 'ready'; fontFamily: string }
  | { status: 'error' };

export function useMushafPageFont(page: number): MushafPageFontState {
  const [ready, setReady] = useState<{ page: number; fontFamily: string } | null>(null);
  const [failedPage, setFailedPage] = useState<number | null>(null);

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
  }, [page]);

  if (failedPage === page) {
    return { status: 'error' };
  }
  if (ready?.page === page) {
    return { status: 'ready', fontFamily: ready.fontFamily };
  }
  return { status: 'loading' };
}
