import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

/**
 * The rounds pill above the misbaha's count (quran-app-screens.html, #Sibha): «الدورة ٢» once a target has been
 * completed, and nothing while there are no rounds. It is a read-out, so screen readers hear it through the counter's
 * value and it is not a control of its own.
 */
export function SibhaRoundsBadge({ rounds, testID = 'sibha-rounds' }: { rounds: number; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const colors = useContrastColors();

  if (rounds <= 0) {
    return null;
  }

  return (
    <View
      importantForAccessibility="no"
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.fillSecondary,
        borderColor: colors.line,
        borderRadius: theme.radius.pill,
        borderWidth: theme.stroke.hairline,
        justifyContent: 'center',
        paddingHorizontal: theme.space[3],
        paddingVertical: theme.space[1],
      }}
      testID={testID}
    >
      <UiText importantForAccessibility="no" tone="ink" variant="subhead" weight={600}>
        {t('sibha.rounds', { round: formatNumber(rounds, locale) })}
      </UiText>
    </View>
  );
}
