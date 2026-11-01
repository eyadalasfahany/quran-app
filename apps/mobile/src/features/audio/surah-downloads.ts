import type { DownloadRowState } from '@/shared/ui/DownloadRow';

import type { DownloadStatus } from './data/downloads';

/** What a surah row says under its title. `size` is the file's size in bytes. */
export type SurahSubtitle =
  | { kind: 'queued' | 'waitingWifi' | 'paused' | 'downloading' | 'failed' }
  | { kind: 'size'; bytes: number }
  /** Not downloaded and the device is offline. */
  | { kind: 'offline' }
  /** Downloaded, but it needs a connection to verify it (the 7-day licence rule). */
  | { kind: 'verify' }
  | null;

export type SurahRowContext = {
  /** The device is known to be offline. */
  offline?: boolean;
  /** The finished download needs verifying (see needsVerification). */
  verifyNeeded?: boolean;
};

export type SurahRowModel = { state: DownloadRowState; subtitle: SurahSubtitle };

/**
 * Maps a surah's download row (or its absence) to the `DownloadRow` state and subtitle. Queued, waiting,
 * paused and running downloads all show the stop button and the bar; a failed download can be tried again.
 */
export function surahRowModel(
  status: DownloadStatus | undefined,
  sizeBytes: number | null,
  context: SurahRowContext = {},
): SurahRowModel {
  switch (status) {
    case undefined:
      return { state: 'available', subtitle: context.offline === true ? { kind: 'offline' } : null };
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
      if (context.verifyNeeded === true) {
        return { state: 'installed', subtitle: { kind: 'verify' } };
      }
      return {
        state: 'installed',
        subtitle: sizeBytes !== null && sizeBytes > 0 ? { kind: 'size', bytes: sizeBytes } : null,
      };
  }
}
