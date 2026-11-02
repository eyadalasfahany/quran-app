import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { openUserDb } from '@/core/db/user/open';
import { azkarReminders } from '@/core/db/user/schema';
import {
  type AzkarReminder,
  type AzkarReminderRow,
  rowToReminder,
} from '@/features/azkar/reminders/reminders-repository';

/**
 * Every saved Azkar reminder, re-read whenever `user.db` changes, so the hub's rows follow an edit made in a sheet. The
 * aliases match the repository's SELECT, so `rowToReminder` maps the rows.
 */
export function useAzkarReminderRows(): AzkarReminder[] {
  const { db } = openUserDb();
  const { data } = useLiveQuery(
    db
      .select({
        id: azkarReminders.id,
        targetType: azkarReminders.targetType,
        targetKey: azkarReminders.targetKey,
        enabled: azkarReminders.enabled,
        triggerType: azkarReminders.triggerType,
        clockTime: azkarReminders.clockTime,
        prayer: azkarReminders.prayer,
        offsetMinutes: azkarReminders.offsetMinutes,
        notificationIds: azkarReminders.notificationIds,
        updatedAt: azkarReminders.updatedAt,
      })
      .from(azkarReminders),
  );
  return useMemo(() => data.map((row) => rowToReminder(row as AzkarReminderRow)), [data]);
}
