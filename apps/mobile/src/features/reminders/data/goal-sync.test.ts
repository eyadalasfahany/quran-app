import * as Notifications from 'expo-notifications';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { readLastKnownCoordinates } from '@/features/azkar/reminders/last-known-coordinates';
import { getCoordinates } from '@/features/salah/data/location';
import { timesFor } from '@/features/salah/data/prayer-times';

import { writeFridayReminder, writeMisbahaReminder } from './goal-settings';
import { resyncGoalReminders, resyncGoalRemindersIfNeeded } from './goal-sync';

jest.mock('@/features/salah/data/location', () => ({
  ...jest.requireActual<typeof import('@/features/salah/data/location')>('@/features/salah/data/location'),
  getCoordinates: jest.fn(),
}));
jest.mock('@/features/azkar/reminders/last-known-coordinates', () => ({ readLastKnownCoordinates: jest.fn() }));
jest.mock('@/features/salah/data/prayer-times', () => ({ timesFor: jest.fn() }));

const COORDS = { lat: 30.04, lng: 31.24 };
const MORNING = new Date(2026, 2, 26, 9);
const NEXT_DAY = new Date(2026, 2, 27, 9);

describe('goal reminder sync', () => {
  beforeEach(() => {
    storage.clearAll();
    jest.clearAllMocks();
    jest.mocked(getCoordinates).mockResolvedValue(COORDS);
    jest.mocked(readLastKnownCoordinates).mockResolvedValue(COORDS);
    jest.mocked(timesFor).mockReturnValue({ dhuhr: new Date(2026, 2, 27, 12, 0) } as never);
  });

  it('reads the location for a Dhuhr Friday reminder on a full re-plan', async () => {
    writeFridayReminder({ enabled: true, mode: 'dhuhr', clockTime: null });

    await resyncGoalReminders(MORNING);

    expect(getCoordinates).toHaveBeenCalledTimes(1);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it('never reads the location for a clock reminder', async () => {
    writeFridayReminder({ enabled: true, mode: 'clock', clockTime: '07:00' });
    writeMisbahaReminder({ enabled: true, clockTime: '21:00' });

    await resyncGoalReminders(MORNING);

    expect(getCoordinates).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  });

  it('plans on the first foreground check, then only when the day changes', async () => {
    writeMisbahaReminder({ enabled: true, clockTime: '21:00' });

    expect(await resyncGoalRemindersIfNeeded(MORNING)).toBe(true);
    expect(await resyncGoalRemindersIfNeeded(MORNING)).toBe(false);
    expect(await resyncGoalRemindersIfNeeded(NEXT_DAY)).toBe(true);
    expect(storage.getString(storageKeys.reminders.goalsSync)).toContain('2026-03-27');
  });

  it('a foreground check uses the last known position, never a new fix', async () => {
    writeFridayReminder({ enabled: true, mode: 'dhuhr', clockTime: null });

    await resyncGoalRemindersIfNeeded(MORNING);

    expect(readLastKnownCoordinates).toHaveBeenCalled();
    expect(getCoordinates).not.toHaveBeenCalled();
  });

  it('a foreground check with no last known position uses the saved place (ADR 0086)', async () => {
    writeFridayReminder({ enabled: true, mode: 'dhuhr', clockTime: null });
    storage.set(storageKeys.salah.lastAutoCoords, '24.71,46.68');
    jest.mocked(readLastKnownCoordinates).mockResolvedValueOnce(null);

    await resyncGoalRemindersIfNeeded(MORNING);

    expect(timesFor).toHaveBeenCalledWith(expect.any(Date), { lat: 24.71, lng: 46.68 });
  });

  it('re-plans when the location changes, even on the same day', async () => {
    writeFridayReminder({ enabled: true, mode: 'dhuhr', clockTime: null });
    await resyncGoalRemindersIfNeeded(MORNING);
    jest.mocked(readLastKnownCoordinates).mockResolvedValue({ lat: 1, lng: 2 });

    expect(await resyncGoalRemindersIfNeeded(MORNING)).toBe(true);
  });
});
