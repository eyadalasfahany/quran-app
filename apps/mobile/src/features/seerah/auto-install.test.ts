import { openContentDb } from '@/core/db/content/open';
import { installResource, runDeviceContentSync } from '@/core/sync';
import { bumpCatalogVersion } from '@/core/sync/catalog-version';
import { resetHadithDownloads, useHadithDownloads } from '@/features/hadith/downloads';

import { autoInstallSeerah, runContentSyncThenSeerah, seerahAutoInstallAction } from './auto-install';
import { getSeerahCatalogEntry } from './data';

jest.mock('@/core/db/content/open', () => ({ openContentDb: jest.fn(() => ({ executor: {} })) }));
jest.mock('@/core/sync', () => ({
  installResource: jest.fn(() => new Promise(() => undefined)),
  runDeviceContentSync: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/features/audio/settings', () => ({ getWifiOnlyDownloads: jest.fn(() => true) }));
jest.mock('./data', () => ({ getSeerahCatalogEntry: jest.fn() }));

const LISTED = { installed: false, packSizeBytes: 1024, resourceId: 9, version: 1 };

describe('seerahAutoInstallAction', () => {
  it('does nothing without a catalogue entry', () => {
    expect(seerahAutoInstallAction(undefined, undefined)).toBe('none');
    expect(seerahAutoInstallAction(undefined, { progress: 0, status: 'failed' })).toBe('none');
  });

  it('does nothing when the pack is installed', () => {
    expect(seerahAutoInstallAction({ ...LISTED, installed: true }, undefined)).toBe('none');
    expect(seerahAutoInstallAction({ ...LISTED, installed: true }, { progress: 0, status: 'failed' })).toBe('none');
  });

  it('does nothing while an install is downloading or waiting', () => {
    expect(seerahAutoInstallAction(LISTED, { progress: 0.3, status: 'downloading' })).toBe('none');
    expect(seerahAutoInstallAction(LISTED, { progress: 0, reason: 'wifi', status: 'waiting' })).toBe('none');
  });

  it('starts when listed, not installed, and failed or idle', () => {
    expect(seerahAutoInstallAction(LISTED, undefined)).toBe('start');
    expect(seerahAutoInstallAction(LISTED, { progress: 0, status: 'failed' })).toBe('start');
    expect(seerahAutoInstallAction(LISTED, { progress: 0, reason: 'network', status: 'failed' })).toBe('start');
  });
});

describe('autoInstallSeerah', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetHadithDownloads();
    jest.mocked(openContentDb).mockReturnValue({ executor: {} } as ReturnType<typeof openContentDb>);
    jest.mocked(getSeerahCatalogEntry).mockReturnValue(LISTED);
  });

  it('does nothing and does not throw when content.db is not open', () => {
    jest.mocked(openContentDb).mockImplementation(() => {
      throw new Error('not open');
    });
    expect(() => autoInstallSeerah()).not.toThrow();
    expect(useHadithDownloads.getState().byId).toEqual({});
  });

  it('does nothing and does not throw when the catalogue read fails', () => {
    jest.mocked(getSeerahCatalogEntry).mockImplementation(() => {
      throw new Error('no such table');
    });
    expect(() => autoInstallSeerah()).not.toThrow();
    expect(useHadithDownloads.getState().byId).toEqual({});
  });

  it('starts the listed pack once over any network, and a second call while downloading does not start again', async () => {
    autoInstallSeerah();
    autoInstallSeerah();
    // Wi-Fi only is on in this file: the install still runs, because Seerah asks for any network.
    await Promise.resolve();
    expect(installResource).toHaveBeenCalledTimes(1);
    expect(installResource).toHaveBeenCalledWith(9, expect.objectContaining({ signal: expect.anything() }));
    expect(useHadithDownloads.getState().byId[9]).toEqual({ progress: 0, status: 'downloading' });
  });

  it('returns without awaiting the install', () => {
    expect(autoInstallSeerah()).toBeUndefined();
  });

  it('starts nothing for an installed or unlisted pack', () => {
    jest.mocked(getSeerahCatalogEntry).mockReturnValue({ ...LISTED, installed: true });
    autoInstallSeerah();
    jest.mocked(getSeerahCatalogEntry).mockReturnValue(undefined);
    autoInstallSeerah();
    expect(useHadithDownloads.getState().byId).toEqual({});
  });

  it('restarts a failed install when called, but a catalogue bump alone starts nothing', () => {
    useHadithDownloads.setState({ byId: { 9: { progress: 0, status: 'failed' } } });
    bumpCatalogVersion();
    expect(useHadithDownloads.getState().byId[9]?.status).toBe('failed');
    expect(installResource).not.toHaveBeenCalled();
    autoInstallSeerah();
    expect(useHadithDownloads.getState().byId[9]?.status).toBe('downloading');
  });
});

describe('runContentSyncThenSeerah', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetHadithDownloads();
    jest.mocked(openContentDb).mockReturnValue({ executor: {} } as ReturnType<typeof openContentDb>);
    jest.mocked(getSeerahCatalogEntry).mockReturnValue(LISTED);
  });

  it('triggers the install after a resolved run', async () => {
    jest.mocked(runDeviceContentSync).mockResolvedValue({} as Awaited<ReturnType<typeof runDeviceContentSync>>);
    await expect(runContentSyncThenSeerah()).resolves.toBeDefined();
    expect(useHadithDownloads.getState().byId[9]?.status).toBe('downloading');
  });

  it('triggers the install after a rejected run and still rejects, so the scheduler records no sync time', async () => {
    jest.mocked(runDeviceContentSync).mockRejectedValue(new Error('offline'));
    await expect(runContentSyncThenSeerah()).rejects.toThrow('offline');
    expect(useHadithDownloads.getState().byId[9]?.status).toBe('downloading');
  });

  it('keeps the run outcome when the trigger cannot read content.db', async () => {
    jest.mocked(runDeviceContentSync).mockRejectedValue(new Error('offline'));
    jest.mocked(openContentDb).mockImplementation(() => {
      throw new Error('not open');
    });
    await expect(runContentSyncThenSeerah()).rejects.toThrow('offline');
  });
});
