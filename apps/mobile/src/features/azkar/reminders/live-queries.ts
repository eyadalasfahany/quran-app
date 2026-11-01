import { and, eq } from 'drizzle-orm';

import type { UserDatabase } from '@/core/db/user/open';
import { azkarReminders } from '@/core/db/user/schema';

import type { ReminderTargetType } from './reminders-repository';

/** The reminder for one target, live. Selected with the same aliases as the repository, so `rowToReminder` maps both. */
export function liveReminderQuery(db: UserDatabase, targetType: ReminderTargetType, targetKey: string) {
  return db
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
    .from(azkarReminders)
    .where(and(eq(azkarReminders.targetType, targetType), eq(azkarReminders.targetKey, targetKey)))
    .limit(1);
}
