import { installResource, type InstallOptions, type InstallResult } from '@/core/sync';

import { downloadReciterPack, resetReciterDownloads, useReciterDownloads } from './reciter-downloads';

jest.mock('@/core/sync', () => ({ installResource: jest.fn() }));

const install = jest.mocked(installResource);
type Pending = { options: InstallOptions; resolve: (result: InstallResult) => void };

// Each install waits until the test resolves it, the way the real one does.
function holdInstalls(): Pending[] {
  const pending: Pending[] = [];
  install.mockImplementation(
    (_id, options) =>
      new Promise<InstallResult>((resolve) => {
        pending.push({ options: options ?? {}, resolve });
      }),
  );
  return pending;
}

beforeEach(() => {
  install.mockReset();
  resetReciterDownloads();
});

describe('downloadReciterPack', () => {
  it('reports progress on the row while the pack installs', () => {
    const pending = holdInstalls();

    void downloadReciterPack(30);
    expect(useReciterDownloads.getState().byId[30]).toEqual({ status: 'downloading', progress: 0 });

    pending[0]?.options.onProgress?.(0.4);
    expect(useReciterDownloads.getState().byId[30]).toEqual({ status: 'downloading', progress: 0.4 });
  });

  it('resolves true, clears the row and bumps installedVersion when the pack installs', async () => {
    const pending = holdInstalls();
    const done = downloadReciterPack(30);

    pending[0]?.resolve({ status: 'installed' });

    await expect(done).resolves.toBe(true);
    expect(useReciterDownloads.getState().byId[30]).toBeUndefined();
    expect(useReciterDownloads.getState().installedVersion).toBe(1);
  });

  it('keeps a failed entry and resolves false when the install fails', async () => {
    const pending = holdInstalls();
    const done = downloadReciterPack(30);

    pending[0]?.resolve({ status: 'failed', reason: 'network' });

    await expect(done).resolves.toBe(false);
    expect(useReciterDownloads.getState().byId[30]).toEqual({ status: 'failed', progress: 0 });
    expect(useReciterDownloads.getState().installedVersion).toBe(0);
  });

  it('treats a rejected install as failed', async () => {
    install.mockRejectedValue(new Error('boom'));

    await expect(downloadReciterPack(30)).resolves.toBe(false);
    expect(useReciterDownloads.getState().byId[30]).toEqual({ status: 'failed', progress: 0 });
  });

  it('clears the row without a failure when the install is cancelled', async () => {
    const pending = holdInstalls();
    const done = downloadReciterPack(30);

    pending[0]?.resolve({ status: 'cancelled' });

    await expect(done).resolves.toBe(false);
    expect(useReciterDownloads.getState().byId[30]).toBeUndefined();
  });

  it('shares one running install between callers', () => {
    const pending = holdInstalls();

    const first = downloadReciterPack(30);
    const second = downloadReciterPack(30);

    expect(second).toBe(first);
    expect(install).toHaveBeenCalledTimes(1);
    expect(pending).toHaveLength(1);
  });

  it('starts again after a failure', async () => {
    install.mockResolvedValueOnce({ status: 'failed', reason: 'network' });
    await downloadReciterPack(30);

    install.mockResolvedValueOnce({ status: 'installed' });
    await expect(downloadReciterPack(30)).resolves.toBe(true);
    expect(install).toHaveBeenCalledTimes(2);
  });
});
