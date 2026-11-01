import { useTranslation } from 'react-i18next';

import { UiText } from '@/shared/ui';

/**
 * The line that stays visible on the reminder sheet (ADR 0031 §7): a reminder time is the user's choice, never the
 * religious time of the dhikr.
 */
export function ReminderDisclaimer({ testID = 'azkar-reminder-disclaimer' }: { testID?: string }) {
  const { t } = useTranslation();

  return (
    <UiText accessibilityRole="text" testID={testID} tone="muted" variant="caption">
      {t('azkar.reminders.disclaimer')}
    </UiText>
  );
}
