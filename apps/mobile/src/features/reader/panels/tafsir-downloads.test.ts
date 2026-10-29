import { installResource, type InstallOptions, type InstallResult } from '@/core/sync';

import { resetTafsirDownloads, useTafsirDownloads } from './tafsir-downloads';

jest.mock('@/core/sync', () => ({ installResource: jest.fn() }));

const install = jest.mocked(installResource);

type Pending = { options: InstallOptions; resolve: (result: InstallResult) => void };

// Each call to installResource waits until the test resolves it, the way the real install does.
function holdInstalls(): Pending[] {
  const pending: Pending[] = [];
  install.mockImplementation(
    (_id, options) =>
      new Promise<InstallResult>((resolve) => {
        options?.signal?.addEventListener('abort', () => {
          resolve({ status: 'cancelled' });
        });
        pending.push({ options: options ?? {}, resolve });
      }),
  );
  return pending;
}

beforeEach(() => {
  install.mockReset();
  resetTafsirDownloads();
});

describe('useTafsirDownloads', () => {
  it('starts at 0 and reports progress while the install runs', () => {
    const pending = holdInstalls();

    useTafsirDownloads.getState().start(14);
    expect(useTafsirDownloads.getState().byId[14]).toEqual({ status: 'downloading', progress: 0 });

    pending[0]?.options.onProgress?.(0.4);
    expect(useTafsirDownloads.getState().byId[14]).toEqual({ status: 'downloading', progress: 0.4 });
  });

  it('removes the entry and bumps installedVersion when the install finishes', async () => {
    const pending = holdInstalls();
    useTafsirDownloads.getState().start(14);
    pending[0]?.options.onProgress?.(0.9);

    pending[0]?.resolve({ status: 'installed' });
    await Promise.resolve();
    await Promise.resolve();

    expect(useTafsirDownloads.getState().byId[14]).toBeUndefined();
    expect(useTafsirDownloads.getState().installedVersion).toBe(1);
  });

  it('removes the entry without bumping installedVersion when the install is cancelled', async () => {
    holdInstalls();
    useTafsirDownloads.getState().start(14);

    useTafsirDownloads.getState().cancel(14);
    await Promise.resolve();
    await Promise.resolve();

    expect(useTafsirDownloads.getState().byId[14]).toBeUndefined();
    expect(useTafsirDownloads.getState().installedVersion).toBe(0);
  });

  it('aborts the signal passed to installResource on cancel', () => {
    const pending = holdInstalls();
    useTafsirDownloads.getState().start(14);

    useTafsirDownloads.getState().cancel(14);

    expect(pending[0]?.options.signal?.aborted).toBe(true);
  });

  it('sets the entry to failed when the install fails', async () => {
    const pending = holdInstalls();
    useTafsirDownloads.getState().start(14);

    pending[0]?.resolve({ status: 'failed', reason: 'network' });
    await Promise.resolve();
    await Promise.resolve();

    expect(useTafsirDownloads.getState().byId[14]).toEqual({ status: 'failed', progress: 0 });
    expect(useTafsirDownloads.getState().installedVersion).toBe(0);
  });

  it('starts again from a failed entry', () => {
    const pending = holdInstalls();
    useTafsirDownloads.setState({ byId: { 14: { status: 'failed', progress: 0 } } });

    useTafsirDownloads.getState().start(14);

    expect(install).toHaveBeenCalledTimes(1);
    expect(pending).toHaveLength(1);
    expect(useTafsirDownloads.getState().byId[14]).toEqual({ status: 'downloading', progress: 0 });
  });

  it('ignores a second start while the same id is downloading', () => {
    holdInstalls();
    useTafsirDownloads.getState().start(14);

    useTafsirDownloads.getState().start(14);

    expect(install).toHaveBeenCalledTimes(1);
  });

  it('keeps other ids independent', () => {
    holdInstalls();
    useTafsirDownloads.getState().start(14);
    useTafsirDownloads.getState().start(90);

    expect(install).toHaveBeenCalledTimes(2);
    expect(Object.keys(useTafsirDownloads.getState().byId).sort()).toEqual(['14', '90']);
  });
});
