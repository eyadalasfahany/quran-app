import { AppState } from 'react-native';
import { addNetworkStateListener, getNetworkStateAsync, NetworkStateType, type NetworkState } from 'expo-network';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { openAudioTestDb } from '../data/test-db';
import { getDownload, listDownloads, upsertDownload, type DownloadRow } from '../data/downloads';
import { resetAudioSettingsStore, setWifiOnlyDownloads } from '../settings';
import { openUserTestStore } from '../../../../jest/user-test-db';
import { fileExists, putFile, resetFakeFileSystem, transfers } from '../../../../jest/fake-file-system';
import {
  cancel,
  configureDownloadManager,
  enqueueAll,
  enqueueSurah,
  networkGate,
  remove,
  removeReciter,
  resetDownloadManagerForTests,
  startDownloadManager,
  verifyDownloads,
} from './manager';
import { fileForDownloadPath } from './files';
import { useDownloadProgress } from './store';

const DAY = 24 * 60 * 60 * 1000;
const T0 = 1_800_000_000_000;
const WIFI: NetworkState = { type: NetworkStateType.WIFI, isConnected: true, isInternetReachable: true };
const CELLULAR: NetworkState = { type: NetworkStateType.CELLULAR, isConnected: true, isInternetReachable: true };
const OFFLINE: NetworkState = { type: NetworkStateType.NONE, isConnected: false, isInternetReachable: false };

let content: SqlExecutor;
let user: SqlExecutor;
let closeContent: () => void;
let closeUser: () => void;

function seedContent(db: SqlExecutor): void {
  db.run(
    `INSERT INTO recitations (id, resource_id, reciter_name, reciter_name_ar, has_word_segments) VALUES
     (1, 30, 'Mishari', 'مشاري', 0),
     (2, 31, 'Husary', 'الحصري', 0)`,
  );
  db.run(
    `INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, duration_ms, size_bytes, format) VALUES
     (100, 1, 1, 'https://example.test/1.mp3', 46000, 839808, 'mp3'),
     (200, 1, 2, 'https://example.test/2.mp3', 286000, 2000, 'mp3'),
     (300, 2, 1, 'https://example.test/husary-1.mp3', 46000, 371, 'mp3')`,
  );
}

/** A done row, and its file on disk. */
function doneRowInstall(audioFileId: number, overrides: Partial<DownloadRow> = {}): void {
  const row = doneRow(audioFileId, overrides);
  upsertDownload(row, { db: user });
  putFile(fileUri(row.localPath), 5000);
}

function doneRow(audioFileId: number, overrides: Partial<DownloadRow> = {}): DownloadRow {
  const row: DownloadRow = {
    audioFileId,
    reciterResourceId: audioFileId === 300 ? 31 : 30,
    chapterId: audioFileId === 200 ? 2 : 1,
    audioUrl: audioFileId === 300 ? 'https://example.test/husary-1.mp3' : `https://example.test/${audioFileId === 200 ? 2 : 1}.mp3`,
    sourceSizeBytes: audioFileId === 100 ? 839808 : audioFileId === 300 ? 371 : 2000,
    localPath: `audio/${audioFileId === 300 ? 31 : 30}/${audioFileId === 200 ? 2 : 1}.mp3`,
    sizeBytes: 5000,
    status: 'done',
    progress: 1,
    resumeData: null,
    downloadedAt: T0 - 8 * DAY,
    verifiedAt: T0 - 8 * DAY,
    ...overrides,
  };
  return row;
}

function fileUri(localPath: string): string {
  return fileForDownloadPath(localPath).uri;
}

/** Lets the queued promise callbacks run. Fake timers do not stop promise jobs. */
async function settle(): Promise<void> {
  for (let index = 0; index < 20; index += 1) {
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

function emitAppState(state: 'active' | 'background'): void {
  const listener = appStateSpy.mock.calls.filter(([event]) => event === 'change').at(-1)?.[1] as
    | ((next: string) => void)
    | undefined;
  if (listener === undefined) {
    throw new Error('The app state listener is not registered.');
  }
  listener(state);
}

let appStateSpy: jest.SpyInstance;

async function start(network: NetworkState = WIFI): Promise<void> {
  setNetwork(network);
  await startDownloadManager();
  await settle();
}

const contentPath = (chapter: number, format = 'mp3') => `audio/30/${chapter}.${format}`;

function dl(audioFileId: number) {
  return getDownload(audioFileId, { db: user });
}

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  resetFakeFileSystem();
  storage.remove(storageKeys.audioWifiOnlyDownloads);
  resetAudioSettingsStore();
  jest.mocked(addNetworkStateListener).mockClear();
  setNetwork(WIFI);

  const contentOpened = openAudioTestDb();
  content = contentOpened.executor;
  closeContent = contentOpened.close;
  seedContent(content);

  const userOpened = openUserTestStore();
  user = userOpened.store.db as SqlExecutor;
  closeUser = () => userOpened.database.close();

  configureDownloadManager({ contentDb: content, userDb: user });
  appStateSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: () => undefined }) as never);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  resetDownloadManagerForTests();
  appStateSpy.mockRestore();
  jest.restoreAllMocks();
  jest.useRealTimers();
  resetFakeFileSystem();
  closeContent();
  closeUser();
});

describe('the queue', () => {
  it('downloads one surah at a time, in the order they were queued', async () => {
    await start();

    enqueueSurah(30, 1);
    enqueueSurah(30, 2);

    expect(transfers()).toHaveLength(1);
    expect(transfers()[0]?.url).toBe('https://example.test/1.mp3');
    expect(dl(200)?.status).toBe('queued');

    transfers()[0]?.complete(4000);
    await settle();

    expect(dl(100)).toMatchObject({ status: 'done', progress: 1 });
    expect(transfers()).toHaveLength(2);
    expect(transfers()[1]?.url).toBe('https://example.test/2.mp3');
  });

  it('writes the file under the document directory and records its path relative to it', async () => {
    await start();
    enqueueSurah(30, 1);

    expect(transfers()[0]?.destination.uri).toBe('file:///documents/audio/30/1.mp3');
    expect(dl(100)?.localPath).toBe(contentPath(1));
  });

  it('reports progress live, and writes it to the row at most once a second', async () => {
    await start();
    enqueueSurah(30, 1);
    const task = transfers()[0];

    task?.progress(250, 1000);
    expect(useDownloadProgress.getState().byId[100]).toBe(0.25);
    expect(dl(100)?.progress).toBe(0.25);

    task?.progress(500, 1000);
    expect(useDownloadProgress.getState().byId[100]).toBe(0.5);
    expect(dl(100)?.progress).toBe(0.25);

    jest.advanceTimersByTime(1000);
    task?.progress(750, 1000);
    expect(dl(100)?.progress).toBe(0.75);
  });

  it('takes the size from Content-Length, not from the content row or the final file', async () => {
    await start();
    enqueueSurah(30, 1);

    transfers()[0]?.progress(10, 5_000_000);
    transfers()[0]?.complete(1234);
    await settle();

    expect(dl(100)?.sizeBytes).toBe(5_000_000);
  });

  it('falls back to the final file size when the response has no Content-Length', async () => {
    await start();
    enqueueSurah(30, 1);

    transfers()[0]?.progress(10, -1);
    transfers()[0]?.complete(1234);
    await settle();

    expect(dl(100)?.sizeBytes).toBe(1234);
  });

  it('cancels a running download: stops it, deletes the partial file and the row, and starts the next', async () => {
    await start();
    enqueueSurah(30, 1);
    enqueueSurah(30, 2);
    putFile(fileUri(contentPath(1)), 10);
    const first = transfers()[0];

    cancel(100);

    expect(first?.state).toBe('cancelled');
    expect(dl(100)).toBeUndefined();
    expect(fileExists(fileUri(contentPath(1)))).toBe(false);
    expect(useDownloadProgress.getState().byId[100]).toBeUndefined();
    await settle();
    expect(transfers()).toHaveLength(2);
    expect(transfers()[1]?.url).toBe('https://example.test/2.mp3');
  });

  it('cancels a queued surah without starting it', async () => {
    await start();
    enqueueSurah(30, 1);
    enqueueSurah(30, 2);

    cancel(200);
    transfers()[0]?.complete();
    await settle();

    expect(dl(200)).toBeUndefined();
    expect(transfers()).toHaveLength(1);
  });

  it('marks a failed download failed and moves on to the next surah', async () => {
    await start();
    enqueueSurah(30, 1);
    enqueueSurah(30, 2);

    transfers()[0]?.fail('Network request failed.');
    await settle();

    expect(dl(100)).toMatchObject({ status: 'failed', resumeData: null });
    expect(useDownloadProgress.getState().byId[100]).toBeUndefined();
    expect(transfers()).toHaveLength(2);
    expect(transfers()[1]?.url).toBe('https://example.test/2.mp3');
  });

  it('queues a failed surah again when it is asked for again', async () => {
    await start();
    enqueueSurah(30, 1);
    transfers()[0]?.fail();
    await settle();

    expect(enqueueSurah(30, 1)).toBe(true);
    await settle();

    expect(dl(100)?.status).toBe('downloading');
    expect(transfers()).toHaveLength(2);
  });

  it('does not queue a surah twice, a downloaded one, or one without audio', async () => {
    await start();

    expect(enqueueSurah(30, 1)).toBe(true);
    expect(enqueueSurah(30, 1)).toBe(false);
    transfers()[0]?.complete();
    await settle();
    expect(enqueueSurah(30, 1)).toBe(false);
    expect(enqueueSurah(30, 9)).toBe(false);
    expect(enqueueSurah(99, 1)).toBe(false);
  });

  it('queues every surah a reciter has audio for, once', async () => {
    await start();

    expect(enqueueAll(30)).toBe(2);
    expect(enqueueAll(30)).toBe(0);
    expect(enqueueAll(31)).toBe(1);
    expect(listDownloads({ db: user }).map((row) => row.audioFileId)).toEqual([100, 200, 300]);
  });

  it('starts the manager only once', async () => {
    await start();
    await startDownloadManager();

    expect(addNetworkStateListener).toHaveBeenCalledTimes(1);
  });

  it('remove deletes a downloaded surah and its file', async () => {
    doneRowInstall(100);
    await start();

    remove(100);

    expect(dl(100)).toBeUndefined();
    expect(fileExists(fileUri(contentPath(1)))).toBe(false);
  });
});

describe('pausing and resuming', () => {
  it('saves resume data when the app goes to the background, and continues from it on return', async () => {
    await start();
    enqueueSurah(30, 1);
    transfers()[0]?.progress(300, 1000);

    emitAppState('background');
    await settle();

    const paused = dl(100);
    expect(paused?.status).toBe('paused');
    expect(JSON.parse(paused?.resumeData ?? '')).toEqual({
      url: 'https://example.test/1.mp3',
      fileUri: 'file:///documents/audio/30/1.mp3',
      isDirectory: false,
      resumeData: 'resume-at-300',
    });
    expect(transfers()).toHaveLength(1);

    emitAppState('active');
    await settle();

    expect(transfers()).toHaveLength(2);
    expect(transfers()[1]?.resumedFrom).toBe('resume-at-300');
    expect(transfers()[1]?.state).toBe('active');
    expect(dl(100)).toMatchObject({ status: 'downloading', resumeData: null });
  });

  it('a row left with resume data starts by resuming, not from zero', async () => {
    upsertDownload(
      {
        audioFileId: 100,
        reciterResourceId: 30,
        chapterId: 1,
        audioUrl: 'https://example.test/1.mp3',
        sourceSizeBytes: null,
        localPath: contentPath(1),
        sizeBytes: null,
        status: 'paused',
        progress: 0.4,
        resumeData: JSON.stringify({
          url: 'https://example.test/1.mp3',
          fileUri: 'file:///documents/audio/30/1.mp3',
          isDirectory: false,
          resumeData: 'resume-at-400',
        }),
        downloadedAt: null,
        verifiedAt: null,
      },
      { db: user },
    );

    await start();

    expect(transfers()).toHaveLength(1);
    expect(transfers()[0]?.resumedFrom).toBe('resume-at-400');
  });

  it('a download the app was killed during waits as queued and starts again', async () => {
    upsertDownload(
      {
        audioFileId: 100,
        reciterResourceId: 30,
        chapterId: 1,
        audioUrl: 'https://example.test/1.mp3',
        sourceSizeBytes: null,
        localPath: contentPath(1),
        sizeBytes: null,
        status: 'downloading',
        progress: 0.2,
        resumeData: null,
        downloadedAt: null,
        verifiedAt: null,
      },
      { db: user },
    );

    await start();

    expect(transfers()).toHaveLength(1);
    expect(dl(100)?.status).toBe('downloading');
  });
});

describe('the Wi-Fi gate', () => {
  it('waits as waiting_wifi on cellular, and starts when Wi-Fi returns', async () => {
    await start(CELLULAR);
    enqueueSurah(30, 1);

    expect(transfers()).toHaveLength(0);
    expect(dl(100)?.status).toBe('waiting_wifi');

    emitNetwork(WIFI);
    await settle();

    expect(transfers()).toHaveLength(1);
    expect(dl(100)?.status).toBe('downloading');
  });

  it('starts on cellular when Wi-Fi only is turned off', async () => {
    setWifiOnlyDownloads(false);
    await start(CELLULAR);
    enqueueSurah(30, 1);

    expect(transfers()).toHaveLength(1);
  });

  it('with no connection and Wi-Fi only off, a surah waits as queued until a connection returns', async () => {
    setWifiOnlyDownloads(false);
    await start(OFFLINE);
    enqueueSurah(30, 1);

    expect(transfers()).toHaveLength(0);
    expect(dl(100)?.status).toBe('queued');

    emitNetwork(CELLULAR);
    await settle();

    expect(transfers()).toHaveLength(1);
  });

  it('pauses a running download when Wi-Fi drops, and resumes it on Wi-Fi', async () => {
    await start(WIFI);
    enqueueSurah(30, 1);
    transfers()[0]?.progress(400, 1000);

    emitNetwork(CELLULAR);
    await settle();

    expect(dl(100)).toMatchObject({ status: 'waiting_wifi' });
    expect(JSON.parse(dl(100)?.resumeData ?? '').resumeData).toBe('resume-at-400');

    emitNetwork(WIFI);
    await settle();

    expect(transfers()).toHaveLength(2);
    expect(transfers()[1]?.resumedFrom).toBe('resume-at-400');
  });

  it('turning Wi-Fi only off starts the surahs that were waiting', async () => {
    await start(CELLULAR);
    enqueueSurah(30, 1);
    expect(dl(100)?.status).toBe('waiting_wifi');

    setWifiOnlyDownloads(false);
    await settle();

    expect(transfers()).toHaveLength(1);
  });

  it('keeps the gate logic in one place', () => {
    expect(networkGate(null, true)).toBe('unknown');
    expect(networkGate(WIFI, true)).toBe('open');
    expect(networkGate(CELLULAR, true)).toBe('wait-wifi');
    expect(networkGate(OFFLINE, true)).toBe('wait-wifi');
    expect(networkGate(CELLULAR, false)).toBe('open');
    expect(networkGate(OFFLINE, false)).toBe('wait-network');
  });
});


describe('verification on launch', () => {
  it('refreshes verified_at for a done file whose URL and size still match', async () => {
    doneRowInstall(100);

    await start();

    expect(dl(100)).toMatchObject({ status: 'done', verifiedAt: T0 });
    expect(transfers()).toHaveLength(0);
  });

  it('marks a done row failed when its file is gone', async () => {
    upsertDownload(doneRow(100), { db: user });

    await start();

    expect(dl(100)).toMatchObject({ status: 'failed', verifiedAt: null });
  });

  it('deletes the file and queues the surah again when QF changed its URL', async () => {
    doneRowInstall(100, { audioUrl: 'https://old.example.test/1.mp3' });

    await start();

    expect(transfers()).toHaveLength(1);
    expect(transfers()[0]?.url).toBe('https://example.test/1.mp3');
    expect(dl(100)).toMatchObject({ status: 'downloading', audioUrl: 'https://example.test/1.mp3' });
  });

  it('queues the surah again when its size changed in the content row', async () => {
    doneRowInstall(100, { sourceSizeBytes: 1 });

    await start();

    expect(transfers()).toHaveLength(1);
    expect(dl(100)?.sourceSizeBytes).toBe(839808);
  });

  it('does not verify without a connection', async () => {
    doneRowInstall(100, { verifiedAt: T0 - 8 * DAY });

    await start(OFFLINE);

    expect(dl(100)).toMatchObject({ status: 'done', verifiedAt: T0 - 8 * DAY });
  });

  it('verifyDownloads leaves a row whose content row is gone unverified', () => {
    // Reciter 99 has no content rows, so the file has nothing to be checked against.
    doneRowInstall(300, { reciterResourceId: 99, chapterId: 9, audioUrl: 'https://example.test/gone.mp3' });

    verifyDownloads();

    expect(dl(300)).toMatchObject({ status: 'done', verifiedAt: T0 - 8 * DAY });
  });
});

describe('removing a reciter', () => {
  it("deletes that reciter's files, rows and folder, stops its running download, and keeps the others", async () => {
    doneRowInstall(100);
    doneRowInstall(300);
    await start();
    enqueueSurah(30, 2);
    expect(transfers().at(-1)?.url).toBe('https://example.test/2.mp3');

    removeReciter(30);

    expect(transfers().at(-1)?.state).toBe('cancelled');
    expect(listDownloads({ db: user }).map((row) => row.audioFileId)).toEqual([300]);
    expect(fileExists(fileUri(contentPath(1)))).toBe(false);
    expect(fileExists('file:///documents/audio/31/1.mp3')).toBe(true);
  });
});
