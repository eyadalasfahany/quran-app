import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button, Icon, UiText } from '@/shared/ui';

const CHECK = { ios: 'checkmark', android: 'check' } as const;
export const COMPLETION_BADGE_SIZE = 96;

/**
 * The end of a category or entry: a check, the title, the count (every unit), and the two ways on. «البدء من جديد»
 * resets the scope's progress for the current period.
 */
export function AzkarCompletion({
  title,
  progressText,
  onBack,
  onRestart,
  testID = 'azkar-completion',
}: {
  title: string;
  progressText: string;
  onBack: () => void;
  onRestart: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ flex: 1, gap: theme.space[4], paddingHorizontal: theme.space[4] }} testID={testID}>
      <View style={{ alignItems: 'center', flex: 1, gap: theme.space[3], justifyContent: 'center' }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: theme.colors.brand,
            borderRadius: COMPLETION_BADGE_SIZE / 2,
            height: COMPLETION_BADGE_SIZE,
            justifyContent: 'center',
            width: COMPLETION_BADGE_SIZE,
          }}
        >
          <Icon color={theme.colors.onBrand} name={CHECK} size={40} />
        </View>
        <UiText accessibilityRole="header" align="center" variant="displaySm">
          {t('azkar.reader.completionTitle', { title })}
        </UiText>
        <UiText align="center" tone="muted" variant="subhead">
          {progressText}
        </UiText>
      </View>
      <Button label={t('azkar.reader.completionBack')} onPress={onBack} stretch testID="azkar-completion-back" variant="primary" />
      <Button label={t('azkar.reader.restart')} onPress={onRestart} stretch testID="azkar-completion-restart" variant="secondary" />
    </View>
  );
}
