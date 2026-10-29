import { renderHook } from '@testing-library/react-native';

import { playChapter, restoreLastSession, resume } from '../player';
import { usePlayerStore } from '../playerStore';
import { useRestorePlayerSession } from './useRestorePlayerSession';

jest.mock('../player', () => ({
  restoreLastSession: jest.fn(() => true),
  playChapter: jest.fn(() => Promise.resolve()),
  resume: jest.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  jest.clearAllMocks();
  usePlayerStore.getState().reset();
});

describe('useRestorePlayerSession', () => {
  it('restores once, after the content database is ready', async () => {
    const { rerender } = await renderHook(({ ready }: { ready: boolean }) => useRestorePlayerSession(ready), {
      initialProps: { ready: false },
    });
    expect(restoreLastSession).not.toHaveBeenCalled();

    await rerender({ ready: true });
    expect(restoreLastSession).toHaveBeenCalledTimes(1);

    await rerender({ ready: true });
    await rerender({ ready: false });
    await rerender({ ready: true });
    expect(restoreLastSession).toHaveBeenCalledTimes(1);
  });

  it('does not restore while the content database is not ready', async () => {
    await renderHook(() => useRestorePlayerSession(false));

    expect(restoreLastSession).not.toHaveBeenCalled();
  });

  it('never plays: it only restores, and nothing starts', async () => {
    await renderHook(() => useRestorePlayerSession(true));

    expect(restoreLastSession).toHaveBeenCalledTimes(1);
    expect(playChapter).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled();
    expect(usePlayerStore.getState().status).toBe('idle');
  });
});
