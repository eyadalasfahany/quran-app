import { useTranslation } from 'react-i18next';

import { ListRow, UiText } from '@/shared/ui';

import { SettingsGroup } from './SettingsGroup';
import { DailyReminderRow } from './DailyReminderRow';

export function HabitsSection({
  khatmaValue,
  onPressKhatma,
  testID = 'habits-section',
}: {
  khatmaValue?: string;
  onPressKhatma?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <SettingsGroup testID={testID} title={t('settings.sections.reminders')}>
      <DailyReminderRow />
      <ListRow
        chevron
        onPress={onPressKhatma}
        testID="habits-khatma-row"
        title={t('settings.reminders.khatma')}
        trailing={
          khatmaValue ? (
            <UiText tone="muted" variant="subhead">
              {khatmaValue}
            </UiText>
          ) : undefined
        }
      />
    </SettingsGroup>
  );
}

