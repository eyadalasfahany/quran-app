import * as Notifications from 'expo-notifications';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { openUserDb } from '@/core/db/user/open';
import { resolvePrayerCoordinates } from '@/features/salah/data/prayer-coordinates';

import { liveReminderQuery } from './live-queries';
import { type AzkarReminder, type AzkarReminderRow, type ReminderTargetType, rowToReminder } from './reminders-repository';

/** The saved reminder for one target, re-read whenever `user.db` changes. Null when none is saved yet. */
export function useAzkarReminder(targetType: ReminderTargetType, targetKey: string): AzkarReminder | null {
  const { db } = openUserDb();
  const { data } = useLiveQuery(liveReminderQuery(db, targetType, targetKey), [targetType, targetKey]);
  return useMemo(() => {
    const row = data[0];
    return row === undefined ? null : rowToReminder(row as AzkarReminderRow);
  }, [data]);
}

/**
 * Whether a location is known for a prayer-relative reminder: a manual city or a fix. Null while it is being read. It
 * is read only when `active` (the reminder is a prayer-relative one that is on), so a clock reminder never asks for a
 * fix. The check runs on mount; a location set on the Salah screen is picked up on the next foreground sync.
 */
export function useHasReminderLocation(active: boolean): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    if (!active) {
      return undefined;
    }
    let mounted = true;
    resolvePrayerCoordinates()
      .then(({ coords }) => {
        if (mounted) {
          setAvailable(coords !== null);
        }
      })
      .catch(() => {
        if (mounted) {
          setAvailable(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [active]);
  return available;
}

/** Whether the system allows notifications, read on mount. Null while it is being read. */
export function useNotificationsGranted(): { granted: boolean | null; refresh: () => void } {
  const [granted, setGranted] = useState<boolean | null>(null);
  const refresh = useCallback(() => {
    void Notifications.getPermissionsAsync().then((result) => setGranted(result.granted));
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { granted, refresh };
}
