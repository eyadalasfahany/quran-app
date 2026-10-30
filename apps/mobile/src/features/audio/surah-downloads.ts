import type { DownloadRowState } from '@/shared/ui/DownloadRow';

import type { DownloadStatus } from './data/downloads';

/** What a surah row says under its title. `size` is the file's size in bytes. */
export type SurahSubtitle =
  | { kind: 'queued' | 'waitingWifi' | 'paused' | 'downloading' | 'failed' }
  | { kind: 'size'; bytes: number }
  | null;

export type SurahRowModel = { state: DownloadRowState; subtitle: SurahSubtitle };

/**
 * Maps a surah's download row (or its absence) to the `DownloadRow` state and subtitle. Queued, waiting,
 * paused and running downloads all show the stop button and the bar; a failed download can be tried again.
 */
export function surahRowModel(status: DownloadStatus | undefined, sizeBytes: number | null): SurahRowModel {
  switch (status) {
    case undefined:
      return { state: 'available', subtitle: null };
    case 'failed':
      return { state: 'available', subtitle: { kind: 'failed' } };
    case 'queued':
      return { state: 'downloading', subtitle: { kind: 'queued' } };
    case 'waiting_wifi':
      return { state: 'downloading', subtitle: { kind: 'waitingWifi' } };
    case 'paused':
      return { state: 'downloading', subtitle: { kind: 'paused' } };
    case 'downloading':
      return { state: 'downloading', subtitle: { kind: 'downloading' } };
    case 'done':
      return {
        state: 'installed',
        subtitle: sizeBytes !== null && sizeBytes > 0 ? { kind: 'size', bytes: sizeBytes } : null,
      };
  }
}
