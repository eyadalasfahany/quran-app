import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

export function MoonDisclaimer({ testID = 'moon-disclaimer' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View testID={testID}>
      <UiText style={{ color: theme.colors.inkMuted }} variant="caption">
        {t('moon.disclaimer')}
      </UiText>
    </View>
  );
}
