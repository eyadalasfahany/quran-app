import { i18n, formatNumber, formatTime, type Locale } from '@/core/i18n';
import { clockTrigger } from '@/features/azkar/reminders/schedule';
import type { AzkarReminder } from '@/features/azkar/reminders/reminders-repository';

/**
 * The detail line of an Azkar session in the hub: its clock time, or the prayer and the offset («الفجر · بعد ١٠ دقائق»). It is
 * the user's reminder time, never the time of the dhikr (ADR 0031 §7). Undefined when there is nothing chosen to show.
 */
export function azkarDetail(reminder: AzkarReminder | null, locale: Locale): string | undefined {
  // A fixed translator for this locale, so the words and the digits always come from the same language.
  const t = i18n.getFixedT(locale);
  if (reminder === null || !reminder.enabled) {
    return undefined;
  }
  if (reminder.triggerType === 'clock') {
    const trigger = clockTrigger(reminder.clockTime);
    if (trigger === null) {
      return undefined;
    }
    const at = new Date();
    at.setHours(trigger.hour, trigger.minute, 0, 0);
    return formatTime(at, locale);
  }
  if (reminder.prayer === null || reminder.offsetMinutes === null) {
    return undefined;
  }
  const prayer = t(`home.salah.${reminder.prayer}` as never) as string;
  const offset =
    reminder.offsetMinutes === 0
      ? (t('azkar.reminders.offsetAt') as string)
      : (t('azkar.reminders.offsetAfter', {
          count: reminder.offsetMinutes,
          number: formatNumber(reminder.offsetMinutes, locale),
        }) as string);
  return `${prayer} · ${offset}`;
}

