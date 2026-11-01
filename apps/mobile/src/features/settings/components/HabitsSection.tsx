import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAzkarAvailable } from '@/features/azkar/data';
import { azkarHref } from '@/features/azkar/routes';
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
  // The Azkar reminder row appears only once Azkar content is installed (ADR 0017: no dead ends).
  const azkarAvailable = useAzkarAvailable();

  return (
    <SettingsGroup testID={testID} title={t('settings.sections.reminders')}>
      <DailyReminderRow />
      {azkarAvailable ? (
        <ListRow
          chevron
          onPress={() => router.push(azkarHref.reminders())}
          testID="habits-azkar-reminders-row"
          title={t('settings.reminders.azkarReminders')}
        />
      ) : null}
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

