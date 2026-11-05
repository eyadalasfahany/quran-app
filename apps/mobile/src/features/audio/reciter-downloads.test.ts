import { installResource, type InstallOptions, type InstallResult } from '@/core/sync';

import { cancelReciterPack, downloadReciterPack, resetReciterDownloads, useReciterDownloads } from './reciter-downloads';

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

describe('cancelReciterPack', () => {
  it('cancelReciterPack aborts a running install and leaves no entry', async () => {
    const pending = holdInstalls();
    const done = downloadReciterPack(30);
    expect(useReciterDownloads.getState().byId[30]).toEqual({ status: 'downloading', progress: 0 });

    cancelReciterPack(30);
    expect(pending[0]?.options.signal?.aborted).toBe(true);

    // The real install resolves as cancelled once its signal aborts.
    pending[0]?.resolve({ status: 'cancelled' });
    await expect(done).resolves.toBe(false);
    expect(useReciterDownloads.getState().byId[30]).toBeUndefined();
    expect(useReciterDownloads.getState().installedVersion).toBe(0);
  });

  it('cancelling a second time or an unknown id does nothing', async () => {
    const pending = holdInstalls();
    const done = downloadReciterPack(30);

    cancelReciterPack(30);
    const afterFirst = useReciterDownloads.getState().byId;
    expect(() => cancelReciterPack(30)).not.toThrow();
    expect(() => cancelReciterPack(99)).not.toThrow();
    expect(useReciterDownloads.getState().byId).toBe(afterFirst);
    expect(pending[0]?.options.signal?.aborted).toBe(true);

    pending[0]?.resolve({ status: 'cancelled' });
    await expect(done).resolves.toBe(false);
    expect(useReciterDownloads.getState().byId[30]).toBeUndefined();
  });

  it('does nothing once the install has finished', async () => {
    const pending = holdInstalls();
    const done = downloadReciterPack(30);
    pending[0]?.resolve({ status: 'installed' });
    await expect(done).resolves.toBe(true);

    expect(() => cancelReciterPack(30)).not.toThrow();
    expect(pending[0]?.options.signal?.aborted).toBe(false);
  });
});

describe('a cancelled install settling late', () => {
  it('does not clear the entry of a new install of the same reciter started after the cancel', async () => {
    const pending = holdInstalls();
    const old = downloadReciterPack(30);
    cancelReciterPack(30);

    // The new install starts before the cancelled one has settled.
    const fresh = downloadReciterPack(30);
    expect(fresh).not.toBe(old);
    expect(useReciterDownloads.getState().byId[30]).toEqual({ status: 'downloading', progress: 0 });

    pending[0]?.resolve({ status: 'cancelled' });
    await expect(old).resolves.toBe(false);
    expect(useReciterDownloads.getState().byId[30]).toEqual({ status: 'downloading', progress: 0 });

    // The new install keeps its own progress and owns the entry until it settles.
    pending[1]?.options.onProgress?.(0.5);
    expect(useReciterDownloads.getState().byId[30]).toEqual({ status: 'downloading', progress: 0.5 });

    pending[1]?.resolve({ status: 'installed' });
    await expect(fresh).resolves.toBe(true);
    expect(useReciterDownloads.getState().byId[30]).toBeUndefined();
    expect(useReciterDownloads.getState().installedVersion).toBe(1);
  });

  it('a third call while the new install runs shares the new install, not the cancelled one', async () => {
    const pending = holdInstalls();
    const old = downloadReciterPack(30);
    cancelReciterPack(30);
    const fresh = downloadReciterPack(30);

    expect(downloadReciterPack(30)).toBe(fresh);
    expect(install).toHaveBeenCalledTimes(2);

    pending[0]?.resolve({ status: 'cancelled' });
    await old;
    pending[1]?.resolve({ status: 'installed' });
    await fresh;
  });

  it('a stale progress report from the cancelled install does not change the new entry', async () => {
    const pending = holdInstalls();
    void downloadReciterPack(30);
    cancelReciterPack(30);
    void downloadReciterPack(30);

    pending[0]?.options.onProgress?.(0.9);
    expect(useReciterDownloads.getState().byId[30]).toEqual({ status: 'downloading', progress: 0 });
  });
});
