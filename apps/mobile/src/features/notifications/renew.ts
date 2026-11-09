import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/core/i18n';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { azkarHref } from '@/features/azkar/routes';

import { ensureNotificationChannel, NOTIFICATION_CHANNELS } from './channels';

/**
 * The renew reminder (ADR 0083). Each schedule (prayer, Azkar) is a fixed window; when the app is not opened, the window
 * runs out and nothing else arrives. One notification, a day before the earliest of those windows runs out, asks the
 * user to open Taybah, which re-plans every schedule.
 */

export type RenewSource = 'prayer' | 'azkar';

/** The salah route (`PRAYER_ROUTE` in `features/salah/data/notifications`). Defined here because that module imports this one. */
const PRAYER_ROUTE = '/salah';

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const COPY_KEYS = {
  prayer: { title: 'notifications.renew.prayer.title', body: 'notifications.renew.prayer.body' },
  azkar: { title: 'notifications.renew.azkar.title', body: 'notifications.renew.azkar.body' },
} as const satisfies Record<RenewSource, { title: string; body: string }>;

type RenewState = Record<RenewSource, number | null>;

function readState(): RenewState {
  const raw = storage.getString(storageKeys.notifications.renew);
  try {
    const parsed = raw === undefined ? null : (JSON.parse(raw) as Partial<RenewState> | null);
    return { prayer: parsed?.prayer ?? null, azkar: parsed?.azkar ?? null };
  } catch {
    return { prayer: null, azkar: null };
  }
}

/** The source whose schedule runs out first, with its last fire in ms; null when neither has one still ahead of `nowMs`. */
function earliestSource(state: RenewState, nowMs: number): { source: RenewSource; ms: number } | null {
  let earliest: { source: RenewSource; ms: number } | null = null;
  for (const source of ['prayer', 'azkar'] as const) {
    const ms = state[source];
    // A past entry is skipped so it cannot hide a later schedule that still runs.
    if (ms !== null && ms > nowMs && (earliest === null || ms < earliest.ms)) {
      earliest = { source, ms };
    }
  }
  return earliest;
}

async function cancelRenewReminders(): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  for (const request of pending) {
    if (request.content.data?.kind === 'renew') {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
  }
}

/**
 * Records when `source`'s schedule runs out (its last scheduled fire, or null when it schedules nothing that expires),
 * then re-plans the single renew notification. Never throws (logs).
 */
export async function updateRenewReminder(source: RenewSource, lastFire: Date | null, now: Date): Promise<void> {
  try {
    const state = readState();
    state[source] = lastFire === null ? null : lastFire.getTime();
    storage.set(storageKeys.notifications.renew, JSON.stringify(state));

    await cancelRenewReminders();
    const earliest = earliestSource(state, now.getTime());
    if (earliest === null) {
      return;
    }
    const dayBefore = earliest.ms - DAY_MS;
    // A short window: nudge the renew just after it runs out, rather than never.
    const renewAt = dayBefore > now.getTime() ? dayBefore : earliest.ms + MINUTE_MS;
    if (renewAt <= now.getTime()) {
      return;
    }

    const copy = COPY_KEYS[earliest.source];
    const route = earliest.source === 'prayer' ? PRAYER_ROUTE : String(azkarHref.home);
    const date = new Date(renewAt);
    if (Platform.OS === 'android') {
      await ensureNotificationChannel(NOTIFICATION_CHANNELS.reminders);
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t(copy.title),
        body: i18n.t(copy.body),
        data: { route, kind: 'renew' },
      },
      trigger:
        Platform.OS === 'android'
          ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: NOTIFICATION_CHANNELS.reminders }
          : { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  } catch (error) {
    console.error(error);
  }
}
