import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

/** The «جديد» pill on a row added since the person last finished or hid the card (ADR 0053 §5). */
export function DiscoverNewBadge({ testID }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View
      style={{
        backgroundColor: theme.colors.brand,
        borderRadius: theme.radius.pill,
        flexShrink: 0,
        paddingHorizontal: theme.space[2],
        paddingVertical: theme.space[1],
      }}
      testID={testID}
    >
      <UiText tone="onBrand" variant="caption" weight={600} style={{ color: colors.onBrand }}>
        {t('discover.newBadge')}
      </UiText>
    </View>
  );
}
