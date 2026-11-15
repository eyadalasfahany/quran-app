import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';
import { formatNumber } from '@/core/i18n';

const DIAMETER = 36;

/**
 * The position of a Duas card (screens/, #DuasCategory): a gold-ringed circle with the number in Amiri, Arabic-Indic
 * digits as on the Azkar medallion. Decorative; the card around it carries the label.
 */
export function DuasCardNumber({ number, testID = 'duas-card-number' }: { number: number; testID?: string }) {
  const theme = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        alignItems: 'center',
        borderColor: theme.colors.gold,
        borderRadius: DIAMETER / 2,
        borderWidth: theme.stroke.marker,
        height: DIAMETER,
        justifyContent: 'center',
        width: DIAMETER,
      }}
      testID={testID}
    >
      <UiText align="center" tone="brand" variant="numeral">
        {formatNumber(number, 'ar')}
      </UiText>
    </View>
  );
}
