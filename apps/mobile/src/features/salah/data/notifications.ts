import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/core/i18n';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { PRAYER_ROLLING_DAYS } from '@/features/notifications/budget';
import { ensurePrayerChannel, prayerChannelId, prunePrayerChannels } from '@/features/notifications/channels';
import { ensureReminderPermission } from '@/features/notifications/permission';
import {
  currentSyncState,
  readSyncState,
  writeSyncState,
  type SyncCoordinates,
} from '@/features/notifications/sync-state';

import { adhanVoiceFile, getPrayerSound, type PrayerSoundId, setPrayerSoundValue } from './adhan-sounds';
import { BELL_PRAYERS, getBellEnabled, setBellEnabled } from './bells';
import { getCoordinates, type CoordinatesOptions } from './location';
import { type NextPrayerName, type PrayerTimesOutput, timesFor } from './prayer-times';

/**
 * Local prayer-time notifications (ADR 0030 §3, phase-5 D4, amended by ADR 0047). Each enabled prayer gets a rolling
 * window of its next `PRAYER_ROLLING_DAYS` fire times, computed from the on-device engine (`timesFor`). The sound is
 * one setting for all prayers: a bundled adhan voice, the system sound, or silent. Nothing here touches the network or
 * an account.
 */

/** The route a prayer notification opens: the الصلاة screen (ADR 0030 §4). */
export const PRAYER_ROUTE = '/salah';

const PRAYER_NAME_KEYS = {
  fajr: 'home.salah.fajr',
  dhuhr: 'home.salah.dhuhr',
  asr: 'home.salah.asr',
  maghrib: 'home.salah.maghrib',
  isha: 'home.salah.isha',
} as const satisfies Record<NextPrayerName, string>;

export interface PrayerFire {
  prayer: NextPrayerName;
  date: Date;
}

export interface PrayerNotificationContent {
  title: string;
  body: string;
  data: { route: string };
  /** The bundled file name (with extension), `'default'` for the system sound, or `false` for silent (ADR 0047). */
  sound: string | false;
}

/**
 * The content `sound` of a prayer sound. Silent is `false`, not an absent key: on iOS (expo-notifications 58) an
 * absent `sound` plays the default sound.
 */
function contentSound(sound: PrayerSoundId): string | false {
  if (sound === 'silent') {
    return false;
  }
  if (sound === 'system') {
    return 'default';
  }
  return adhanVoiceFile(sound);
}

/**
 * The next `window` fire times of each prayer after `now`, in order per prayer. Days are walked from today through
 * `days` days ahead, so every enabled prayer always has `days` future times to offer. Times the engine cannot
 * produce (a non-finite date) are skipped. Without coordinates, or with no prayer, the list is empty.
 */
export function prayerFireDates(
  prayers: readonly NextPrayerName[],
  now: Date,
  coords: SyncCoordinates | null,
  days: number = PRAYER_ROLLING_DAYS,
): PrayerFire[] {
  if (coords === null || prayers.length === 0 || days <= 0) {
    return [];
  }

  const dayTimes: PrayerTimesOutput[] = [];
  for (let index = 0; index <= days; index += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() + index);
    dayTimes.push(timesFor(day, coords));
  }

  const nowMs = now.getTime();
  const fires: PrayerFire[] = [];
  for (const prayer of prayers) {
    const upcoming = dayTimes
      .map((times) => times[prayer].getTime())
      .filter((ms) => Number.isFinite(ms) && ms > nowMs)
      .sort((a, b) => a - b)
      .slice(0, days);
    for (const ms of upcoming) {
      fires.push({ prayer, date: new Date(ms) });
    }
  }
  return fires;
}

/** Title «حان وقت صلاة الفجر» and a neutral body; the route opens الصلاة on tap. */
export function prayerNotificationContent(
  prayer: NextPrayerName,
  sound: PrayerSoundId = getPrayerSound(),
): PrayerNotificationContent {
  return {
    title: i18n.t('notifications.prayer.title', { name: i18n.t(PRAYER_NAME_KEYS[prayer]) }),
    body: i18n.t('notifications.prayer.body'),
    data: { route: PRAYER_ROUTE },
    sound: contentSound(sound),
  };
}

// Android delivers through the channel of the chosen sound (the channel fixes the sound); iOS has no channels and ignores the field.
function prayerTrigger(date: Date, sound: PrayerSoundId): Notifications.NotificationTriggerInput {
  return Platform.OS === 'android'
    ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: prayerChannelId(sound) }
    : { type: Notifications.SchedulableTriggerInputTypes.DATE, date };
}

/** The prayers whose bell is on, in the order the times card lists them. */
export function enabledPrayers(): NextPrayerName[] {
  return BELL_PRAYERS.filter((prayer) => getBellEnabled(prayer));
}

/**
 * Cancels every pending prayer notification, found by its route. The pending list is the source of truth, so an id
 * that was lost (or an orphan from a changed setting) is cancelled too and a re-plan never doubles a notification.
 */
async function cancelPrayerNotifications(): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  for (const request of pending) {
    if (request.content.data?.route === PRAYER_ROUTE) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
  }
}

/**
 * The settings a schedule depends on besides the day, the time zone and the coordinates: the bells that are on and the
 * location choice (automatic, or the manual city's stored key). A change to any of them re-plans at once.
 */
function scheduleSettings(): string {
  return JSON.stringify({
    prayers: enabledPrayers(),
    sound: getPrayerSound(),
    source: storage.getString(storageKeys.salah.locationSource) ?? null,
    manualCityId: storage.getString(storageKeys.salah.manualCityId) ?? null,
    manualLat: storage.getNumber(storageKeys.salah.manualLat) ?? null,
    manualLng: storage.getNumber(storageKeys.salah.manualLng) ?? null,
  });
}

// Kept beside the sync state, under a key derived from it (the shared sync-state record has no room for it).
const settingsKey = `${storageKeys.salah.notificationsSync}.settings`;

/**
 * Cancels every prayer notification, then schedules the rolling window for the enabled prayers (idempotent: running
 * it twice gives the same pending set). Records the state and the settings it was computed for, so the foreground check
 * can skip it while nothing moved. A failure part-way clears that record, so the next check plans again.
 */
export async function syncPrayerNotifications({ now, coords }: { now: Date; coords: SyncCoordinates | null }): Promise<void> {
  const fires = prayerFireDates(enabledPrayers(), now, coords);
  const sound = getPrayerSound();
  try {
    await cancelPrayerNotifications();
    await prunePrayerChannels();
    if (fires.length > 0) {
      await ensurePrayerChannel(sound);
    }
    for (const fire of fires) {
      await Notifications.scheduleNotificationAsync({
        content: prayerNotificationContent(fire.prayer, sound),
        trigger: prayerTrigger(fire.date, sound),
      });
    }
  } catch (error) {
    storage.remove(storageKeys.salah.notificationsSync);
    storage.remove(settingsKey);
    throw error;
  }
  writeSyncState(storageKeys.salah.notificationsSync, currentSyncState(now, coords));
  storage.set(settingsKey, scheduleSettings());
}

// Two syncs never interleave: a launch, a foreground check and a location change can all start at once, and each
// cancel-then-schedule must finish before the next one reads the pending list.
let queue: Promise<unknown> = Promise.resolve();

function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.catch(() => undefined);
  return run;
}

/** The coordinates a sync needs: read only when a prayer is on, so a GPS fix is never requested for nothing. */
async function coordinatesForSync(options: CoordinatesOptions = {}): Promise<SyncCoordinates | null> {
  return enabledPrayers().length > 0 ? getCoordinates(options) : null;
}

/**
 * Re-plans now: app launch, a bell toggle, a location change. Errors are logged, never thrown into the UI, so a
 * notification sync cannot break a tap.
 */
export function resyncPrayerNotifications(now: Date = new Date()): Promise<void> {
  return serialized(async () => {
    try {
      await syncPrayerNotifications({ now, coords: await coordinatesForSync() });
    } catch (error) {
      console.error(error);
    }
  });
}

/**
 * Re-plans only when the local day, the time zone or the settings (bells, location choice) moved since the last sync, or
 * nothing was synced yet. Resolves to whether a sync ran. With no prayer on and nothing synced, it does nothing.
 *
 * The cheap checks come first and the location is read only when one of them has moved: a foreground check with nothing
 * changed reads nothing. A changed day or time zone takes the last known position (no GPS fix on the foreground); a
 * changed setting (a bell, or the city) takes the normal read. Coordinates that move on their own are picked up on the
 * next day or launch, not on each foreground.
 */
export function resyncPrayerNotificationsIfNeeded(now: Date = new Date()): Promise<boolean> {
  return serialized(async () => {
    try {
      const previous = readSyncState(storageKeys.salah.notificationsSync);
      if (previous === null && enabledPrayers().length === 0) {
        return false;
      }
      const settingsMoved = storage.getString(settingsKey) !== scheduleSettings();
      const current = currentSyncState(now, null);
      const dayOrZoneMoved =
        previous === null || previous.day !== current.day || previous.timeZone !== current.timeZone;
      if (!settingsMoved && !dayOrZoneMoved) {
        return false;
      }
      const coords = await coordinatesForSync({ lastKnownOnly: !settingsMoved });
      await syncPrayerNotifications({ now, coords });
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  });
}

/**
 * Chooses the prayer sound (ADR 0047). No permission prompt: the sound is set on the schedule, not requested. The
 * setting is written first, then the schedule is re-planned once, so no pending item keeps the old sound or channel.
 */
export async function setPrayerSound(id: PrayerSoundId, now: Date = new Date()): Promise<void> {
  setPrayerSoundValue(id);
  await resyncPrayerNotifications(now);
}

/**
 * Turns one prayer's bell on or off. Turning on asks for permission first (Arabic rationale is the system prompt); a
 * refusal changes nothing and resolves to false. Every applied change re-plans the schedule once.
 */
export async function setPrayerBell(prayer: NextPrayerName, on: boolean, now: Date = new Date()): Promise<boolean> {
  if (on) {
    const granted = await ensureReminderPermission().catch(() => false);
    if (!granted) {
      return false;
    }
  }
  setBellEnabled(prayer, on);
  await resyncPrayerNotifications(now);
  return true;
}
