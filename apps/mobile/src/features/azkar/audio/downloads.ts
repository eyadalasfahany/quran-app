import type { AzkarRecording } from '../data/model';

/**
 * The Azkar download seam (ADR 0031 §8). It is not a download manager: `features/audio/downloads/manager.ts` is keyed
 * by Quran `audio_file_id`, and generalising it waits until a licensed recording exists (phase-6.md follow-up).
 * Until then the app binds `NoAudioDownloadPort`, which reports nothing downloadable.
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

const BYTES_PER_MEGABYTE = 1024 * 1024;

/** Megabytes with one decimal place, as the storage summary shows them. */
export function megabytes(bytes: number): number {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return 0;
  }
  return Math.round((bytes / BYTES_PER_MEGABYTE) * 10) / 10;
}

/** Whole percent for a progress fraction, clamped to 0 to 100. */
export function percentOf(progress: number): number {
  if (!Number.isFinite(progress)) {
    return 0;
  }
  return Math.round(Math.min(1, Math.max(0, progress)) * 100);
}
