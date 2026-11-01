import { storage } from '@/core/storage/mmkv';
import { getCoordinates } from '@/features/salah/data/location';

import { resyncAzkarReminders, resyncAzkarRemindersIfNeeded } from './resync';
import { syncAzkarReminders } from './reminder-service';
import { listReminders, type AzkarReminder } from './reminders-repository';
import { currentSyncState, writeRemindersSyncState } from './resync-state';

jest.mock('@/features/salah/data/location', () => ({
  getCoordinates: jest.fn(),
}));

jest.mock('./reminder-service', () => ({
  syncAzkarReminders: jest.fn(),
}));

// The user database is not open under Jest: the rows the sync would read are set per test.
jest.mock('./reminders-repository', () => ({
  listReminders: jest.fn(),
}));

const LONDON = { lat: 51.5074, lng: -0.1278 };
const NOW = new Date(2026, 9, 31, 12, 0, 0, 0);

function reminder(overrides: Partial<AzkarReminder> = {}): AzkarReminder {
  return {
    id: 'reminder-1',
    targetType: 'category',
    targetKey: 'morning',
    enabled: true,
    triggerType: 'prayer_relative',
    clockTime: null,
    prayer: 'asr',
    offsetMinutes: 10,
    notificationIds: [],
    updatedAt: 1,
    ...overrides,
  };
}

describe('Azkar reminder resync', () => {
  beforeEach(() => {
    storage.clearAll();
    jest.clearAllMocks();
    jest.mocked(listReminders).mockReturnValue([reminder()]);
    // The real sync records the state it synced for; the fake does the same so the foreground check can be exercised.
    jest.mocked(syncAzkarReminders).mockImplementation(({ now, coords }) => {
      writeRemindersSyncState(currentSyncState(now, coords));
      return Promise.resolve({ needsLocation: false, unscheduled: [] });
    });
    jest.mocked(getCoordinates).mockResolvedValue(LONDON);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('resyncAzkarReminders', () => {
    it('syncs with the current location, whether it is a manual city or GPS', async () => {
      await expect(resyncAzkarReminders(NOW)).resolves.toEqual({ needsLocation: false, unscheduled: [] });

      expect(syncAzkarReminders).toHaveBeenCalledWith({ now: NOW, coords: LONDON });
    });

    it('passes no coordinates when no location is set', async () => {
      jest.mocked(getCoordinates).mockResolvedValueOnce(null);

      await resyncAzkarReminders(NOW);

      expect(syncAzkarReminders).toHaveBeenCalledWith({ now: NOW, coords: null });
    });

    it('does not read the location for a clock reminder, which needs none', async () => {
      jest.mocked(listReminders).mockReturnValue([reminder({ triggerType: 'clock', clockTime: '06:30', prayer: null, offsetMinutes: null })]);

      await resyncAzkarReminders(NOW);

      expect(getCoordinates).not.toHaveBeenCalled();
      expect(syncAzkarReminders).toHaveBeenCalledWith({ now: NOW, coords: null });
    });

    it('does nothing and reads nothing when no reminder is scheduled', async () => {
      jest.mocked(listReminders).mockReturnValue([reminder({ enabled: false })]);

      await expect(resyncAzkarReminders(NOW)).resolves.toBeNull();

      expect(getCoordinates).not.toHaveBeenCalled();
      expect(syncAzkarReminders).not.toHaveBeenCalled();
    });

    it('still runs for a disabled reminder whose notifications must be cancelled', async () => {
      jest.mocked(listReminders).mockReturnValue([reminder({ enabled: false, notificationIds: ['n-1'] })]);

      await resyncAzkarReminders(NOW);

      expect(syncAzkarReminders).toHaveBeenCalledTimes(1);
    });

    it('logs a failed sync and resolves to null rather than throwing into the UI', async () => {
      jest.mocked(syncAzkarReminders).mockRejectedValueOnce(new Error('user.db closed'));

      await expect(resyncAzkarReminders(NOW)).resolves.toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('resyncAzkarRemindersIfNeeded', () => {
    it('syncs when nothing was synced yet', async () => {
      await expect(resyncAzkarRemindersIfNeeded(NOW)).resolves.toBe(true);

      expect(syncAzkarReminders).toHaveBeenCalledTimes(1);
    });

    it('does nothing when the day, the time zone and the coordinates are unchanged', async () => {
      await resyncAzkarRemindersIfNeeded(NOW);
      jest.clearAllMocks();
      jest.mocked(getCoordinates).mockResolvedValue(LONDON);

      await expect(resyncAzkarRemindersIfNeeded(NOW)).resolves.toBe(false);

      expect(syncAzkarReminders).not.toHaveBeenCalled();
    });

    it('syncs when the date changed (the next day, or a DST boundary)', async () => {
      await resyncAzkarRemindersIfNeeded(NOW);
      jest.clearAllMocks();

      await expect(resyncAzkarRemindersIfNeeded(new Date(2026, 10, 1, 9, 0))).resolves.toBe(true);

      expect(syncAzkarReminders).toHaveBeenCalledTimes(1);
    });

    it('syncs when the time zone changed', async () => {
      // A synced record from another zone: the device's own zone differs, so the check must fire.
      writeRemindersSyncState({ day: '2026-10-31', timeZone: 'Pacific/Chatham', coordsKey: '51.51,-0.13' });

      await expect(resyncAzkarRemindersIfNeeded(NOW)).resolves.toBe(true);
      expect(syncAzkarReminders).toHaveBeenCalledTimes(1);
    });

    it('syncs when the coordinates changed, whichever source they came from', async () => {
      writeRemindersSyncState({
        day: '2026-10-31',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        coordsKey: '21.42,39.83',
      });

      await expect(resyncAzkarRemindersIfNeeded(NOW)).resolves.toBe(true);
      expect(syncAzkarReminders).toHaveBeenCalledWith({ now: NOW, coords: LONDON });
    });

    it('syncs when the location was removed', async () => {
      writeRemindersSyncState({
        day: '2026-10-31',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        coordsKey: '51.51,-0.13',
      });
      jest.mocked(getCoordinates).mockResolvedValueOnce(null);

      await expect(resyncAzkarRemindersIfNeeded(NOW)).resolves.toBe(true);
      expect(syncAzkarReminders).toHaveBeenCalledWith({ now: NOW, coords: null });
    });

    it('ignores the coordinates for a clock reminder, so a foreground return reads no GPS', async () => {
      jest.mocked(listReminders).mockReturnValue([reminder({ triggerType: 'clock', clockTime: '06:30', prayer: null, offsetMinutes: null })]);

      await resyncAzkarRemindersIfNeeded(NOW);
      jest.clearAllMocks();

      await expect(resyncAzkarRemindersIfNeeded(NOW)).resolves.toBe(false);
      expect(getCoordinates).not.toHaveBeenCalled();
    });

    it('does nothing when no reminder is scheduled', async () => {
      jest.mocked(listReminders).mockReturnValue([]);

      await expect(resyncAzkarRemindersIfNeeded(NOW)).resolves.toBe(false);
      expect(getCoordinates).not.toHaveBeenCalled();
      expect(syncAzkarReminders).not.toHaveBeenCalled();
    });

    it('logs a failed check and reports no sync', async () => {
      jest.mocked(getCoordinates).mockRejectedValueOnce(new Error('gps'));

      await expect(resyncAzkarRemindersIfNeeded(NOW)).resolves.toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });
});
