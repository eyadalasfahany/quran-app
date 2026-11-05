import { useTranslation } from 'react-i18next';

import { useLocale } from '@/core/i18n';
import { useAzkarReminder } from '@/features/azkar/reminders/hooks';

import { reminderClockLabel } from './reminder-time';

/**
 * The one-line caption of a «أدعيتي» entry: its title (when it has one), «من كتابتك», and the reminder time when a clock
 * reminder is on. Joined with a middle dot. Shared by the list row and the reading view, so both read the same.
 */
export function useMyDuaCaption(duaId: string, title: string | null): string {
  const { t } = useTranslation();
  const locale = useLocale();
  const reminder = useAzkarReminder('my_dua', duaId);
  const reminderTime = reminderClockLabel(reminder, locale);
  const trimmed = title?.trim() ?? '';

  return [
    trimmed.length > 0 ? trimmed : null,
    t('duas.mine.writtenByYou'),
    reminderTime === null ? null : t('duas.mine.reminderAt', { time: reminderTime }),
  ]
    .filter((part): part is string => part !== null)
    .join(' · ');
}
