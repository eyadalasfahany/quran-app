import { formatTime } from '@/core/i18n';
import type { Locale } from '@/core/i18n/locale';
import { clockTrigger } from '@/features/azkar/reminders/schedule';
import type { AzkarReminder } from '@/features/azkar/reminders/reminders-repository';

/**
 * The reminder's clock time, formatted for the locale, or null when there is nothing to show: no reminder, the reminder is
 * off, or it is a prayer-relative reminder (which has no clock time to show).
 */
export function reminderClockLabel(reminder: AzkarReminder | null, locale: Locale): string | null {
  if (reminder === null || !reminder.enabled || reminder.triggerType !== 'clock') {
    return null;
  }
  const trigger = clockTrigger(reminder.clockTime);
  if (trigger === null) {
    return null;
  }
  const date = new Date();
  date.setHours(trigger.hour, trigger.minute, 0, 0);
  return formatTime(date, locale);
}
