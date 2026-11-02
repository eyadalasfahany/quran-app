import { useMemo } from 'react';

import { openContentDb } from '@/core/db/content/open';
import { useContentReady } from '@/core/db/content/content-ready';
import { getVerseByKey } from '@/features/reader/data/verses';

/** Al-Fatihah 1:1, the basmala, read from `content.db` as stored. The app bundles no Quran text of its own. */
export const PREVIEW_VERSE_KEY = '1:1';

/**
 * The stored text of the preview verse, or null while `content.db` is not ready or cannot be read. A null shows no
 * Quran text at all: the screen never falls back to a literal.
 */
export function usePreviewVerseText(): string | null {
  const ready = useContentReady((state) => state.ready);

  return useMemo(() => {
    if (!ready) {
      return null;
    }
    try {
      return getVerseByKey(openContentDb().executor, PREVIEW_VERSE_KEY)?.textUthmani ?? null;
    } catch {
      return null;
    }
  }, [ready]);
}
