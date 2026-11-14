import { View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

/** The event count inside a cluster pin or an edge chip: a brand disc with a raised ring (frame SeerahMapKey). Decorative. */
export function CountDisc({
  count,
  size = 34,
  testID,
}: {
  count: number;
  size?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const locale = useLocale();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.brand,
        borderColor: theme.colors.surfaceRaised,
        borderRadius: size / 2,
        borderWidth: theme.size.selectedRingGap,
        height: size,
        justifyContent: 'center',
        width: size,
      }}
      testID={testID}
    >
      <UiText align="center" scale="bar" tone="onBrand" variant="label" weight={700}>
        {formatNumber(count, locale)}
      </UiText>
    </View>
  );
}
