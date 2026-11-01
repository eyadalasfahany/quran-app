import type { AzkarDownloadEntry, AzkarDownloadPort } from '@/features/azkar/audio/downloads';
import type { AzkarRecording } from '@/features/azkar/data/model';

/**
 * Azkar audio test builders. No real recording exists (ADR 0031 §8): the URL is a placeholder on a `.invalid` host,
 * and the attribution and licence text are marked fixtures. A fixture recording is a licensed recording for tests only.
 */

export const FIXTURE_RECORDING_URL = 'https://fixture.invalid/recording-001.mp3';

export function makeRecording(overrides: Partial<AzkarRecording> = {}): AzkarRecording {
  return {
    resourceId: -1,
    id: 1,
    recordingKey: 'fixture:recording-001',
    itemId: 1,
    reciterName: 'FIXTURE reciter',
    reciterNameAr: 'قارئ تجريبي',
    source: 'taybah-dev-fixture',
    remoteUrl: FIXTURE_RECORDING_URL,
    durationMs: 65_000,
    sizeBytes: 1_048_576,
    streamAllowed: true,
    downloadAllowed: false,
    redistributionAllowed: false,
    attributionAr: 'سطر نسبة تجريبي — ليس ذكرًا',
    attributionEn: 'FIXTURE attribution line',
    licence: 'FIXTURE licence',
    licenceUrl: 'https://fixture.invalid/licence',
    rightsVerifiedAt: 1_700_000_000,
    ...overrides,
  };
}

/** A fake download port: an in-memory list the tests seed. Actions change it the way a real port would. */
export function makeFakeDownloadPort(seed: AzkarDownloadEntry[] = []): AzkarDownloadPort & { entries: AzkarDownloadEntry[] } {
  const entries = [...seed];
  const find = (recordingKey: string) => entries.find((entry) => entry.recordingKey === recordingKey);
  return {
    entries,
    list: () => [...entries],
    status: (recordingKey: string) => find(recordingKey) ?? null,
    enqueue: (recording: AzkarRecording) => {
      const existing = find(recording.recordingKey);
      if (existing) {
        existing.state = 'downloading';
        existing.progress = 0;
        return;
      }
      entries.push({
        recording,
        recordingKey: recording.recordingKey,
        categoryId: 'fixture-category',
        title: 'FIXTURE recording',
        state: 'downloading',
        progress: 0,
        bytes: null,
      });
    },
    cancel: (recordingKey: string) => {
      const index = entries.findIndex((entry) => entry.recordingKey === recordingKey);
      if (index >= 0) {
        entries.splice(index, 1);
      }
    },
    remove: (recordingKey: string) => {
      const index = entries.findIndex((entry) => entry.recordingKey === recordingKey);
      if (index >= 0) {
        entries.splice(index, 1);
      }
    },
    removeCategory: (categoryId: string) => {
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        if (entries[index]?.categoryId === categoryId) {
          entries.splice(index, 1);
        }
      }
    },
    storageBytes: () => entries.reduce((total, entry) => (entry.state === 'done' ? total + (entry.bytes ?? 0) : total), 0),
  };
}

export function makeDownloadEntry(overrides: Partial<AzkarDownloadEntry> = {}): AzkarDownloadEntry {
  return {
    recording: makeRecording({ downloadAllowed: true }),
    recordingKey: 'fixture:recording-001',
    categoryId: 'fixture-category',
    title: 'FIXTURE recording',
    state: 'done',
    progress: 1,
    bytes: 4_404_019,
    ...overrides,
  };
}
