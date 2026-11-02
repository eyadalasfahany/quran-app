import { resyncAzkarReminders } from '@/features/azkar/reminders/resync';
import {
  type AzkarReminderInput,
  getReminder,
  saveReminder,
} from '@/features/azkar/reminders/reminders-repository';
import { canScheduleAzkarReminder } from '@/features/azkar/reminders/budget-plan';
import { ensureReminderPermission } from '@/features/notifications/permission';

/**
 * Turns one Azkar session's reminder on or off from the hub (ADR 0031 §7). It applies the same rules as the reminder sheet:
 * a turn-on that the pending pool cannot hold is refused with nothing written, and a turn-on needs notification permission.
 * A session that is turned on starts with no time chosen, as in the sheet: no time is ever suggested.
 */
export type SessionToggleResult = 'saved' | 'limit' | 'denied';

export async function setAzkarSessionReminder(categoryId: string, on: boolean, now: Date = new Date()): Promise<SessionToggleResult> {
  const current = getReminder('category', categoryId);
  const input: AzkarReminderInput = {
    targetType: 'category',
    targetKey: categoryId,
    enabled: on,
    triggerType: current?.triggerType ?? 'clock',
    clockTime: current?.clockTime ?? null,
    prayer: current?.prayer ?? null,
    offsetMinutes: current?.offsetMinutes ?? null,
  };

  if (!on) {
    saveReminder(input);
    await resyncAzkarReminders(now);
    return 'saved';
  }
  if (!canScheduleAzkarReminder(input)) {
    return 'limit';
  }
  const granted = await ensureReminderPermission().catch(() => false);
  if (!granted) {
    return 'denied';
  }
  saveReminder(input);
  await resyncAzkarReminders(now);
  return 'saved';
}
