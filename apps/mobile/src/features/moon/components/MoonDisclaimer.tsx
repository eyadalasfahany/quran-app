import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

/** The estimate's disclaimer, a tinted box under the estimate card (#MoonSighting). It always shows with an estimate. */
export function MoonDisclaimer({ testID = 'moon-disclaimer' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.fillSecondary,
        borderRadius: theme.radius.tile,
        paddingHorizontal: theme.space[3],
        paddingVertical: theme.space[3],
      }}
      testID={testID}
    >
      <UiText variant="caption">{t('moon.disclaimer')}</UiText>
    </View>
  );
}
