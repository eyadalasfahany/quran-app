import { useTranslation } from 'react-i18next';

import { ListRow, ToggleRow, UiText } from '@/shared/ui';

import { SettingsGroup } from './SettingsGroup';

export function HabitsSection({
  reminderEnabled = false,
  onReminderChange,
  khatmaValue,
  onPressKhatma,
  testID = 'habits-section',
}: {
  reminderEnabled?: boolean;
  onReminderChange?: (value: boolean) => void;
  khatmaValue?: string;
  onPressKhatma?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <SettingsGroup testID={testID} title={t('settings.sections.reminders')}>
      <ToggleRow
        onValueChange={onReminderChange ?? (() => {})}
        separator="line"
        testID="habits-reminder-toggle"
        title={t('settings.reminders.dailyReminder')}
        value={reminderEnabled}
      />
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

