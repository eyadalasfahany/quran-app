import { Directory, DownloadTask, File, Paths, type DownloadPauseState, type DownloadProgress } from 'expo-file-system';
import { addNetworkStateListener, getNetworkStateAsync, NetworkStateType, type NetworkState } from 'expo-network';
import { AppState, type AppStateStatus } from 'react-native';

import { openContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { openUserDb } from '@/core/db/user/open';

import { chapterAudio, type ChapterAudio } from '../data/audio-files';
import {
  deleteDownload,
  getDownload,
  listDownloadsByStatus,
  listDownloadsForReciter,
  moveDownloadsToStatus,
  patchDownload,
  upsertDownload,
  type DownloadRow,
  type DownloadsStore,
} from '../data/downloads';
import { recitationIdForResource } from '../data/reciters';
import { getWifiOnlyDownloads, useAudioSettings } from '../settings';
import { downloadPathFor, fileForDownloadPath, reciterDirectoryPath } from './files';
import { useDownloadProgress } from './store';

// Recitation audio is downloaded one surah at a time, in the order queued. Only QF's audio URLs from
// `chapter_audio_files` are fetched (CLAUDE.md, non-negotiable 2). Sizes come from Content-Length.

const PROGRESS_WRITE_INTERVAL_MS = 1000;

type ManagerDeps = {
  userDb: SqlExecutor;
  contentDb: SqlExecutor;
  now: () => number;
};

let overrides: Partial<ManagerDeps> = {};

/** Replaces the databases and clock the manager uses. Tests use it; the app uses the open databases. */
export function configureDownloadManager(next: Partial<ManagerDeps>): void {
  overrides = next;
}

function userStore(): DownloadsStore {
  return { db: overrides.userDb ?? openUserDb().executor };
}

function contentDb(): SqlExecutor {
  return overrides.contentDb ?? openContentDb().executor;
}

function now(): number {
  return overrides.now ? overrides.now() : Date.now();
}

type Transfer = {
  audioFileId: number;
  reciterResourceId: number;
  token: object;
  task: DownloadTask;
  resumed: boolean;
  sizeRecorded: boolean;
  lastWriteAt: number;
  /** Set while a pause is being saved. The download's promise then resolves with null, which is expected. */
  pausing: boolean;
};

// One transfer runs at a time. Everything else waits in the downloads table.
let active: Transfer | null = null;
let network: NetworkState | null = null;
let backgrounded = false;
let started = false;
let cleanups: (() => void)[] = [];
// Queue order. It lives in memory: rows restored after a relaunch are ordered by audio file id.
const queueOrder = new Map<number, number>();
let nextQueueOrder = 1;

function orderOf(audioFileId: number): number {
  let order = queueOrder.get(audioFileId);
  if (order === undefined) {
    order = nextQueueOrder;
    nextQueueOrder += 1;
    queueOrder.set(audioFileId, order);
  }
  return order;
}

type Gate = 'unknown' | 'open' | 'wait-wifi' | 'wait-network';

/** Whether downloads may run now. With Wi-Fi only on, anything but Wi-Fi waits; otherwise any connection will do. */
export function networkGate(state: NetworkState | null, wifiOnly: boolean): Gate {
  if (state === null) {
    return 'unknown';
  }
  const connected = state.isConnected === true;
  if (wifiOnly) {
    return connected && state.type === NetworkStateType.WIFI ? 'open' : 'wait-wifi';
  }
  return connected ? 'open' : 'wait-network';
}

function clampFraction(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function deleteFileOf(row: Pick<DownloadRow, 'localPath'>): void {
  const file = fileForDownloadPath(row.localPath);
  if (file.exists) {
    file.delete();
  }
}

function nextCandidate(): DownloadRow | undefined {
  // Rows the queue has not seen since launch take their order from audio file id (the query's order).
  const rows = listDownloadsByStatus(['queued', 'paused', 'waiting_wifi'], userStore());
  for (const row of rows) {
    orderOf(row.audioFileId);
  }
  return [...rows].sort((a, b) => orderOf(a.audioFileId) - orderOf(b.audioFileId))[0];
}

/** Starts the next queued item when the network allows it. Does nothing while a transfer runs. */
function pump(): void {
  if (!started || active !== null || backgrounded) {
    return;
  }
  const gate = networkGate(network, getWifiOnlyDownloads());
  if (gate === 'unknown') {
    return;
  }
  if (gate === 'wait-wifi') {
    moveDownloadsToStatus(['queued', 'paused'], 'waiting_wifi', userStore());
  } else if (gate === 'wait-network') {
    moveDownloadsToStatus(['waiting_wifi'], 'queued', userStore());
  }
  if (gate !== 'open') {
    return;
  }
  const next = nextCandidate();
  if (next !== undefined) {
    start(next);
  }
}

/**
 * A byte count from expo-file-system. Its types say number, but on iOS the native 64-bit counts arrive as BigInt,
 * which Math and division reject ("Cannot convert BigInt to number"). Audio files are far below 2^53 bytes.
 */
export function byteCount(value: number | bigint | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const count = Number(value);
  return Number.isFinite(count) ? count : null;
}

function handleProgress(token: object, data: DownloadProgress): void {
  const transfer = active;
  if (transfer === null || transfer.token !== token) {
    return;
  }
  const written = byteCount(data.bytesWritten) ?? 0;
  const total = byteCount(data.totalBytes) ?? 0;
  const fraction = total > 0 ? clampFraction(written / total) : 0;
  useDownloadProgress.getState().set(transfer.audioFileId, fraction);
  // Content-Length is the size of a fresh response. A resumed response reports only the remaining bytes, so it is not used.
  if (!transfer.resumed && !transfer.sizeRecorded && total > 0) {
    transfer.sizeRecorded = true;
    patchDownload(transfer.audioFileId, { sizeBytes: total }, userStore());
  }
  const time = now();
  if (time - transfer.lastWriteAt >= PROGRESS_WRITE_INTERVAL_MS) {
    transfer.lastWriteAt = time;
    patchDownload(transfer.audioFileId, { progress: fraction }, userStore());
  }
}

/** Marks a row failed and clears its progress. The queue then moves on to the next item. */
function recordFailure(audioFileId: number, error: unknown): void {
  patchDownload(audioFileId, { status: 'failed', resumeData: null }, userStore());
  useDownloadProgress.getState().clear(audioFileId);
  console.warn('Audio download failed.', error);
}

function failTransfer(token: object, error: unknown): void {
  const transfer = active;
  if (transfer === null || transfer.token !== token) {
    return;
  }
  active = null;
  recordFailure(transfer.audioFileId, error);
  pump();
}

function finishTransfer(token: object, file: File | null): void {
  const transfer = active;
  if (transfer === null || transfer.token !== token) {
    return;
  }
  if (file === null) {
    // Paused: pauseActive() saves the row. Any other empty result is a failure.
    if (!transfer.pausing) {
      failTransfer(token, new Error('The download stopped without a file.'));
    }
    return;
  }
  active = null;
  const row = getDownload(transfer.audioFileId, userStore());
  const time = now();
  patchDownload(
    transfer.audioFileId,
    {
      status: 'done',
      progress: 1,
      sizeBytes: row?.sizeBytes ?? byteCount(file.info().size),
      downloadedAt: time,
      verifiedAt: time,
      resumeData: null,
    },
    userStore(),
  );
  useDownloadProgress.getState().clear(transfer.audioFileId);
  pump();
}

function start(row: DownloadRow): void {
  const token = {};
  const resumed = row.resumeData !== null;
  let task: DownloadTask;
  try {
    const onProgress = (data: DownloadProgress) => handleProgress(token, data);
    if (resumed) {
      task = DownloadTask.fromSavable(JSON.parse(row.resumeData ?? '') as DownloadPauseState, { onProgress });
    } else {
      const destination = fileForDownloadPath(row.localPath);
      destination.parentDirectory.create({ idempotent: true, intermediates: true });
      // A fresh start replaces any partial file from an earlier attempt.
      if (destination.exists) {
        destination.delete();
      }
      task = File.createDownloadTask(row.audioUrl, destination, { onProgress });
    }
  } catch (error) {
    recordFailure(row.audioFileId, error);
    pump();
    return;
  }

  active = {
    audioFileId: row.audioFileId,
    reciterResourceId: row.reciterResourceId,
    token,
    task,
    resumed,
    sizeRecorded: false,
    lastWriteAt: 0,
    pausing: false,
  };
  patchDownload(row.audioFileId, { status: 'downloading', resumeData: null }, userStore());
  useDownloadProgress.getState().set(row.audioFileId, row.progress);

  const transfer = resumed ? task.resumeAsync() : task.downloadAsync();
  transfer.then(
    (file) => finishTransfer(token, file),
    (error: unknown) => failTransfer(token, error),
  );
}

/**
 * Stops the transfer in flight and saves what is needed to continue it, as `resume_data`. The row goes to
 * `nextStatus`. A transfer that finished meanwhile is left to finishTransfer.
 */
async function pauseActive(nextStatus: 'paused' | 'waiting_wifi'): Promise<void> {
  const transfer = active;
  if (transfer === null || transfer.pausing) {
    return;
  }
  transfer.pausing = true;
  try {
    await transfer.task.pauseAsync();
  } catch {
    transfer.pausing = false;
    return;
  }
  if (active !== transfer) {
    return;
  }
  try {
    const resumeData = JSON.stringify(transfer.task.savable());
    active = null;
    patchDownload(
      transfer.audioFileId,
      { status: nextStatus, resumeData, progress: useDownloadProgress.getState().byId[transfer.audioFileId] },
      userStore(),
    );
  } catch (error) {
    active = null;
    recordFailure(transfer.audioFileId, error);
    pump();
    return;
  }
  pump();
}

/** After a network or Wi-Fi setting change: pause what can no longer run, then start what can. */
function reevaluate(): void {
  if (active !== null) {
    const gate = networkGate(network, getWifiOnlyDownloads());
    if (gate === 'wait-wifi') {
      void pauseActive('waiting_wifi');
    } else if (gate === 'wait-network') {
      void pauseActive('paused');
    }
  }
  pump();
}

function onAppStateChange(next: AppStateStatus): void {
  if (next === 'background') {
    backgrounded = true;
    void pauseActive('paused');
  } else if (next === 'active') {
    backgrounded = false;
    pump();
  }
}

/** The content row for one surah of one reciter (the lowest id, as the player takes it). */
function audioFor(reciterResourceId: number, chapterId: number): ChapterAudio | undefined {
  const content = contentDb();
  const recitationId = recitationIdForResource(content, reciterResourceId);
  return recitationId === undefined ? undefined : chapterAudio(content, recitationId, chapterId);
}

/** Queues one surah. Returns false when it has no audio, or is already downloaded or queued. */
export function enqueueSurah(reciterResourceId: number, chapterId: number): boolean {
  const audio = audioFor(reciterResourceId, chapterId);
  if (audio === undefined) {
    return false;
  }
  const existing = getDownload(audio.id, userStore());
  if (existing !== undefined && existing.status !== 'failed') {
    return false;
  }
  if (existing !== undefined) {
    deleteFileOf(existing);
  }
  upsertDownload(
    {
      audioFileId: audio.id,
      reciterResourceId,
      chapterId,
      audioUrl: audio.url,
      sourceSizeBytes: audio.sizeBytes,
      localPath: downloadPathFor(reciterResourceId, chapterId, audio.format),
      sizeBytes: null,
      status: 'queued',
      progress: 0,
      resumeData: null,
      downloadedAt: null,
      verifiedAt: null,
    },
    userStore(),
  );
  queueOrder.set(audio.id, nextQueueOrder);
  nextQueueOrder += 1;
  pump();
  return true;
}

/** Queues every surah the reciter has audio for. Returns how many were added. */
export function enqueueAll(reciterResourceId: number): number {
  const content = contentDb();
  const recitationId = recitationIdForResource(content, reciterResourceId);
  if (recitationId === undefined) {
    return 0;
  }
  const chapters = content.all<{ chapterId: number }>(
    `SELECT DISTINCT chapter_id AS chapterId FROM chapter_audio_files WHERE recitation_id = ? ORDER BY chapter_id`,
    [recitationId],
  );
  return chapters.filter((chapter) => enqueueSurah(reciterResourceId, chapter.chapterId)).length;
}

/** Deletes a row and its file. An in-flight transfer for it is stopped first. */
function discard(audioFileId: number): void {
  if (active?.audioFileId === audioFileId) {
    const transfer = active;
    active = null;
    transfer.task.cancel();
  }
  const row = getDownload(audioFileId, userStore());
  if (row !== undefined) {
    deleteFileOf(row);
  }
  deleteDownload(audioFileId, userStore());
  useDownloadProgress.getState().clear(audioFileId);
}

/** Stops a queued or running download and removes its partial file. */
export function cancel(audioFileId: number): void {
  discard(audioFileId);
  pump();
}

/** Deletes a downloaded surah: the file and the row. */
export function remove(audioFileId: number): void {
  discard(audioFileId);
  pump();
}

/**
 * Deletes every download of a reciter, with its folder. Called when the reciter's pack is removed, so the
 * files do not outlive the pack.
 */
export function removeReciter(reciterResourceId: number): void {
  if (active?.reciterResourceId === reciterResourceId) {
    const transfer = active;
    active = null;
    transfer.task.cancel();
  }
  for (const row of listDownloadsForReciter(reciterResourceId, userStore())) {
    deleteFileOf(row);
    deleteDownload(row.audioFileId, userStore());
    useDownloadProgress.getState().clear(row.audioFileId);
  }
  const folder = new Directory(Paths.document, reciterDirectoryPath(reciterResourceId));
  if (folder.exists) {
    folder.delete();
  }
  pump();
}

/**
 * Re-checks every done row against the content database. A file that is gone becomes failed. A row whose QF
 * URL or size changed is deleted and queued again. Otherwise `verified_at` is refreshed.
 */
export function verifyDownloads(): void {
  const time = now();
  for (const row of listDownloadsByStatus(['done'], userStore())) {
    if (!fileForDownloadPath(row.localPath).exists) {
      patchDownload(row.audioFileId, { status: 'failed', verifiedAt: null }, userStore());
      continue;
    }
    const current = audioFor(row.reciterResourceId, row.chapterId);
    if (current === undefined) {
      // No content row to compare with. The file is not re-verified, so it stops playing offline after 7 days.
      continue;
    }
    const changed =
      current.id !== row.audioFileId ||
      current.url !== row.audioUrl ||
      (row.sourceSizeBytes !== null && current.sizeBytes !== row.sourceSizeBytes);
    if (changed) {
      discard(row.audioFileId);
      enqueueSurah(row.reciterResourceId, row.chapterId);
      continue;
    }
    patchDownload(row.audioFileId, { verifiedAt: time }, userStore());
  }
  pump();
}

function onNetworkChanged(state: NetworkState): void {
  network = state;
  reevaluate();
}

/**
 * Starts the manager once: listens for network, app state and the Wi-Fi setting, resumes what the last session
 * left queued or paused, verifies the done rows when there is a connection, and starts the queue.
 * Later calls do nothing.
 */
export async function startDownloadManager(): Promise<void> {
  if (started) {
    return;
  }
  started = true;
  const networkSubscription = addNetworkStateListener(onNetworkChanged);
  const appStateSubscription = AppState.addEventListener('change', onAppStateChange);
  const settings = useAudioSettings.subscribe((state, previous) => {
    if (state.wifiOnlyDownloads !== previous.wifiOnlyDownloads) {
      reevaluate();
    }
  });
  cleanups = [
    () => networkSubscription.remove(),
    () => appStateSubscription.remove(),
    settings,
  ];
  // A transfer killed with the app left its row `downloading`. Nothing runs it now, so it waits again.
  moveDownloadsToStatus(['downloading'], 'queued', userStore());
  try {
    network = await getNetworkStateAsync();
  } catch (error) {
    console.warn('The network state is unknown. Downloads wait for a change.', error);
  }
  if (network?.isConnected === true) {
    verifyDownloads();
  }
  pump();
}

/** Tests only: forgets the queue, listeners and configuration, so each test starts clean. */
export function resetDownloadManagerForTests(): void {
  for (const cleanup of cleanups) {
    cleanup();
  }
  cleanups = [];
  active = null;
  network = null;
  backgrounded = false;
  started = false;
  queueOrder.clear();
  nextQueueOrder = 1;
  overrides = {};
  useDownloadProgress.setState({ byId: {} });
}
