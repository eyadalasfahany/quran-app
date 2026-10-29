import { renderHook } from '@testing-library/react-native';

import { startDownloadManager } from '../downloads/manager';
import { useDownloadManagerStartup } from './useDownloadManagerStartup';

jest.mock('../downloads/manager', () => ({
  startDownloadManager: jest.fn(() => Promise.resolve()),
}));

const start = jest.mocked(startDownloadManager);

beforeEach(() => {
  start.mockClear();
});

describe('useDownloadManagerStartup', () => {
  it('does nothing while the databases are not ready', async () => {
    await renderHook(() => useDownloadManagerStartup(false));

    expect(start).not.toHaveBeenCalled();
  });

  it('starts the manager once, when the databases become ready, and not again on re-render', async () => {
    const { rerender } = await renderHook(({ ready }: { ready: boolean }) => useDownloadManagerStartup(ready), {
      initialProps: { ready: false },
    });

    await rerender({ ready: true });
    await rerender({ ready: true });
    await rerender({ ready: true });

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('starts once even when the databases were ready on mount', async () => {
    await renderHook(() => useDownloadManagerStartup(true));

    expect(start).toHaveBeenCalledTimes(1);
  });
});
