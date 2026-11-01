import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/core/i18n';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { IOS_PENDING_LIMIT, AZKAR_SLOTS, DAILY_REMINDER_SLOTS, PRAYER_NOTIFICATION_SLOTS } from '@/features/notifications/budget';
import { writeSyncState, currentSyncState } from '@/features/notifications/sync-state';

import { getCoordinates } from './location';
import {
  enabledPrayers,
  prayerFireDates,
  prayerNotificationContent,
  resyncPrayerNotifications,
  resyncPrayerNotificationsIfNeeded,
  setPrayerBell,
  syncPrayerNotifications,
} from './notifications';
import { timesFor, type NextPrayerName } from './prayer-times';

jest.mock('./location', () => ({
  getCoordinates: jest.fn(),
}));

const LONDON = { lat: 51.5074, lng: -0.1278 };
const PRAYERS: NextPrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const NOW = new Date(2026, 9, 31, 12, 0, 0, 0); // 31 Oct 2026, noon, local

/** A local wall-clock instant: the engine works in the process's local calendar, as the Salah engine does. */
function local(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
  return new Date(year, month - 1, day, hour, minute, second, 0);
}

function dayOffset(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next;
}

function londonDay(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: '2-digit' }).format(date);
}

/** A stand-in for the OS pending list: schedule adds, cancel removes, getAll reads back. */
type Pending = { identifier: string; content: { data?: Record<string, unknown> }; trigger: unknown };
let pending: Pending[] = [];
let sequence = 0;

function prayerPending(): Pending[] {
  return pending.filter((request) => request.content.data?.route === '/salah');
}

function scheduledCalls() {
  return jest.mocked(Notifications.scheduleNotificationAsync).mock.calls;
}

function setBells(...names: NextPrayerName[]) {
  for (const name of PRAYERS) {
    storage.set(bellKey(name), names.includes(name));
  }
}

function bellKey(name: NextPrayerName): string {
  return {
    fajr: storageKeys.salah.bellFajr,
    dhuhr: storageKeys.salah.bellDhuhr,
    asr: storageKeys.salah.bellAsr,
    maghrib: storageKeys.salah.bellMaghrib,
    isha: storageKeys.salah.bellIsha,
  }[name];
}

describe('prayer notifications', () => {
  beforeEach(async () => {
    storage.clearAll();
    jest.clearAllMocks();
    await i18n.changeLanguage('ar');
    pending = [];
    sequence = 0;
    jest.mocked(getCoordinates).mockResolvedValue(LONDON);
    jest.mocked(Notifications.scheduleNotificationAsync).mockImplementation((request) => {
      sequence += 1;
      const identifier = `prayer-${sequence}`;
      pending.push({ identifier, content: request.content as Pending['content'], trigger: request.trigger });
      return Promise.resolve(identifier);
    });
    jest.mocked(Notifications.cancelScheduledNotificationAsync).mockImplementation((identifier) => {
      pending = pending.filter((request) => request.identifier !== identifier);
      return Promise.resolve();
    });
    jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockImplementation(() =>
      Promise.resolve(pending as never),
    );
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  describe('prayerFireDates (schedule math)', () => {
    it('gives exactly 8 future triggers per enabled prayer', () => {
      const fires = prayerFireDates(PRAYERS, NOW, LONDON);

      for (const prayer of PRAYERS) {
        const mine = fires.filter((fire) => fire.prayer === prayer);
        expect(mine).toHaveLength(8);
        expect(mine.every((fire) => fire.date.getTime() > NOW.getTime())).toBe(true);
      }
      expect(fires).toHaveLength(40);
    });

    it('takes the engine time of each of the next 8 days, in order, with no duplicates', () => {
      const fires = prayerFireDates(['maghrib'], NOW, LONDON);
      const expected = Array.from({ length: 8 }, (_, index) => timesFor(dayOffset(NOW, index), LONDON).maghrib.getTime());

      expect(fires.map((fire) => fire.date.getTime())).toEqual(expected);
      expect(new Set(expected).size).toBe(8);
    });

    it('excludes a prayer already past today', () => {
      const fires = prayerFireDates(['fajr'], NOW, LONDON);
      const todayFajr = timesFor(NOW, LONDON).fajr.getTime();

      expect(todayFajr).toBeLessThan(NOW.getTime());
      expect(fires.map((fire) => fire.date.getTime())).not.toContain(todayFajr);
    });

    it('includes today’s prayer that is still ahead', () => {
      const fires = prayerFireDates(['isha'], NOW, LONDON);
      const todayIsha = timesFor(NOW, LONDON).isha.getTime();

      expect(todayIsha).toBeGreaterThan(NOW.getTime());
      expect(fires[0]?.date.getTime()).toBe(todayIsha);
    });

    it('rolls over at midnight: after 23:59 the window starts tomorrow and still holds 8 per prayer', () => {
      const lateNight = local(2026, 10, 31, 23, 59, 30);
      const fires = prayerFireDates(PRAYERS, lateNight, LONDON);

      for (const prayer of PRAYERS) {
        const mine = fires.filter((fire) => fire.prayer === prayer).map((fire) => fire.date.getTime());
        const tomorrowThrough = Array.from({ length: 8 }, (_, index) =>
          timesFor(local(2026, 11, 1 + index), LONDON)[prayer].getTime(),
        );
        expect(mine).toEqual(tomorrowThrough);
      }
    });

    it('stays correct across the London clock change on 2026-10-25', () => {
      const before = local(2026, 10, 24, 12, 0);
      const fires = prayerFireDates(['maghrib'], before, LONDON);

      expect(fires).toHaveLength(8);
      fires.forEach((fire, index) => {
        expect(fire.date.getTime()).toBe(timesFor(dayOffset(before, index), LONDON).maghrib.getTime());
      });
      // One fire per local day across the change: 24 Oct to 31 Oct, none doubled.
      expect(fires.map((fire) => londonDay(fire.date))).toEqual(['24', '25', '26', '27', '28', '29', '30', '31']);
      for (const fire of fires) {
        const hour = Number(
          new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23' }).format(fire.date),
        );
        expect(hour).toBeGreaterThanOrEqual(15);
        expect(hour).toBeLessThanOrEqual(18);
      }
    });

    it('returns nothing without coordinates or without a prayer', () => {
      expect(prayerFireDates(PRAYERS, NOW, null)).toEqual([]);
      expect(prayerFireDates([], NOW, LONDON)).toEqual([]);
    });
  });

  describe('prayerNotificationContent', () => {
    it('titles the notification with the prayer name in Arabic, routed to الصلاة', async () => {
      await i18n.changeLanguage('ar');
      const content = prayerNotificationContent('fajr');

      expect(content.title).toBe('حان وقت صلاة الفجر');
      expect(content.body).toBe('اضغط لفتح مواقيت الصلاة');
      expect(content.data).toEqual({ route: '/salah' });
    });

    it('titles it in English when the reader has chosen English', async () => {
      await i18n.changeLanguage('en');
      try {
        expect(prayerNotificationContent('maghrib').title).toBe('Time for Maghrib prayer');
      } finally {
        await i18n.changeLanguage('ar');
      }
    });
  });

  describe('syncPrayerNotifications', () => {
    it('schedules a date trigger per fire time, with the system sound and no adhan audio', async () => {
      setBells('fajr', 'isha');
      await syncPrayerNotifications({ now: NOW, coords: LONDON });

      expect(scheduledCalls()).toHaveLength(16);
      for (const [request] of scheduledCalls()) {
        expect(request.trigger).toMatchObject({ type: 'date' });
        expect(request.content).not.toHaveProperty('sound', expect.stringContaining('adhan'));
      }
    });

    it('creates the prayer channel and names it on Android, and sends through it', async () => {
      const restore = jest.replaceProperty(Platform, 'OS', 'android');
      try {
        setBells('dhuhr');
        await syncPrayerNotifications({ now: NOW, coords: LONDON });

        expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
          'prayer',
          expect.objectContaining({ name: 'إشعارات الصلاة' }),
        );
        expect(scheduledCalls()[0]?.[0].trigger).toMatchObject({ channelId: 'prayer' });
      } finally {
        restore.restore();
      }
    });

    it('cancels the previous prayer notifications before it schedules, and leaves other routes alone', async () => {
      pending = [
        { identifier: 'old-prayer', content: { data: { route: '/salah' } }, trigger: null },
        { identifier: 'daily', content: { data: { route: '/read/2:255' } }, trigger: null },
      ];
      setBells('asr');

      await syncPrayerNotifications({ now: NOW, coords: LONDON });

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old-prayer');
      expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('daily');
      const cancelOrder = jest.mocked(Notifications.cancelScheduledNotificationAsync).mock.invocationCallOrder[0] ?? 0;
      const scheduleOrder = jest.mocked(Notifications.scheduleNotificationAsync).mock.invocationCallOrder[0] ?? 0;
      expect(cancelOrder).toBeLessThan(scheduleOrder);
      expect(pending.map((request) => request.identifier)).toContain('daily');
    });

    it('does not duplicate when run twice: the pending set is the same size after a second sync', async () => {
      setBells('fajr', 'dhuhr');
      await syncPrayerNotifications({ now: NOW, coords: LONDON });
      await syncPrayerNotifications({ now: NOW, coords: LONDON });

      expect(prayerPending()).toHaveLength(16);
    });

    it('removes every prayer notification when all bells are off', async () => {
      setBells('fajr');
      await syncPrayerNotifications({ now: NOW, coords: LONDON });
      setBells();
      await syncPrayerNotifications({ now: NOW, coords: LONDON });

      expect(prayerPending()).toHaveLength(0);
    });

    it('schedules nothing without a location, but records the state so the next check knows', async () => {
      setBells('fajr');
      await syncPrayerNotifications({ now: NOW, coords: null });

      expect(scheduledCalls()).toHaveLength(0);
      expect(JSON.parse(storage.getString(storageKeys.salah.notificationsSync) ?? 'null')).toEqual(
        currentSyncState(NOW, null),
      );
    });

    it('clears the recorded state when scheduling fails, so the next check plans again', async () => {
      setBells('fajr');
      jest.mocked(Notifications.scheduleNotificationAsync).mockRejectedValueOnce(new Error('os refused'));

      await expect(syncPrayerNotifications({ now: NOW, coords: LONDON })).rejects.toThrow('os refused');
      expect(storage.getString(storageKeys.salah.notificationsSync)).toBeUndefined();
    });
  });

  describe('refresh triggers', () => {
    beforeEach(() => {
      setBells('fajr', 'maghrib');
    });

    it('a launch re-plans once: 16 new triggers for two bells', async () => {
      await resyncPrayerNotifications(NOW);

      expect(scheduledCalls()).toHaveLength(16);
      expect(prayerPending()).toHaveLength(16);
    });

    it('a foreground check with nothing moved does nothing', async () => {
      await resyncPrayerNotifications(NOW);
      jest.mocked(Notifications.scheduleNotificationAsync).mockClear();

      await expect(resyncPrayerNotificationsIfNeeded(NOW)).resolves.toBe(false);
      expect(scheduledCalls()).toHaveLength(0);
    });

    it('a new day re-plans exactly once', async () => {
      await resyncPrayerNotifications(NOW);
      jest.mocked(Notifications.scheduleNotificationAsync).mockClear();

      await expect(resyncPrayerNotificationsIfNeeded(local(2026, 11, 1, 8))).resolves.toBe(true);
      expect(scheduledCalls()).toHaveLength(16);
      expect(prayerPending()).toHaveLength(16);
    });

    it('a time zone change re-plans exactly once', async () => {
      await resyncPrayerNotifications(NOW);
      writeSyncState(storageKeys.salah.notificationsSync, { ...currentSyncState(NOW, LONDON), timeZone: 'Asia/Riyadh' });
      jest.mocked(Notifications.scheduleNotificationAsync).mockClear();

      await expect(resyncPrayerNotificationsIfNeeded(NOW)).resolves.toBe(true);
      expect(scheduledCalls()).toHaveLength(16);
    });

    it('a manual city change re-plans exactly once, reading the location in the normal way', async () => {
      await resyncPrayerNotifications(NOW);
      jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
      jest.mocked(getCoordinates).mockClear();
      jest.mocked(getCoordinates).mockResolvedValue({ lat: 21.4225, lng: 39.8262 });
      storage.set(storageKeys.salah.locationSource, 'manual');
      storage.set(storageKeys.salah.manualLat, 21.4225);
      storage.set(storageKeys.salah.manualLng, 39.8262);

      await expect(resyncPrayerNotificationsIfNeeded(NOW)).resolves.toBe(true);
      expect(scheduledCalls()).toHaveLength(16);
      expect(getCoordinates).toHaveBeenCalledWith({ lastKnownOnly: false });
    });

    it('a GPS-only move is not read on a foreground check: no location read while day, zone and settings hold', async () => {
      await resyncPrayerNotifications(NOW);
      jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
      jest.mocked(getCoordinates).mockClear();
      jest.mocked(getCoordinates).mockResolvedValue({ lat: 21.4225, lng: 39.8262 });

      await expect(resyncPrayerNotificationsIfNeeded(NOW)).resolves.toBe(false);
      expect(getCoordinates).not.toHaveBeenCalled();
      expect(scheduledCalls()).toHaveLength(0);
    });

    it('a new day on the foreground reads the last known position only, never a fresh GPS fix', async () => {
      await resyncPrayerNotifications(NOW);
      jest.mocked(getCoordinates).mockClear();

      await expect(resyncPrayerNotificationsIfNeeded(local(2026, 11, 1, 8))).resolves.toBe(true);
      expect(getCoordinates).toHaveBeenCalledWith({ lastKnownOnly: true });
    });

    it('a changed bell re-plans on the foreground check, reading the location in the normal way', async () => {
      await resyncPrayerNotifications(NOW);
      jest.mocked(getCoordinates).mockClear();
      storage.set(bellKey('isha'), true);

      await expect(resyncPrayerNotificationsIfNeeded(NOW)).resolves.toBe(true);
      expect(getCoordinates).toHaveBeenCalledWith({ lastKnownOnly: false });
    });

    it('concurrent triggers (launch, foreground, location) coalesce into one schedule', async () => {
      const results = await Promise.all([
        resyncPrayerNotificationsIfNeeded(NOW),
        resyncPrayerNotificationsIfNeeded(NOW),
        resyncPrayerNotificationsIfNeeded(NOW),
      ]);

      expect(results.filter(Boolean)).toHaveLength(1);
      expect(scheduledCalls()).toHaveLength(16);
      expect(prayerPending()).toHaveLength(16);
    });

    it('reads the location only when a prayer is on', async () => {
      setBells();
      await resyncPrayerNotifications(NOW);

      expect(getCoordinates).not.toHaveBeenCalled();
    });

    it('does nothing for the foreground check when no prayer was ever synced and none is on', async () => {
      setBells();
      await expect(resyncPrayerNotificationsIfNeeded(NOW)).resolves.toBe(false);
      expect(scheduledCalls()).toHaveLength(0);
    });
  });

  describe('setPrayerBell (toggle, permission, persistence)', () => {
    it('turning on with permission persists the bell and schedules its 8 days', async () => {
      await expect(setPrayerBell('fajr', true, NOW)).resolves.toBe(true);

      expect(storage.getBoolean(storageKeys.salah.bellFajr)).toBe(true);
      expect(prayerPending()).toHaveLength(8);
      expect(enabledPrayers()).toEqual(['fajr']);
    });

    it('asks for permission on the first turn-on only when it is not yet granted', async () => {
      jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
      jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({ granted: true } as never);

      await expect(setPrayerBell('isha', true, NOW)).resolves.toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('when permission is refused the bell stays off, nothing is scheduled, and the result is false', async () => {
      jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
      jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);

      await expect(setPrayerBell('dhuhr', true, NOW)).resolves.toBe(false);

      expect(storage.getBoolean(storageKeys.salah.bellDhuhr)).toBeUndefined();
      expect(scheduledCalls()).toHaveLength(0);
    });

    it('treats a failing permission check as refused', async () => {
      jest.mocked(Notifications.getPermissionsAsync).mockRejectedValueOnce(new Error('no module'));

      await expect(setPrayerBell('asr', true, NOW)).resolves.toBe(false);
      expect(storage.getBoolean(storageKeys.salah.bellAsr)).toBeUndefined();
    });

    it('turning off persists false and removes that prayer’s pending notifications, without permission', async () => {
      await setPrayerBell('fajr', true, NOW);
      await setPrayerBell('isha', true, NOW);
      jest.mocked(Notifications.getPermissionsAsync).mockClear();

      await expect(setPrayerBell('fajr', false, NOW)).resolves.toBe(true);

      expect(storage.getBoolean(storageKeys.salah.bellFajr)).toBe(false);
      expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
      expect(prayerPending()).toHaveLength(8);
    });

    it('each applied toggle re-plans exactly once', async () => {
      await setPrayerBell('maghrib', true, NOW);

      expect(scheduledCalls()).toHaveLength(8);
    });
  });

  describe('budget fit', () => {
    it('keeps five prayers of 8 days within the prayer share, and the whole pool at the iOS limit', () => {
      expect(PRAYERS.length * 8).toBeLessThanOrEqual(PRAYER_NOTIFICATION_SLOTS);
      expect(PRAYER_NOTIFICATION_SLOTS + AZKAR_SLOTS + DAILY_REMINDER_SLOTS).toBe(64);
      expect(PRAYER_NOTIFICATION_SLOTS + AZKAR_SLOTS + DAILY_REMINDER_SLOTS).toBe(IOS_PENDING_LIMIT);
    });

    it('never schedules more than the prayer share, even with every bell on', async () => {
      setBells(...PRAYERS);
      await resyncPrayerNotifications(NOW);

      expect(prayerPending().length).toBeLessThanOrEqual(PRAYER_NOTIFICATION_SLOTS);
      expect(prayerPending()).toHaveLength(40);
    });
  });
});
