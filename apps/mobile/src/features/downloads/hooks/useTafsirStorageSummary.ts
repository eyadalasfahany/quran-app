import { useMemo } from 'react';

import { openContentDb } from '@/core/db/content/open';
import { listCatalogTafsirs } from '@/features/reader/data/tafsir';

export type TafsirSizeSummary = {
  resourceId: number;
  nameAr: string | null;
  packSizeBytes: number;
};

export type TafsirStorageSummaryResult = {
  perTafsir: TafsirSizeSummary[];
  totalBytes: number;
};

export function useTafsirStorageSummary(): TafsirStorageSummaryResult {
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- empty deps: parent remounts after install sync
  return useMemo(() => {
    let rows;
    try {
      rows = listCatalogTafsirs(openContentDb().executor);
    } catch {
      return { perTafsir: [], totalBytes: 0 };
    }
    const perTafsir = rows
      .filter((r) => r.installed)
      .map((r) => ({ resourceId: r.resourceId, nameAr: r.nameAr, packSizeBytes: r.packSizeBytes }));
    const totalBytes = perTafsir.reduce((acc, r) => acc + r.packSizeBytes, 0);
    return { perTafsir, totalBytes };
  }, []);
}
