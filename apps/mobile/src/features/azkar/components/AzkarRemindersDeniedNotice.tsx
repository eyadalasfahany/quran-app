import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button, Card, UiText } from '@/shared/ui';

/**
 * The notice when the system has turned notifications off for Taybah (screens/, #AzkarRemindersDenied):
 * the reminders cannot arrive until the device allows them, so the sheet says so and offers the device settings.
 */
export function AzkarRemindersDeniedNotice({
  onOpenSettings,
  testID = 'azkar-reminders-denied',
}: {
  onOpenSettings: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Card testID={testID}>
      <View style={{ gap: theme.space[2] }}>
        <UiText accessibilityRole="header" variant="headline">
          {t('azkar.reminders.deniedTitle')}
        </UiText>
        <UiText tone="muted" variant="caption">
          {t('azkar.reminders.deniedBody')}
        </UiText>
        <Button
          label={t('common.openSettings')}
          onPress={onOpenSettings}
          size="small"
          testID={`${testID}-open-settings`}
          variant="secondary"
        />
      </View>
    </Card>
  );
}
