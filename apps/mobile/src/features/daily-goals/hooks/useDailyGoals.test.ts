import { act, renderHook } from '@testing-library/react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { NO_DAILY_GOALS } from '../data/goals';
import { useDailyGoals } from './useDailyGoals';

describe('useDailyGoals', () => {
  beforeEach(() => {
    storage.remove(storageKeys.dailyGoals);
  });

  it('starts with nothing on', async () => {
    const { result } = await renderHook(() => useDailyGoals());

    expect(result.current.goals).toEqual(NO_DAILY_GOALS);
  });

  it('writes an update and re-renders with it', async () => {
    const { result } = await renderHook(() => useDailyGoals());

    await act(() => result.current.update({ misbahaTarget: 99, sessions: ['morning'], wird: false }));

    expect(result.current.goals).toEqual({ misbahaTarget: 99, sessions: ['morning'], wird: false });
    expect(storage.getString(storageKeys.dailyGoals)).toBe(JSON.stringify({ misbahaTarget: 99, sessions: ['morning'], wird: false }));
  });

  it('follows a change made elsewhere', async () => {
    const { result } = await renderHook(() => useDailyGoals());

    await act(async () => {
      storage.set(storageKeys.dailyGoals, JSON.stringify({ misbahaTarget: null, sessions: ['evening'], wird: true }));
    });

    expect(result.current.goals.sessions).toEqual(['evening']);
    expect(result.current.goals.wird).toBe(true);
  });
});
