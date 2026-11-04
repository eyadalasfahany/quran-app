import { Directory, Paths } from 'expo-file-system';
import { useEffect, useState } from 'react';

import { fontDirectoryPath } from '@/features/reader/mushaf/fonts';

export type FontStorageBytesResult = {
  /** Sum of bytes of all *.ttf files in the font directory. 0 while loading. */
  bytes: number;
  /** True until the scan has settled (including when the directory does not exist). */
  loading: boolean;
};

export function useFontStorageBytes(): FontStorageBytesResult {
  const [result, setResult] = useState<FontStorageBytesResult>({ bytes: 0, loading: true });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const dir = new Directory(Paths.document, fontDirectoryPath());
        let total = 0;
        if (dir.exists) {
          for (const item of dir.list()) {
            if ('size' in item && typeof item.name === 'string' && item.name.endsWith('.ttf')) {
              total += (item as { size: number }).size;
            }
          }
        }
        if (!cancelled) {
          setResult({ bytes: total, loading: false });
        }
      } catch {
        if (!cancelled) {
          setResult({ bytes: 0, loading: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return result;
}
