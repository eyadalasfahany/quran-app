import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button, UiText } from '@/shared/ui';

// The prompt is Amiri 22 (quran-app-screens.html, #Main), as the other Home titles are.
const TITLE_SIZE = 22;
const TITLE_LINE_HEIGHT = 29;

/**
 * The progress card with nothing chosen (quran-app-screens.html, #Home «حدّد أهدافك اليومية»): a short prompt over a
 * button that opens the goals sheet. Nothing is tracked until the user chooses.
 */
export function DailyProgressEmpty({
  onSetGoals,
  testID = 'daily-progress-empty',
}: {
  onSetGoals: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: theme.space[3], paddingVertical: theme.space[2] }} testID={testID}>
      <UiText accessibilityRole="header" align="center" style={{ fontSize: TITLE_SIZE, lineHeight: TITLE_LINE_HEIGHT }} variant="displaySm">
        {t('home.dailyProgress.emptyTitle')}
      </UiText>
      <UiText align="center" tone="muted" variant="subhead">
        {t('home.dailyProgress.emptyBody')}
      </UiText>
      <Button label={t('home.dailyProgress.setGoals')} onPress={onSetGoals} testID={`${testID}-button`} variant="primary" />
    </View>
  );
}
