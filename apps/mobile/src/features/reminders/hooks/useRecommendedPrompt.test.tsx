import { router } from 'expo-router';
import { renderHook } from '@testing-library/react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { RECOMMENDED_ROUTE, useRecommendedPrompt } from './useRecommendedPrompt';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/features/azkar/reminders/reminders-repository', () => ({ listReminders: jest.fn(() => []) }));

describe('useRecommendedPrompt', () => {
  beforeEach(() => {
    storage.clearAll();
    jest.clearAllMocks();
  });

  it('offers the set once on a visit with notifications allowed and nothing on', async () => {
    await renderHook(() => useRecommendedPrompt(true));

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith(RECOMMENDED_ROUTE);
    expect(storage.getBoolean(storageKeys.reminders.recommendedShown)).toBe(true);
  });

  it('does not offer while notifications are not allowed, or before the answer is known', async () => {
    await renderHook(() => useRecommendedPrompt(false));
    await renderHook(() => useRecommendedPrompt(null));

    expect(router.push).not.toHaveBeenCalled();
  });

  it('does not offer again on a later visit, whatever the user chose', async () => {
    await renderHook(() => useRecommendedPrompt(true));
    await renderHook(() => useRecommendedPrompt(true));

    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('does not offer when a reminder is already on', async () => {
    storage.set(storageKeys.dailyReminder, true);

    await renderHook(() => useRecommendedPrompt(true));

    expect(router.push).not.toHaveBeenCalled();
  });
});
