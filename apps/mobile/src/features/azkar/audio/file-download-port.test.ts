import { addNetworkStateListener, getNetworkStateAsync, NetworkStateType, type NetworkState } from 'expo-network';
import { File, Paths } from 'expo-file-system';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { resetAudioSettingsStore, setWifiOnlyDownloads } from '@/features/audio/settings';

import { makeRecording } from '../../../../jest/azkar-audio-fixtures';
import { fileExists, resetFakeFileSystem, transfers } from '../../../../jest/fake-file-system';
import {
  azkarFileDownloadPort,
  configureAzkarFileDownloadPort,
  resetAzkarFileDownloadPortForTests,
  sanitizeRecordingKeyForPath,
} from './file-download-port';

const WIFI: NetworkState = { type: NetworkStateType.WIFI, isConnected: true, isInternetReachable: true };
const CELLULAR: NetworkState = { type: NetworkStateType.CELLULAR, isConnected: true, isInternetReachable: true };

const API_BASE = 'http://localhost:8000';
const RECORDING = makeRecording({
  downloadAllowed: true,
  recordingKey: 'fixture:recording-001',
  remoteUrl: '/api/v1/azkar/audio/0.0.2/fixture.mp3',
  sizeBytes: 4096,
});

async function settle(): Promise<void> {
  for (let index = 0; index < 30; index += 1) {
    await Promise.resolve();
  }
}

function setNetwork(state: NetworkState): void {
  jest.mocked(getNetworkStateAsync).mockResolvedValue(state);
}

function emitNetwork(state: NetworkState): void {
  const listener = jest.mocked(addNetworkStateListener).mock.calls.at(-1)?.[0];
  if (listener === undefined) {
    throw new Error('The network listener is not registered.');
  }
  listener(state);
}

function localPath(recordingKey: string): string {
  return new File(Paths.document, `audio/azkar/${sanitizeRecordingKeyForPath(recordingKey)}.mp3`).uri;
}

describe('azkarFileDownloadPort', () => {
  beforeEach(() => {
    resetFakeFileSystem();
    resetAzkarFileDownloadPortForTests();
    resetAudioSettingsStore();
    storage.remove(storageKeys.audioWifiOnlyDownloads);
    configureAzkarFileDownloadPort({ apiBase: () => API_BASE, wifiOnly: () => false });
    setNetwork(WIFI);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sanitizes recording keys for file names', () => {
    expect(sanitizeRecordingKeyForPath('fixture:recording-001')).toBe('fixture_recording-001');
  });

  it('enqueues, downloads, and marks done with the expected file path', async () => {
    azkarFileDownloadPort.enqueue(RECORDING);
    await settle();

    expect(transfers()).toHaveLength(1);
    expect(transfers()[0]?.url).toBe(`${API_BASE}/api/v1/azkar/audio/0.0.2/fixture.mp3`);

    transfers()[0]?.progress(2048, 4096);
    transfers()[0]?.complete(4096);
    await settle();

    const entry = azkarFileDownloadPort.status(RECORDING.recordingKey);
    expect(entry?.state).toBe('done');
    expect(entry?.progress).toBe(1);
    expect(fileExists(localPath(RECORDING.recordingKey))).toBe(true);
    expect(azkarFileDownloadPort.localUri?.(RECORDING.recordingKey)).toBe(localPath(RECORDING.recordingKey));
    expect(azkarFileDownloadPort.storageBytes()).toBe(4096);
  });

  it('retries after failure', async () => {
    azkarFileDownloadPort.enqueue(RECORDING);
    await settle();
    transfers()[0]?.fail('Network error');
    await settle();

    expect(azkarFileDownloadPort.status(RECORDING.recordingKey)?.state).toBe('failed');

    azkarFileDownloadPort.enqueue(RECORDING);
    await settle();
    transfers()[1]?.complete(4096);
    await settle();

    expect(azkarFileDownloadPort.status(RECORDING.recordingKey)?.state).toBe('done');
  });

  it('downloads one recording at a time', async () => {
    const second = makeRecording({ ...RECORDING, recordingKey: 'fixture:recording-002', id: 2 });
    azkarFileDownloadPort.enqueue(RECORDING);
    azkarFileDownloadPort.enqueue(second);
    await settle();

    expect(transfers()).toHaveLength(1);
    transfers()[0]?.complete(4096);
    await settle();
    expect(transfers()).toHaveLength(2);
    transfers()[1]?.complete(4096);
    await settle();
    expect(azkarFileDownloadPort.list().every((entry) => entry.state === 'done')).toBe(true);
  });

  it('cancels an active download and deletes the partial file', async () => {
    azkarFileDownloadPort.enqueue(RECORDING);
    await settle();
    transfers()[0]?.progress(100, 4096);
    azkarFileDownloadPort.cancel(RECORDING.recordingKey);
    await settle();

    expect(azkarFileDownloadPort.status(RECORDING.recordingKey)).toBeNull();
    expect(fileExists(localPath(RECORDING.recordingKey))).toBe(false);
  });

  it('removes a finished download and clears storage', async () => {
    azkarFileDownloadPort.enqueue(RECORDING);
    await settle();
    transfers()[0]?.complete(4096);
    await settle();

    azkarFileDownloadPort.remove(RECORDING.recordingKey);
    expect(azkarFileDownloadPort.list()).toEqual([]);
    expect(azkarFileDownloadPort.storageBytes()).toBe(0);
    expect(fileExists(localPath(RECORDING.recordingKey))).toBe(false);
  });

  it('removeCategory drops every Azkar entry', async () => {
    azkarFileDownloadPort.enqueue(RECORDING);
    await settle();
    transfers()[0]?.complete(4096);
    await settle();

    azkarFileDownloadPort.removeCategory('azkar');
    expect(azkarFileDownloadPort.list()).toEqual([]);
  });

  it('fails when the downloaded size does not match the catalogue', async () => {
    azkarFileDownloadPort.enqueue(RECORDING);
    await settle();
    transfers()[0]?.complete(100);
    await settle();

    expect(azkarFileDownloadPort.status(RECORDING.recordingKey)?.state).toBe('failed');
    expect(fileExists(localPath(RECORDING.recordingKey))).toBe(false);
  });

  it('waits for Wi‑Fi when downloads are Wi‑Fi only and the network is cellular', async () => {
    setWifiOnlyDownloads(true);
    configureAzkarFileDownloadPort({ wifiOnly: () => true });
    setNetwork(CELLULAR);

    azkarFileDownloadPort.enqueue(RECORDING);
    await settle();
    expect(transfers()).toHaveLength(0);

    emitNetwork(WIFI);
    await settle();
    expect(transfers()).toHaveLength(1);
  });

  it('writes done entries to index.json for the next launch', async () => {
    azkarFileDownloadPort.enqueue(RECORDING);
    await settle();
    transfers()[0]?.complete(4096);
    await settle();

    const index = new File(Paths.document, 'audio/azkar/index.json');
    expect(index.exists).toBe(true);
    const manifest = JSON.parse(index.textSync()) as { entries: { recordingKey: string; state: string }[] };
    expect(manifest.entries).toEqual([
      expect.objectContaining({ recordingKey: RECORDING.recordingKey, state: 'done' }),
    ]);
  });
});
