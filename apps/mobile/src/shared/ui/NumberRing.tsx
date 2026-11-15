import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { UiText } from './UiText';
import { formatNumber } from '@/core/i18n';

const DIAMETER = 36;

/**
 * The round gold-ringed position badge of a list row (screens/, #AzkarFavorites and #DuasCategory): Arabic-Indic digits
 * in Amiri. Decorative; the row around it carries the label.
 */
export function NumberRing({ number, testID = 'number-ring' }: { number: number; testID?: string }) {
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
