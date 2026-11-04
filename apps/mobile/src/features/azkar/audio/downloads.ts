import type { AzkarRecording } from '../data/model';

/**
 * The Azkar download seam (ADR 0031 §8, ADR 0040). Quran downloads stay in `features/audio/downloads/manager.ts`
 * (`audio_file_id`). Azkar uses `file-download-port.ts` under `audio/azkar/`. The app binds `azkarDownloadPort` from
 * `./port`; tests use `NoAudioDownloadPort` when they need an empty store.
 */

export type AzkarDownloadState = 'idle' | 'downloading' | 'done' | 'failed';

/** One downloaded or downloading recording. `progress` is 0 to 1 and only moves while downloading. */
export type AzkarDownloadEntry = {
  recording: AzkarRecording;
  recordingKey: string;
  categoryId: string;
  title: string;
  state: AzkarDownloadState;
  progress: number;
  bytes: number | null;
};

export interface AzkarDownloadPort {
  /** Every recording the port knows about, in the order it lists them. */
  list(): AzkarDownloadEntry[];
  /** The entry for one recording, or null when it was never queued. */
  status(recordingKey: string): AzkarDownloadEntry | null;
  enqueue(recording: AzkarRecording): void;
  cancel(recordingKey: string): void;
  remove(recordingKey: string): void;
  /** Removes every recording of one category. */
  removeCategory(categoryId: string): void;
  /** Bytes used by downloaded recordings. */
  storageBytes(): number;
  /**
   * The local file of a downloaded recording, or null. The player plays it before streaming (ADR 0040). Optional, so a
   * port without files (none is bound today) streams every recording.
   */
  localUri?(recordingKey: string): string | null;
}

/** The port the app binds today: no recording is licensed, so nothing is downloadable and nothing is stored. */
export const NoAudioDownloadPort: AzkarDownloadPort = {
  list: () => [],
  status: () => null,
  enqueue: () => undefined,
  cancel: () => undefined,
  remove: () => undefined,
  removeCategory: () => undefined,
  storageBytes: () => 0,
};

export { megabytes } from '@/core/format/megabytes';

/** Whole percent for a progress fraction, clamped to 0 to 100. */
export function percentOf(progress: number): number {
  if (!Number.isFinite(progress)) {
    return 0;
  }
  return Math.round(Math.min(1, Math.max(0, progress)) * 100);
}
