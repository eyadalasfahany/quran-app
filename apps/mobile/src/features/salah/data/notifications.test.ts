import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/core/i18n';
import { saveLocale } from '@/core/i18n/locale';
import { storage, storageKeys } from '@/core/storage/mmkv';
import {
  AZKAR_SLOTS,
  DAILY_REMINDER_SLOTS,
  FRIDAY_REMINDER_SLOTS,
  IOS_PENDING_LIMIT,
  MISBAHA_REMINDER_SLOTS,
  PRAYER_NOTIFICATION_SLOTS,
} from '@/features/notifications/budget';
import { writeSyncState, currentSyncState } from '@/features/notifications/sync-state';

import { ADHAN_VOICES, DEFAULT_PRAYER_SOUND, PRAYER_SOUND_IDS, type PrayerSoundId } from './adhan-sounds';
import { getCoordinates } from './location';
import { prayerRollingDays, PRAYER_ROLLING_DAYS_WITH_IQAMAH } from '@/features/notifications/budget';

import { setIqamahOffsetMinutes } from './iqamah-offset';
import {
  enabledPrayers,
  iqamahFireDates,
  iqamahNotificationContent,
  prayerFireDates,
  prayerNotificationContent,
  resyncPrayerNotifications,
  resyncPrayerNotificationsIfNeeded,
  setIqamahOffset,
  setPrayerBell,
  setPrayerSound,
  syncPrayerNotifications,
} from './notifications';
import { timesFor, type NextPrayerName } from './prayer-times';

jest.mock('./location', () => ({
  ...jest.requireActual('./location'),
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
type Pending = {
  identifier: string;
  content: { data?: Record<string, unknown>; sound?: unknown };
  trigger: unknown;
};
let pending: Pending[] = [];
let sequence = 0;

function prayerPending(): Pending[] {
  return pending.filter((request) => request.content.data?.route === '/salah');
}

function adhanPending(): Pending[] {
  return prayerPending().filter((request) => request.content.data?.kind !== 'iqamah');
}

function iqamahPending(): Pending[] {
  return prayerPending().filter((request) => request.content.data?.kind === 'iqamah');
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

    it('honours a custom day window (4 days when iqamah offset is on)', () => {
      const days = prayerRollingDays(10);
      expect(days).toBe(PRAYER_ROLLING_DAYS_WITH_IQAMAH);
      const fires = prayerFireDates(PRAYERS, NOW, LONDON, days);
      for (const prayer of PRAYERS) {
        expect(fires.filter((fire) => fire.prayer === prayer)).toHaveLength(4);
      }
      expect(fires).toHaveLength(20);
    });
  });

  describe('iqamahFireDates (schedule math)', () => {
    it('returns nothing when offset is 0', () => {
      expect(iqamahFireDates(PRAYERS, NOW, LONDON, 0, 4)).toEqual([]);
    });

    it('adds the offset to each prayer time and keeps 4 futures per prayer', () => {
      const fires = iqamahFireDates(PRAYERS, NOW, LONDON, 10, 4);
      for (const prayer of PRAYERS) {
        const mine = fires.filter((fire) => fire.prayer === prayer);
        expect(mine).toHaveLength(4);
        expect(mine.every((fire) => fire.date.getTime() > NOW.getTime())).toBe(true);
      }
      expect(fires).toHaveLength(20);
    });

    it('fires 10 minutes after the adhan time for maghrib', () => {
      const fires = iqamahFireDates(['maghrib'], NOW, LONDON, 10, 4);
      const adhan = prayerFireDates(['maghrib'], NOW, LONDON, 4);
      expect(fires[0]?.date.getTime()).toBe(adhan[0]!.date.getTime() + 10 * 60_000);
    });

    it('skips fire times at or before now', () => {
      const late = local(2026, 10, 31, 18, 0);
      const fires = iqamahFireDates(['maghrib'], late, LONDON, 5, 4);
      expect(fires.every((fire) => fire.date.getTime() > late.getTime())).toBe(true);
    });

    it('returns nothing without coordinates', () => {
      expect(iqamahFireDates(PRAYERS, NOW, null, 10, 4)).toEqual([]);
    });
  });

  describe('iqamahNotificationContent', () => {
    it('uses iqamah copy, default sound and kind in Arabic', async () => {
      await i18n.changeLanguage('ar');
      const content = iqamahNotificationContent('fajr');

      expect(content.title).toBe('الإقامة بعد قليل');
      expect(content.body).toContain(i18n.t('home.salah.fajr'));
      expect(content.data).toEqual({ route: '/salah', kind: 'iqamah' });
      expect(content.sound).toBe('default');
    });

    it('titles and bodies in English when the reader chose English', async () => {
      await i18n.changeLanguage('en');
      try {
        const content = iqamahNotificationContent('maghrib');
        expect(content.title).toBe('Iqamah soon');
        expect(content.body).toContain('Maghrib');
      } finally {
        await i18n.changeLanguage('ar');
      }
    });
  });

  describe('prayerNotificationContent', () => {
    it('titles the notification with the prayer name in Arabic, routed to الصلاة', async () => {
      await i18n.changeLanguage('ar');
      const content = prayerNotificationContent('fajr');

      expect(content.title).toBe('حان وقت صلاة الفجر');
      expect(content.body).toBe('يحين الآن موعد أذان الفجر');
      expect(content.data).toEqual({ route: '/salah' });
      expect(content.sound).toBe('allahu_akbar_short.wav');
    });

    it('interpolates the prayer name into the shared body template, in Arabic and English', async () => {
      const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
      for (const locale of ['ar', 'en']) {
        await i18n.changeLanguage(locale);
        for (const prayer of prayers) {
          const { body } = prayerNotificationContent(prayer);
          expect(body).toContain(i18n.t(`home.salah.${prayer}`));
          expect(body).not.toMatch(/^notifications\./);
        }
      }
      await i18n.changeLanguage('ar');
    });

    it('includes the manual city in the body when set, otherwise omits the place clause', async () => {
      await i18n.changeLanguage('ar');
      expect(prayerNotificationContent('fajr').body).toBe('يحين الآن موعد أذان الفجر');

      storage.set(storageKeys.salah.locationSource, 'manual');
      storage.set(storageKeys.salah.manualCityId, 'dubai');
      expect(prayerNotificationContent('fajr').body).toBe('يحين الآن موعد أذان الفجر حسب توقيت دبي');

      await i18n.changeLanguage('en');
      saveLocale('en');
      expect(prayerNotificationContent('maghrib').body).toBe('It is now time for the Maghrib adhan according to Dubai time');

      storage.set(storageKeys.salah.locationSource, 'automatic');
      expect(prayerNotificationContent('maghrib').body).toBe('It is now time for the Maghrib adhan');

      await i18n.changeLanguage('ar');
      saveLocale('ar');
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
    it('schedules a date trigger per fire time, each with the default takbir voice', async () => {
      setBells('fajr', 'isha');
      await syncPrayerNotifications({ now: NOW, coords: LONDON });

      expect(scheduledCalls()).toHaveLength(16);
      for (const [request] of scheduledCalls()) {
        expect(request.trigger).toMatchObject({ type: 'date' });
        expect(request.content).toHaveProperty('sound', 'allahu_akbar_short.wav');
      }
    });

    it('creates only the default voice channel on Android, named for it, and sends through it', async () => {
      const restore = jest.replaceProperty(Platform, 'OS', 'android');
      try {
        setBells('dhuhr');
        await syncPrayerNotifications({ now: NOW, coords: LONDON });

        expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(1);
        expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
          'prayer_adhan_allahu_akbar_short',
          expect.objectContaining({ name: 'الصلاة: الله أكبر', sound: 'allahu_akbar_short.wav' }),
        );
        expect(scheduledCalls()[0]?.[0].trigger).toMatchObject({
          channelId: 'prayer_adhan_allahu_akbar_short',
        });
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

    it('with iqamah offset 10 schedules adhan and iqamah (4 each per prayer), at most 40 total', async () => {
      setBells(...PRAYERS);
      setIqamahOffsetMinutes(10);
      await syncPrayerNotifications({ now: NOW, coords: LONDON });

      expect(prayerPending()).toHaveLength(40);
      expect(adhanPending()).toHaveLength(20);
      expect(iqamahPending()).toHaveLength(20);
      for (const request of iqamahPending()) {
        expect(request.content.sound).toBe('default');
        expect(request.content.data?.kind).toBe('iqamah');
      }
      for (const request of adhanPending()) {
        expect(request.content.data?.kind).toBeUndefined();
      }
    });

    it('creates the system prayer channel for iqamah on Android, not an adhan voice channel', async () => {
      const restore = jest.replaceProperty(Platform, 'OS', 'android');
      try {
        setBells('dhuhr');
        setIqamahOffsetMinutes(10);
        await syncPrayerNotifications({ now: NOW, coords: LONDON });

        expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
          'prayer',
          expect.objectContaining({ name: expect.any(String) }),
        );
        const iqamahTrigger = scheduledCalls().find(([request]) => request.content.data?.kind === 'iqamah')?.[0].trigger;
        expect(iqamahTrigger).toMatchObject({ channelId: 'prayer' });
        const adhanTrigger = scheduledCalls().find(([request]) => request.content.data?.kind !== 'iqamah')?.[0].trigger;
        expect(adhanTrigger).toMatchObject({ channelId: 'prayer_adhan_allahu_akbar_short' });
      } finally {
        restore.restore();
      }
    });

    it('cancels both adhan and iqamah when re-syncing', async () => {
      setBells('fajr');
      setIqamahOffsetMinutes(10);
      await syncPrayerNotifications({ now: NOW, coords: LONDON });
      pending.push({
        identifier: 'orphan-iqamah',
        content: { data: { route: '/salah', kind: 'iqamah' } },
        trigger: null,
      });
      setIqamahOffsetMinutes(0);
      await syncPrayerNotifications({ now: NOW, coords: LONDON });

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('orphan-iqamah');
      expect(iqamahPending()).toHaveLength(0);
    });
  });

  describe('setIqamahOffset', () => {
    it('persists the offset and re-plans once', async () => {
      setBells('fajr');
      await setIqamahOffset(15, NOW);

      expect(storage.getNumber(storageKeys.salah.iqamahOffsetMinutes)).toBe(15);
      expect(prayerPending()).toHaveLength(8);
      expect(iqamahPending()).toHaveLength(4);
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

    it('a changed iqamah offset re-plans on the foreground check', async () => {
      await resyncPrayerNotifications(NOW);
      jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
      setIqamahOffsetMinutes(10);

      await expect(resyncPrayerNotificationsIfNeeded(NOW)).resolves.toBe(true);
      expect(iqamahPending().length).toBeGreaterThan(0);
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

  describe('prayer sound (ADR 0047)', () => {
    /** The channel a sound must use on Android, by its id (the catalogue ids are the voice ids). */
    const CHANNEL_FOR: Record<PrayerSoundId, string> = {
      allahu_akbar_short: 'prayer_adhan_allahu_akbar_short',
      makkah: 'prayer_adhan_makkah',
      madinah: 'prayer_adhan_madinah',
      system: 'prayer',
      silent: 'prayer_silent',
    };

    /** The content sound each sound must produce: a voice's file, 'default', or false for silent. */
    function soundFor(id: PrayerSoundId): string | false {
      const voice = ADHAN_VOICES.find((item) => item.id === id);
      if (voice !== undefined) {
        return voice.file;
      }
      return id === 'silent' ? false : 'default';
    }

    it('gives each of the five sounds its content sound', () => {
      expect(PRAYER_SOUND_IDS).toHaveLength(5);
      for (const id of PRAYER_SOUND_IDS) {
        expect(prayerNotificationContent('isha', id).sound).toBe(soundFor(id));
      }
      expect(prayerNotificationContent('isha', 'makkah').sound).toBe('adhan_makkah.wav');
      expect(prayerNotificationContent('isha', 'system').sound).toBe('default');
      expect(prayerNotificationContent('isha', 'silent').sound).toBe(false);
    });

    it('uses the stored sound when none is passed', () => {
      storage.set(storageKeys.salah.prayerSound, 'madinah');

      expect(prayerNotificationContent('asr').sound).toBe('adhan_madinah.wav');
    });

    it('gives the Android trigger the channel of each sound, and iOS no channel', async () => {
      setBells('dhuhr');
      for (const id of PRAYER_SOUND_IDS) {
        storage.set(storageKeys.salah.prayerSound, id);
        pending = [];
        jest.clearAllMocks();

        const restore = jest.replaceProperty(Platform, 'OS', 'android');
        try {
          await syncPrayerNotifications({ now: NOW, coords: LONDON });
          expect(scheduledCalls()[0]?.[0].trigger).toMatchObject({ channelId: CHANNEL_FOR[id] });
        } finally {
          restore.restore();
        }

        const iosRestore = jest.replaceProperty(Platform, 'OS', 'ios');
        try {
          pending = [];
          jest.clearAllMocks();
          await syncPrayerNotifications({ now: NOW, coords: LONDON });
          expect(scheduledCalls()[0]?.[0].trigger).not.toHaveProperty('channelId');
        } finally {
          iosRestore.restore();
        }
      }
    });

    it('keeps the schedule count the same for every sound', async () => {
      setBells('fajr', 'dhuhr', 'asr', 'maghrib', 'isha');
      for (const id of PRAYER_SOUND_IDS) {
        storage.set(storageKeys.salah.prayerSound, id);
        await syncPrayerNotifications({ now: NOW, coords: LONDON });

        expect(prayerPending()).toHaveLength(40);
      }
    });

    it('re-plans when the sound changes, through the if-needed check', async () => {
      setBells('fajr');
      await syncPrayerNotifications({ now: NOW, coords: LONDON });
      await expect(resyncPrayerNotificationsIfNeeded(NOW)).resolves.toBe(false);

      storage.set(storageKeys.salah.prayerSound, 'makkah');
      jest.clearAllMocks();

      await expect(resyncPrayerNotificationsIfNeeded(NOW)).resolves.toBe(true);
      expect(prayerPending()).toHaveLength(8);
      expect(prayerPending().every((request) => request.content.sound === 'adhan_makkah.wav')).toBe(true);
    });

    it('setPrayerSound stores the choice and re-plans once, with no old sound or channel left pending', async () => {
      const restore = jest.replaceProperty(Platform, 'OS', 'android');
      try {
        setBells('fajr', 'isha');
        await syncPrayerNotifications({ now: NOW, coords: LONDON });
        jest.clearAllMocks();

        await setPrayerSound('makkah', NOW);

        expect(storage.getString(storageKeys.salah.prayerSound)).toBe('makkah');
        expect(scheduledCalls()).toHaveLength(16);
        expect(prayerPending()).toHaveLength(16);
        for (const request of prayerPending()) {
          expect(request.content.sound).toBe('adhan_makkah.wav');
          expect(request.trigger).toMatchObject({ channelId: 'prayer_adhan_makkah' });
        }

        jest.clearAllMocks();
        await setPrayerSound('silent', NOW);

        expect(prayerPending()).toHaveLength(16);
        for (const request of prayerPending()) {
          expect(request.content.sound).toBe(false);
          expect(request.trigger).toMatchObject({ channelId: 'prayer_silent' });
        }
      } finally {
        restore.restore();
      }
    });

    it('defaults to the takbir voice on a fresh install', () => {
      expect(DEFAULT_PRAYER_SOUND).toBe('allahu_akbar_short');
      expect(prayerNotificationContent('fajr').sound).toBe('allahu_akbar_short.wav');
    });
  });

  describe('budget fit', () => {
    it('keeps five prayers of 8 days within the prayer share, and the whole pool at the iOS limit', () => {
      expect(PRAYERS.length * 8).toBeLessThanOrEqual(PRAYER_NOTIFICATION_SLOTS);
      const pool = PRAYER_NOTIFICATION_SLOTS + AZKAR_SLOTS + DAILY_REMINDER_SLOTS + FRIDAY_REMINDER_SLOTS + MISBAHA_REMINDER_SLOTS;
      expect(pool).toBe(64);
      expect(pool).toBe(IOS_PENDING_LIMIT);
    });

    it('never schedules more than the prayer share, even with every bell on', async () => {
      setBells(...PRAYERS);
      await resyncPrayerNotifications(NOW);

      expect(prayerPending().length).toBeLessThanOrEqual(PRAYER_NOTIFICATION_SLOTS);
      expect(prayerPending()).toHaveLength(40);
    });

    it('never exceeds 40 with every bell on and iqamah offset 10', async () => {
      setBells(...PRAYERS);
      setIqamahOffsetMinutes(10);
      await resyncPrayerNotifications(NOW);

      expect(prayerPending().length).toBeLessThanOrEqual(PRAYER_NOTIFICATION_SLOTS);
      expect(prayerPending()).toHaveLength(40);
    });
  });
});
