import { useTranslation } from 'react-i18next';

import { UiText } from '@/shared/ui';

/** The line under the hub's title: everything is kept on this device and nothing is sent until a reminder is on. */
export function RemindersIntro({ testID = 'reminders-intro' }: { testID?: string }) {
  const { t } = useTranslation();
  return (
    <UiText testID={testID} tone="muted" variant="caption">
      {t('reminders.intro')}
    </UiText>
  );
}
