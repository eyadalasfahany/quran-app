import { storage, storageKeys } from '@/core/storage/mmkv';
import { useReaderSettings } from '@/features/reader/settings';

import { ensureSelectedMushafDownloaded, type AutoDownloadDeps } from './auto-download';
import type { SvgMushafKey } from './types';

function deps(overrides: Partial<AutoDownloadDeps> = {}): AutoDownloadDeps & { start: jest.Mock } {
  return {
    selectedKey: () => 'hafs',
    isInstalled: () => false,
    updateAvailable: () => false,
    isRunning: () => false,
    start: jest.fn(() => Promise.resolve({ status: 'installed' as const })),
    ...overrides,
  } as AutoDownloadDeps & { start: jest.Mock };
}

describe('ensureSelectedMushafDownloaded', () => {
  it('starts the download of the selected riwayah when it is not installed', async () => {
    const d = deps({ selectedKey: () => 'warsh' });

    await ensureSelectedMushafDownloaded(d);

    expect(d.start).toHaveBeenCalledTimes(1);
    expect(d.start).toHaveBeenCalledWith('warsh');
  });

  it('does nothing when the riwayah is installed', async () => {
    const d = deps({ isInstalled: () => true });

    await ensureSelectedMushafDownloaded(d);

    expect(d.start).not.toHaveBeenCalled();
  });

  it('updates the installed riwayah when the catalogue has a newer version', async () => {
    const d = deps({ isInstalled: () => true, selectedKey: () => 'warsh', updateAvailable: () => true });

    await ensureSelectedMushafDownloaded(d);

    expect(d.start).toHaveBeenCalledWith('warsh');
  });

  it('does not start a second update while one runs', async () => {
    const d = deps({ isInstalled: () => true, isRunning: () => true, updateAvailable: () => true });

    await ensureSelectedMushafDownloaded(d);

    expect(d.start).not.toHaveBeenCalled();
  });

  it('does nothing when a download of it is already running', async () => {
    const d = deps({ isRunning: () => true });

    await ensureSelectedMushafDownloaded(d);

    expect(d.start).not.toHaveBeenCalled();
  });

  it('checks the installed and running state of the selected key only', async () => {
    const isInstalled = jest.fn((_key: SvgMushafKey) => false);
    const isRunning = jest.fn((_key: SvgMushafKey) => false);
    await ensureSelectedMushafDownloaded(deps({ selectedKey: () => 'duri', isInstalled, isRunning }));

    expect(isInstalled).toHaveBeenCalledWith('duri');
    expect(isRunning).toHaveBeenCalledWith('duri');
  });

  it('reads the selected riwayah from the reader settings by default', async () => {
    const start = jest.fn(() => Promise.resolve({ status: 'installed' as const }));
    const previous = useReaderSettings.getState().mushaf;
    useReaderSettings.setState({ mushaf: 'qalun' });
    try {
      await ensureSelectedMushafDownloaded({
        selectedKey: () => useReaderSettings.getState().mushaf,
        isInstalled: () => false,
        updateAvailable: () => false,
        isRunning: () => false,
        start,
      });
    } finally {
      useReaderSettings.setState({ mushaf: previous });
    }

    expect(start).toHaveBeenCalledWith('qalun');
  });

  it('swallows an error from the download start and never throws', async () => {
    const d = deps({
      start: jest.fn(() => Promise.reject(new Error('network down'))),
    });

    await expect(ensureSelectedMushafDownloaded(d)).resolves.toBeUndefined();
  });

  it('swallows a synchronous error from the reader settings read', async () => {
    const d = deps({
      selectedKey: () => {
        throw new Error('storage unavailable');
      },
    });

    await expect(ensureSelectedMushafDownloaded(d)).resolves.toBeUndefined();
    expect(d.start).not.toHaveBeenCalled();
  });
});

describe('ensureSelectedMushafDownloaded with a stored al-Duri choice', () => {
  afterEach(() => {
    storage.remove(storageKeys.readerSettings);
    jest.dontMock('./useSvgMushafPack');
  });

  it('starts the Hafs download, never al-Duri, using the default dependencies', async () => {
    storage.set(storageKeys.readerSettings, JSON.stringify({ mode: 'reading', mushaf: 'duri', version: 1 }));
    const start = jest.fn(() => Promise.resolve({ status: 'installed' as const }));
    let ensure!: (deps?: AutoDownloadDeps) => Promise<void>;
    jest.isolateModules(() => {
      jest.doMock('./useSvgMushafPack', () => ({
        isSvgMushafDownloadRunning: () => false,
        readInstalled: () => undefined,
        startSvgMushafDownload: start,
      }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- a fresh module load picks up the stored settings.
      ensure = (require('./auto-download') as typeof import('./auto-download')).ensureSelectedMushafDownloaded;
    });

    await ensure();

    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith('hafs');
    expect(start).not.toHaveBeenCalledWith('duri');
  });
});
