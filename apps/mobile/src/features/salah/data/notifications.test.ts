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
  PRAYER_ROLLING_DAYS_WITH_IQAMAH,
  prayerRollingDays,
  RENEW_REMINDER_SLOTS,
} from '@/features/notifications/budget';
import { writeSyncState, currentSyncState } from '@/features/notifications/sync-state';

import { ADHAN_VOICES, DEFAULT_PRAYER_SOUND, PRAYER_SOUND_IDS, type PrayerSoundId } from './adhan-sounds';
import {
  getCoordinates,
  getLocationPermissionStatus,
  requestLocationPermissions,
  setManualLocation,
} from './location';
import { dismissExactAlarmPrompt, isExactAlarmPromptVisible } from './exact-alarm-prompt';

import { setIqamahOffsetMinutes } from './iqamah-offset';
import {
  armDefaultPrayerBells,
  PRAYER_ROUTE,
  enabledPrayers,
  requestLocationAndArmBells,
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
  getLocationPermissionStatus: jest.fn(() => Promise.resolve('granted')),
  requestLocationPermissions: jest.fn(() => Promise.resolve('granted')),
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

/** Prayer notifications: the route is shared with the renew reminder (ADR 0083), which is counted separately. */
function prayerPending(): Pending[] {
  return pending.filter((request) => request.content.data?.route === '/salah' && request.content.data?.kind !== 'renew');
}

function adhanPending(): Pending[] {
  return prayerPending().filter((request) => request.content.data?.kind !== 'iqamah');
}

function iqamahPending(): Pending[] {
  return prayerPending().filter((request) => request.content.data?.kind === 'iqamah');
}

function scheduledCalls() {
  return jest.mocked(Notifications.scheduleNotificationAsync).mock.calls.filter(
    ([request]) => (request.content.data as Record<string, unknown> | undefined)?.kind !== 'renew',
  );
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

        // The renew reminder also creates the `reminders` channel on Android (ADR 0083); only the prayer channels count here.
        const prayerChannels = jest.mocked(Notifications.setNotificationChannelAsync).mock.calls.filter(([id]) => id !== 'reminders');
        expect(prayerChannels).toHaveLength(1);
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

    it('re-plans a renew reminder a day before the last prayer fire, and none when no bell is on (ADR 0083)', async () => {
      setBells('fajr');
      await syncPrayerNotifications({ now: NOW, coords: LONDON });

      const renews = pending.filter((request) => request.content.data?.kind === 'renew');
      const lastFire = Math.max(...prayerPending().map((request) => (request.trigger as { date: Date }).date.getTime()));
      expect(renews).toHaveLength(1);
      expect(renews[0]?.content.data).toEqual({ route: PRAYER_ROUTE, kind: 'renew' });
      expect(renews[0]?.trigger).toEqual({ type: 'date', date: new Date(lastFire - 24 * 60 * 60 * 1000) });

      setBells();
      await syncPrayerNotifications({ now: NOW, coords: LONDON });

      expect(pending.filter((request) => request.content.data?.kind === 'renew')).toHaveLength(0);
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

    it('paused: with iqamah offset 10 stored, schedules adhan only (8 per prayer on iOS), no iqamah', async () => {
      setBells(...PRAYERS);
      setIqamahOffsetMinutes(10);
      await syncPrayerNotifications({ now: NOW, coords: LONDON });

      expect(prayerPending()).toHaveLength(40);
      expect(adhanPending()).toHaveLength(40);
      expect(iqamahPending()).toHaveLength(0);
      expect(pending.filter((request) => request.content.data?.kind === 'iqamah')).toHaveLength(0);
      for (const request of adhanPending()) {
        expect(request.content.data?.kind).toBeUndefined();
      }
    });

    it('paused: with iqamah offset 10 stored on Android, schedules adhan only (14 per prayer), no iqamah', async () => {
      const restore = jest.replaceProperty(Platform, 'OS', 'android');
      try {
        setBells(...PRAYERS);
        setIqamahOffsetMinutes(10);
        await syncPrayerNotifications({ now: NOW, coords: LONDON });

        expect(adhanPending()).toHaveLength(70);
        expect(pending.filter((request) => request.content.data?.kind === 'iqamah')).toHaveLength(0);
      } finally {
        restore.restore();
      }
    });

    it('paused: the adhan keeps its alarmClock delivery on Android and no iqamah channel is needed', async () => {
      const restore = jest.replaceProperty(Platform, 'OS', 'android');
      try {
        setBells('dhuhr');
        setIqamahOffsetMinutes(10);
        await syncPrayerNotifications({ now: NOW, coords: LONDON });

        expect(iqamahPending()).toHaveLength(0);
        const adhanTrigger = scheduledCalls().find(([request]) => request.content.data?.kind !== 'iqamah')?.[0].trigger;
        expect(adhanTrigger).toMatchObject({
          channelId: 'prayer_adhan_allahu_akbar_short',
          delivery: 'alarmClock',
        });
      } finally {
        restore.restore();
      }
    });

    it('paused: on iOS no notification carries a delivery key, and no iqamah is scheduled', async () => {
      const restore = jest.replaceProperty(Platform, 'OS', 'ios');
      try {
        setBells('dhuhr');
        setIqamahOffsetMinutes(10);
        await syncPrayerNotifications({ now: NOW, coords: LONDON });

        expect(adhanPending().length).toBeGreaterThan(0);
        expect(iqamahPending()).toHaveLength(0);
        for (const [request] of scheduledCalls()) {
          expect(request.trigger).not.toHaveProperty('delivery');
        }
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
    it('persists the offset and re-plans once (paused: adhan only, no iqamah)', async () => {
      setBells('fajr');
      await setIqamahOffset(15, NOW);

      expect(storage.getNumber(storageKeys.salah.iqamahOffsetMinutes)).toBe(15);
      expect(prayerPending()).toHaveLength(8);
      expect(iqamahPending()).toHaveLength(0);
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

    it('a stored iqamah offset does not re-plan on the foreground check while iqamah is paused', async () => {
      await resyncPrayerNotifications(NOW);
      jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
      setIqamahOffsetMinutes(10);

      await expect(resyncPrayerNotificationsIfNeeded(NOW)).resolves.toBe(false);
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(iqamahPending()).toHaveLength(0);
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

    it('a new day with no fix keeps the schedule for the place of the last sync, not an empty schedule', async () => {
      await resyncPrayerNotifications(NOW);
      jest.mocked(getCoordinates).mockResolvedValue(null);
      const day = local(2026, 11, 1, 8);

      await expect(resyncPrayerNotificationsIfNeeded(day)).resolves.toBe(true);

      const expected = prayerFireDates(['fajr', 'maghrib'], day, LONDON).map((fire) => fire.date.getTime()).sort();
      const scheduled = prayerPending()
        .map((request) => (request.trigger as { date: Date }).date.getTime())
        .sort();
      expect(scheduled.length).toBeGreaterThan(0);
      expect(scheduled).toEqual(expected);
    });

    it('with no fix and nothing synced before, schedules from the saved last automatic place (ADR 0086)', async () => {
      storage.set(storageKeys.salah.lastAutoCoords, '51.51,-0.13');
      jest.mocked(getCoordinates).mockResolvedValue(null);

      await resyncPrayerNotifications(NOW);

      const expected = prayerFireDates(['fajr', 'maghrib'], NOW, { lat: 51.51, lng: -0.13 }).map((fire) => fire.date.getTime()).sort();
      const scheduled = prayerPending()
        .map((request) => (request.trigger as { date: Date }).date.getTime())
        .sort();
      expect(scheduled.length).toBeGreaterThan(0);
      expect(scheduled).toEqual(expected);
    });

    it('with no fix and nothing synced before, schedules nothing', async () => {
      jest.mocked(getCoordinates).mockResolvedValue(null);

      await resyncPrayerNotifications(NOW);

      expect(scheduledCalls()).toHaveLength(0);
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

  describe('armDefaultPrayerBells (ADR 0064)', () => {
    /** The stored bell value: undefined when unset, so a test can tell "never set" from "set to false". */
    function storedBell(name: NextPrayerName): boolean | undefined {
      return storage.getBoolean(bellKey(name));
    }

    /** Lets the fire-and-forget arming run finish, for the call that is not awaited. */
    async function settleArming(): Promise<void> {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    beforeEach(() => {
      jest.mocked(getLocationPermissionStatus).mockResolvedValue('granted' as never);
      jest.mocked(requestLocationPermissions).mockResolvedValue('granted' as never);
    });

    it('does nothing while location is not granted: bells stay unset, no notification permission call, nothing scheduled', async () => {
      jest.mocked(getLocationPermissionStatus).mockResolvedValueOnce('denied' as never);

      await armDefaultPrayerBells(NOW);

      for (const prayer of PRAYERS) {
        expect(storedBell(prayer)).toBeUndefined();
      }
      expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
      expect(scheduledCalls()).toHaveLength(0);
    });

    it('with location and notifications granted, turns on all five bells and schedules the prayers', async () => {
      await armDefaultPrayerBells(NOW);

      for (const prayer of PRAYERS) {
        expect(storedBell(prayer)).toBe(true);
      }
      expect(enabledPrayers()).toEqual(PRAYERS);
      expect(prayerPending()).toHaveLength(40);
    });

    it('keeps an explicit off on fajr and turns on the other four', async () => {
      storage.set(storageKeys.salah.bellFajr, false);

      await armDefaultPrayerBells(NOW);

      expect(storedBell('fajr')).toBe(false);
      for (const prayer of PRAYERS.filter((name) => name !== 'fajr')) {
        expect(storedBell(prayer)).toBe(true);
      }
      expect(prayerPending()).toHaveLength(32);
    });

    it('when notification permission is refused, stores the untouched bells as off, schedules nothing, and never prompts again', async () => {
      jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
      jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);

      await armDefaultPrayerBells(NOW);

      for (const prayer of PRAYERS) {
        expect(storedBell(prayer)).toBe(false);
      }
      expect(scheduledCalls()).toHaveLength(0);

      await armDefaultPrayerBells(NOW);

      expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('when every bell is already set, reads no location and asks for no permission', async () => {
      setBells(...PRAYERS);

      await armDefaultPrayerBells(NOW);

      expect(getLocationPermissionStatus).not.toHaveBeenCalled();
      expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('when the permission call throws, leaves the bells unset and resolves', async () => {
      jest.mocked(Notifications.getPermissionsAsync).mockRejectedValueOnce(new Error('os refused'));

      await expect(armDefaultPrayerBells(NOW)).resolves.toBeUndefined();

      for (const prayer of PRAYERS) {
        expect(storedBell(prayer)).toBeUndefined();
      }
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('two concurrent calls share one run, so the system prompt is requested once', async () => {
      jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
      jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({ granted: true } as never);

      const first = armDefaultPrayerBells(NOW);
      const second = armDefaultPrayerBells(NOW);
      await Promise.all([first, second]);

      expect(second).toBe(first);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(enabledPrayers()).toEqual(PRAYERS);
    });

    it('requestLocationAndArmBells returns the location status and arms the bells', async () => {
      jest.mocked(requestLocationPermissions).mockResolvedValueOnce('granted' as never);

      await expect(requestLocationAndArmBells()).resolves.toBe('granted');
      await settleArming();

      expect(requestLocationPermissions).toHaveBeenCalledTimes(1);
      expect(enabledPrayers()).toEqual(PRAYERS);
    });

    it('requestLocationAndArmBells returns a refusal and leaves the bells unset', async () => {
      jest.mocked(requestLocationPermissions).mockResolvedValueOnce('denied' as never);
      jest.mocked(getLocationPermissionStatus).mockResolvedValueOnce('denied' as never);

      await expect(requestLocationAndArmBells()).resolves.toBe('denied');
      await settleArming();

      for (const prayer of PRAYERS) {
        expect(storedBell(prayer)).toBeUndefined();
      }
    });
  });

  describe('armDefaultPrayerBells: a chosen city and the exact-alarm prompt (ADR 0064)', () => {
    const RIYADH = { lat: 24.7136, lng: 46.6753 };

    let platform: typeof Platform.OS;

    beforeEach(() => {
      platform = Platform.OS;
      jest.mocked(getLocationPermissionStatus).mockResolvedValue('denied' as never);
      dismissExactAlarmPrompt();
    });

    afterEach(() => {
      jest.replaceProperty(Platform, 'OS', platform);
      jest.mocked(Notifications.getExactAlarmPermissionsAsync).mockResolvedValue({ granted: true } as never);
      dismissExactAlarmPrompt();
    });

    it('a chosen city arms all five bells even with location denied, and schedules them', async () => {
      setManualLocation({ id: 'riyadh', lat: RIYADH.lat, lng: RIYADH.lng });

      await armDefaultPrayerBells(NOW);

      for (const prayer of PRAYERS) {
        expect(storage.getBoolean(bellKey(prayer))).toBe(true);
      }
      expect(prayerPending()).toHaveLength(40);
    });

    it('a manual source with no stored coordinates and location denied arms nothing', async () => {
      storage.set(storageKeys.salah.locationSource, 'manual');

      await armDefaultPrayerBells(NOW);

      for (const prayer of PRAYERS) {
        expect(storage.getBoolean(bellKey(prayer))).toBeUndefined();
      }
      expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
      expect(scheduledCalls()).toHaveLength(0);
    });

    it('on Android with exact alarms denied, shows the exact-alarm prompt once the bells are armed', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      jest.mocked(getLocationPermissionStatus).mockResolvedValue('granted' as never);
      jest.mocked(Notifications.getExactAlarmPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);

      await armDefaultPrayerBells(NOW);

      expect(isExactAlarmPromptVisible()).toBe(true);
    });

    it('on Android with exact alarms granted, does not show the prompt', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      jest.mocked(getLocationPermissionStatus).mockResolvedValue('granted' as never);
      jest.mocked(Notifications.getExactAlarmPermissionsAsync).mockResolvedValueOnce({ granted: true } as never);

      await armDefaultPrayerBells(NOW);

      expect(isExactAlarmPromptVisible()).toBe(false);
    });

    it('on iOS, does not check exact alarms and does not show the prompt', async () => {
      jest.replaceProperty(Platform, 'OS', 'ios');
      jest.mocked(getLocationPermissionStatus).mockResolvedValue('granted' as never);

      await armDefaultPrayerBells(NOW);

      expect(Notifications.getExactAlarmPermissionsAsync).not.toHaveBeenCalled();
      expect(isExactAlarmPromptVisible()).toBe(false);
    });

    it('when notifications are refused, does not show the prompt', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      jest.mocked(getLocationPermissionStatus).mockResolvedValue('granted' as never);
      jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
      jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);

      await armDefaultPrayerBells(NOW);

      expect(isExactAlarmPromptVisible()).toBe(false);
      expect(Notifications.getExactAlarmPermissionsAsync).not.toHaveBeenCalled();
    });

    it('when every bell is already set, does not show the prompt', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      jest.mocked(getLocationPermissionStatus).mockResolvedValue('granted' as never);
      setBells(...PRAYERS);

      await armDefaultPrayerBells(NOW);

      expect(isExactAlarmPromptVisible()).toBe(false);
    });

    it('a second arm call after the prompt was dismissed does not show it again', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      jest.mocked(getLocationPermissionStatus).mockResolvedValue('granted' as never);
      jest.mocked(Notifications.getExactAlarmPermissionsAsync).mockResolvedValue({ granted: false } as never);

      await armDefaultPrayerBells(NOW);
      expect(isExactAlarmPromptVisible()).toBe(true);
      dismissExactAlarmPrompt();

      await armDefaultPrayerBells(NOW);

      expect(isExactAlarmPromptVisible()).toBe(false);
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

        // Two prayers on Android: 14 days each (ADR 0083).
        expect(storage.getString(storageKeys.salah.prayerSound)).toBe('makkah');
        expect(scheduledCalls()).toHaveLength(28);
        expect(prayerPending()).toHaveLength(28);
        for (const request of prayerPending()) {
          expect(request.content.sound).toBe('adhan_makkah.wav');
          expect(request.trigger).toMatchObject({ channelId: 'prayer_adhan_makkah' });
        }

        jest.clearAllMocks();
        await setPrayerSound('silent', NOW);

        expect(prayerPending()).toHaveLength(28);
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
      const pool =
        PRAYER_NOTIFICATION_SLOTS +
        AZKAR_SLOTS +
        DAILY_REMINDER_SLOTS +
        FRIDAY_REMINDER_SLOTS +
        MISBAHA_REMINDER_SLOTS +
        RENEW_REMINDER_SLOTS;
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
