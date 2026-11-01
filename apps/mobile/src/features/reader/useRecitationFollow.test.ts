import { act, renderHook } from '@testing-library/react-native';

import { usePlayerStore } from '@/features/audio/playerStore';

import { useRecitationFollow } from './useRecitationFollow';

describe('useRecitationFollow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-01T10:00:00Z'));
    usePlayerStore.getState().reset();
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    usePlayerStore.getState().reset();
  });

  it('a drag pauses following; it stays paused after long delays; resume follows again', async () => {
    const { result } = await renderHook(() => useRecitationFollow(true));

    expect(result.current.following).toBe(true);

    await act(async () => {
      result.current.onUserScrollStart();
    });
    expect(result.current.following).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    expect(result.current.following).toBe(false);

    await act(async () => {
      result.current.resume();
    });
    expect(result.current.following).toBe(true);
  });

  it('a new play command resumes following', async () => {
    const { result } = await renderHook(() => useRecitationFollow(true));

    await act(async () => {
      result.current.onUserScrollStart();
    });
    expect(result.current.following).toBe(false);

    await act(async () => {
      usePlayerStore.getState().bumpPlayCommand();
    });
    expect(result.current.following).toBe(true);
  });
});
