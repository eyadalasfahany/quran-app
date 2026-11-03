import { Directory, DownloadTask, File, Paths, type DownloadProgress } from 'expo-file-system';
import { addNetworkStateListener, getNetworkStateAsync, type NetworkState } from 'expo-network';

import { apiBaseUrl } from '@/core/api/base-url';
import { byteCount, networkGate } from '@/features/audio/downloads/manager';
import { getWifiOnlyDownloads } from '@/features/audio/settings';

import { resolveAudioUrl } from './audio-url';
import type { AzkarDownloadEntry, AzkarDownloadPort, AzkarDownloadState } from './downloads';
import type { AzkarRecording } from '../data/model';

/** Every Azkar offline recording shares this category id until packs carry per-category metadata (ADR 0040). */
export const AZKAR_DOWNLOAD_CATEGORY_ID = 'azkar';

const AUDIO_DIRECTORY = 'audio/azkar';
const INDEX_RELATIVE_PATH = `${AUDIO_DIRECTORY}/index.json`;
const MANIFEST_VERSION = 1 as const;

type PersistedEntry = {
  recordingKey: string;
  categoryId: string;
  title: string;
  state: Extract<AzkarDownloadState, 'done' | 'failed'>;
  bytes: number | null;
  recording: AzkarRecording;
};

type PersistedManifest = {
  version: typeof MANIFEST_VERSION;
  entries: PersistedEntry[];
};

type Transfer = {
  recordingKey: string;
  token: object;
  task: DownloadTask;
  expectedBytes: number | null;
};

type PortDeps = {
  apiBase: () => string;
  wifiOnly: () => boolean;
};

let deps: PortDeps = {
  apiBase: apiBaseUrl,
  wifiOnly: getWifiOnlyDownloads,
};

/** Test hook: swap API base or Wi‑Fi-only reads without touching Quran downloads. */
export function configureAzkarFileDownloadPort(next: Partial<PortDeps>): void {
  deps = { ...deps, ...next };
}

/** Replaces unsafe path characters in a recording key. */
export function sanitizeRecordingKeyForPath(recordingKey: string): string {
  return recordingKey.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function relativePathFor(recordingKey: string): string {
  return `${AUDIO_DIRECTORY}/${sanitizeRecordingKeyForPath(recordingKey)}.mp3`;
}

function fileForRecording(recordingKey: string): File {
  return new File(Paths.document, relativePathFor(recordingKey));
}

function indexFile(): File {
  return new File(Paths.document, INDEX_RELATIVE_PATH);
}

function ensureAudioDirectory(): void {
  new Directory(Paths.document, AUDIO_DIRECTORY).create({ idempotent: true, intermediates: true });
}

function titleFor(recording: AzkarRecording): string {
  const name = recording.reciterName.trim();
  return name.length > 0 ? name : recording.recordingKey;
}

function clampFraction(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function readManifest(): PersistedManifest {
  const file = indexFile();
  if (!file.exists) {
    return { version: MANIFEST_VERSION, entries: [] };
  }
  try {
    const parsed = JSON.parse(file.textSync()) as PersistedManifest;
    if (parsed.version !== MANIFEST_VERSION || !Array.isArray(parsed.entries)) {
      return { version: MANIFEST_VERSION, entries: [] };
    }
    return parsed;
  } catch {
    return { version: MANIFEST_VERSION, entries: [] };
  }
}

function writeManifest(entries: PersistedEntry[]): void {
  ensureAudioDirectory();
  const file = indexFile();
  const payload: PersistedManifest = { version: MANIFEST_VERSION, entries };
  file.writeSync(JSON.stringify(payload));
}

function persistedEntries(): PersistedEntry[] {
  return readManifest().entries;
}

function persistDoneAndFailed(inMemory: Map<string, AzkarDownloadEntry>): void {
  const persisted: PersistedEntry[] = [];
  for (const entry of inMemory.values()) {
    if (entry.state === 'done' || entry.state === 'failed') {
      persisted.push({
        recordingKey: entry.recordingKey,
        categoryId: entry.categoryId,
        title: entry.title,
        state: entry.state,
        bytes: entry.bytes,
        recording: entry.recording,
      });
    }
  }
  writeManifest(persisted);
}

function deleteRecordingFile(recordingKey: string): void {
  const file = fileForRecording(recordingKey);
  if (file.exists) {
    file.delete();
  }
}

function createAzkarFileDownloadPort(): AzkarDownloadPort & { resetForTests(): void } {
  const entries = new Map<string, AzkarDownloadEntry>();
  const queue: string[] = [];
  let active: Transfer | null = null;
  let network: NetworkState | null = null;
  let started = false;
  let hydrated = false;

  function hydrateFromDisk(): void {
    if (hydrated) {
      return;
    }
    hydrated = true;
    for (const row of persistedEntries()) {
      entries.set(row.recordingKey, {
        recording: row.recording,
        recordingKey: row.recordingKey,
        categoryId: row.categoryId,
        title: row.title,
        state: row.state,
        progress: row.state === 'done' ? 1 : 0,
        bytes: row.bytes,
      });
    }
  }

  function notifyChange(): void {
    for (const listener of changeListeners) {
      listener();
    }
  }

  function upsert(entry: AzkarDownloadEntry): void {
    entries.set(entry.recordingKey, entry);
    notifyChange();
  }

  function removeEntry(recordingKey: string): void {
    entries.delete(recordingKey);
    const index = queue.indexOf(recordingKey);
    if (index >= 0) {
      queue.splice(index, 1);
    }
    notifyChange();
  }

  function enqueueOrder(recordingKey: string): void {
    if (!queue.includes(recordingKey)) {
      queue.push(recordingKey);
    }
  }

  function pump(): void {
    if (!started || active !== null) {
      return;
    }
    const gate = networkGate(network, deps.wifiOnly());
    if (gate === 'unknown' || gate !== 'open') {
      return;
    }
    while (queue.length > 0) {
      const nextKey = queue[0];
      if (nextKey === undefined) {
        queue.shift();
        continue;
      }
      const entry = entries.get(nextKey);
      if (entry === undefined || (entry.state !== 'downloading' && entry.state !== 'failed')) {
        queue.shift();
        continue;
      }
      if (entry.state === 'failed') {
        entry.state = 'downloading';
        entry.progress = 0;
        entry.bytes = null;
      }
      startTransfer(entry);
      return;
    }
  }

  function markFailed(recordingKey: string, error: unknown): void {
    deleteRecordingFile(recordingKey);
    const entry = entries.get(recordingKey);
    if (entry === undefined) {
      return;
    }
    entry.state = 'failed';
    entry.progress = 0;
    entry.bytes = null;
    persistDoneAndFailed(entries);
    console.warn('Azkar audio download failed.', error);
  }

  function finishTransfer(token: object, file: File | null): void {
    const transfer = active;
    if (transfer === null || transfer.token !== token) {
      return;
    }
    active = null;
    queue.shift();
    const entry = entries.get(transfer.recordingKey);
    if (entry === undefined) {
      pump();
      return;
    }
    if (file === null) {
      markFailed(transfer.recordingKey, new Error('The download stopped without a file.'));
      pump();
      return;
    }
    const size = byteCount(file.info().size) ?? 0;
    if (transfer.expectedBytes !== null && size !== transfer.expectedBytes) {
      markFailed(transfer.recordingKey, new Error('Downloaded size did not match the catalogue.'));
      pump();
      return;
    }
    entry.state = 'done';
    entry.progress = 1;
    entry.bytes = size;
    persistDoneAndFailed(entries);
    pump();
  }

  function failTransfer(token: object, error: unknown): void {
    const transfer = active;
    if (transfer === null || transfer.token !== token) {
      return;
    }
    active = null;
    queue.shift();
    if (!entries.has(transfer.recordingKey)) {
      pump();
      return;
    }
    markFailed(transfer.recordingKey, error);
    pump();
  }

  function handleProgress(token: object, data: DownloadProgress): void {
    const transfer = active;
    if (transfer === null || transfer.token !== token) {
      return;
    }
    const entry = entries.get(transfer.recordingKey);
    if (entry === undefined) {
      return;
    }
    const written = byteCount(data.bytesWritten) ?? 0;
    const total = byteCount(data.totalBytes) ?? 0;
    entry.progress = total > 0 ? clampFraction(written / total) : entry.progress;
    notifyChange();
  }

  function startTransfer(entry: AzkarDownloadEntry): void {
    const token = {};
    const destination = fileForRecording(entry.recordingKey);
    destination.parentDirectory.create({ idempotent: true, intermediates: true });
    if (destination.exists) {
      destination.delete();
    }
    const url = resolveAudioUrl(entry.recording.remoteUrl, deps.apiBase());
    if (url.length === 0) {
      markFailed(entry.recordingKey, new Error('The recording URL is missing.'));
      queue.shift();
      pump();
      return;
    }
    let task: DownloadTask;
    try {
      task = File.createDownloadTask(url, destination, {
        onProgress: (data) => handleProgress(token, data),
      });
    } catch (error) {
      markFailed(entry.recordingKey, error);
      queue.shift();
      pump();
      return;
    }
    active = {
      recordingKey: entry.recordingKey,
      token,
      task,
      expectedBytes: entry.recording.sizeBytes,
    };
    entry.state = 'downloading';
    entry.progress = 0;
    entry.bytes = null;
    notifyChange();
    task.downloadAsync().then(
      (file) => finishTransfer(token, file),
      (error: unknown) => failTransfer(token, error),
    );
  }

  function kick(): void {
    if (!started) {
      void startListeners();
      return;
    }
    if (network === null) {
      getNetworkStateAsync()
        .then((state) => {
          network = state;
          pump();
        })
        .catch(() => undefined);
      return;
    }
    pump();
  }

  async function startListeners(): Promise<void> {
    if (started) {
      return;
    }
    started = true;
    hydrateFromDisk();
    try {
      network = await getNetworkStateAsync();
    } catch {
      network = null;
    }
    const subscription = addNetworkStateListener((state) => {
      network = state;
      pump();
    });
    cleanups.push(() => subscription.remove());
    pump();
  }

  const changeListeners = new Set<() => void>();
  const cleanups: (() => void)[] = [];

  const port: AzkarDownloadPort & { resetForTests(): void; subscribe(listener: () => void): () => void } = {
    list(): AzkarDownloadEntry[] {
      hydrateFromDisk();
      return [...entries.values()];
    },
    status(recordingKey: string): AzkarDownloadEntry | null {
      hydrateFromDisk();
      return entries.get(recordingKey) ?? null;
    },
    enqueue(recording: AzkarRecording): void {
      hydrateFromDisk();
      const existing = entries.get(recording.recordingKey);
      const next: AzkarDownloadEntry = {
        recording,
        recordingKey: recording.recordingKey,
        categoryId: AZKAR_DOWNLOAD_CATEGORY_ID,
        title: titleFor(recording),
        state: 'downloading',
        progress: 0,
        bytes: null,
      };
      if (existing?.state === 'done') {
        deleteRecordingFile(recording.recordingKey);
      }
      upsert(next);
      enqueueOrder(recording.recordingKey);
      kick();
    },
    cancel(recordingKey: string): void {
      hydrateFromDisk();
      if (active?.recordingKey === recordingKey) {
        active.task.cancel();
        active = null;
        queue.shift();
      } else {
        const index = queue.indexOf(recordingKey);
        if (index >= 0) {
          queue.splice(index, 1);
        }
      }
      deleteRecordingFile(recordingKey);
      removeEntry(recordingKey);
      persistDoneAndFailed(entries);
      pump();
    },
    remove(recordingKey: string): void {
      port.cancel(recordingKey);
    },
    removeCategory(categoryId: string): void {
      hydrateFromDisk();
      for (const key of [...entries.keys()]) {
        const entry = entries.get(key);
        if (entry?.categoryId === categoryId) {
          port.remove(key);
        }
      }
    },
    storageBytes(): number {
      hydrateFromDisk();
      let total = 0;
      for (const entry of entries.values()) {
        if (entry.state !== 'done') {
          continue;
        }
        const file = fileForRecording(entry.recordingKey);
        if (file.exists) {
          total += byteCount(file.info().size) ?? entry.bytes ?? 0;
        } else if (entry.bytes !== null) {
          total += entry.bytes;
        }
      }
      return total;
    },
    localUri(recordingKey: string): string | null {
      hydrateFromDisk();
      const entry = entries.get(recordingKey);
      if (entry?.state !== 'done') {
        return null;
      }
      const file = fileForRecording(recordingKey);
      return file.exists ? file.uri : null;
    },
    subscribe(listener: () => void): () => void {
      changeListeners.add(listener);
      return () => {
        changeListeners.delete(listener);
      };
    },
    resetForTests(): void {
      const keys = [...entries.keys()];
      if (active !== null) {
        active.task.cancel();
      }
      active = null;
      queue.length = 0;
      entries.clear();
      changeListeners.clear();
      for (const cleanup of cleanups) {
        cleanup();
      }
      cleanups.length = 0;
      started = false;
      hydrated = false;
      network = null;
      for (const key of keys) {
        deleteRecordingFile(key);
      }
      resetFakeManifestDirectory();
    },
  };

  return port;
}

export const azkarFileDownloadPort = createAzkarFileDownloadPort();

/** Clears transfers, listeners and on-disk test files. Jest calls this between cases. */
export function resetAzkarFileDownloadPortForTests(): void {
  deps = { apiBase: apiBaseUrl, wifiOnly: getWifiOnlyDownloads };
  azkarFileDownloadPort.resetForTests();
}

function resetFakeManifestDirectory(): void {
  try {
    new Directory(Paths.document, AUDIO_DIRECTORY).delete();
  } catch {
    // The directory may not exist yet in a test.
  }
}
