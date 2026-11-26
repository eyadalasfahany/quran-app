import { act, renderHook } from '@testing-library/react-native';
import { File } from 'expo-file-system';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { bumpCatalogVersion } from '@/core/sync/catalog-version';

import { installSvgMushaf } from './install-svg-mushaf';
import { setInstalledSvgMushaf } from './installed-store';
import { openSvgMushafPack } from './open-pack';
import { removeSvgMushaf } from './remove-svg-mushaf';
import { useSvgMushafPackStore } from './svg-mushaf-pack-store';
import { useSvgMushafPack } from './useSvgMushafPack';
import type { SvgMushafInstallResult } from './types';

// The installer, the catalogue read and the reader are mocked; the record and the file are real (the fake file system).
let mockCatalogRow: { version: number; pack_size_bytes: number } | undefined;

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => ({ executor: { get: () => mockCatalogRow } }),
}));

jest.mock('./install-svg-mushaf', () => ({ installSvgMushaf: jest.fn() }));
jest.mock('./remove-svg-mushaf', () => ({ removeSvgMushaf: jest.fn() }));
jest.mock('./open-pack', () => ({ openSvgMushafPack: jest.fn(() => null), closeSvgMushafPack: jest.fn() }));

const mockInstall = jest.mocked(installSvgMushaf);
const mockOpen = jest.mocked(openSvgMushafPack);

const packPath = (version: number): string => `file:///documents/packs/svg-mushaf-hafs-${version}.db`;

function installedFile(version: number): void {
  (new File(packPath(version)) as unknown as { writeSync(text: string): void }).writeSync('x');
}

function record(version: number) {
  return { key: 'hafs' as const, resourceId: 9, version, sha256: 'abc', sizeBytes: 1, hasWordBoxes: true, pageFormat: 'tqp1-deflate-n32', installedAt: 1 };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  useSvgMushafPackStore.setState({ byKey: {} });
  mockCatalogRow = { version: 2, pack_size_bytes: 90 };
  storage.remove(storageKeys.svgMushaf.installed('hafs'));
  for (const version of [1, 2]) {
    const file = new File(packPath(version));
    if (file.exists) {
      file.delete();
    }
  }
  mockInstall.mockReset();
  mockOpen.mockReset();
  mockOpen.mockReturnValue(null);
  bumpCatalogVersion();
});

describe('useSvgMushafPack', () => {
  it('shows a riwayah whose installed record is from before TQP1 as absent, with the download offered', async () => {
    installedFile(2);
    storage.set(storageKeys.svgMushaf.installed('hafs'), JSON.stringify({ ...record(2), pageFormat: undefined }));

    const { result } = await renderHook(() => useSvgMushafPack('hafs'));

    expect(result.current).toMatchObject({ availableVersion: 2, installedVersion: null, reader: null, status: 'absent' });
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it('goes from absent, through downloading with progress, to installed', async () => {
    const download = deferred<SvgMushafInstallResult>();
    mockInstall.mockImplementation((_key, options) => {
      options?.onProgress?.(0.5);
      return download.promise.then((result) => {
        setInstalledSvgMushaf(record(2));
        installedFile(2);
        return result;
      });
    });

    const { result } = await renderHook(() => useSvgMushafPack('hafs'));
    expect(result.current).toMatchObject({ status: 'absent', availableVersion: 2, sizeBytes: 90, reader: null });

    let pending: Promise<SvgMushafInstallResult> | undefined;
    await act(async () => {
      pending = result.current.download();
    });
    expect(result.current).toMatchObject({ status: 'downloading', progress: 0.5 });

    await act(async () => {
      download.resolve({ status: 'installed' });
      await pending;
    });

    expect(result.current).toMatchObject({ status: 'installed', installedVersion: 2, hasWordBoxes: true, updateAvailable: false });
  });

  it('returns to cancelled when cancel() aborts the running install', async () => {
    mockInstall.mockImplementation(
      (_key, options) =>
        new Promise<SvgMushafInstallResult>((resolve) => {
          options?.signal?.addEventListener('abort', () => resolve({ status: 'cancelled' }));
        }),
    );

    const { result } = await renderHook(() => useSvgMushafPack('hafs'));
    let pending: Promise<SvgMushafInstallResult> | undefined;
    await act(async () => {
      pending = result.current.download();
    });
    await act(async () => {
      result.current.cancel();
    });
    await act(async () => {
      await pending;
    });

    expect(result.current.status).toBe('cancelled');
  });

  it('reads a record whose file is gone as absent, and clears the record', async () => {
    setInstalledSvgMushaf(record(2));

    const { result } = await renderHook(() => useSvgMushafPack('hafs'));

    expect(result.current.status).toBe('absent');
    expect(storage.getString(storageKeys.svgMushaf.installed('hafs'))).toBeUndefined();
  });

  it('offers an update when the catalogue has a higher version; the hook itself starts nothing (auto-download.ts does)', async () => {
    setInstalledSvgMushaf(record(1));
    installedFile(1);
    mockCatalogRow = { version: 2, pack_size_bytes: 90 };

    const { result } = await renderHook(() => useSvgMushafPack('hafs'));

    expect(result.current).toMatchObject({ status: 'installed', installedVersion: 1, availableVersion: 2, updateAvailable: true });
    expect(mockInstall).not.toHaveBeenCalled();
  });

  it('keeps the installed pages while an update downloads, then opens the new version without a restart', async () => {
    const oldReader = { close: jest.fn(), version: 1 };
    const newReader = { close: jest.fn(), version: 2 };
    mockOpen.mockReturnValue(oldReader as never);
    setInstalledSvgMushaf(record(1));
    installedFile(1);
    const download = deferred<SvgMushafInstallResult>();
    mockInstall.mockImplementation((_key, options) => {
      options?.onProgress?.(0.5);
      return download.promise.then((result) => {
        setInstalledSvgMushaf(record(2));
        installedFile(2);
        mockOpen.mockReturnValue(newReader as never);
        return result;
      });
    });

    const { result } = await renderHook(() => useSvgMushafPack('hafs'));
    let pending: Promise<SvgMushafInstallResult> | undefined;
    await act(async () => {
      pending = result.current.download();
    });
    // Mid-update: still installed, still the old reader (the reader keeps its page, no download card).
    expect(result.current).toMatchObject({ status: 'installed', installedVersion: 1 });
    expect(result.current.reader).toBe(oldReader);

    await act(async () => {
      download.resolve({ status: 'installed' });
      await pending;
    });

    expect(result.current).toMatchObject({ status: 'installed', installedVersion: 2, updateAvailable: false });
    expect(result.current.reader).toBe(newReader);
  });

  it('gives the reader only once the pack is installed', async () => {
    const fakeReader = { close: jest.fn() };
    mockOpen.mockReturnValue(fakeReader as never);
    setInstalledSvgMushaf(record(2));
    installedFile(2);

    const { result } = await renderHook(() => useSvgMushafPack('hafs'));

    expect(result.current.reader).toBe(fakeReader);
    expect(mockOpen).toHaveBeenCalledWith('hafs');
  });

  it('removes the installed version through the installer seam', async () => {
    setInstalledSvgMushaf(record(2));
    installedFile(2);
    const { result } = await renderHook(() => useSvgMushafPack('hafs'));

    await act(async () => {
      result.current.remove();
    });

    expect(removeSvgMushaf).toHaveBeenCalledWith('hafs');
  });
});
