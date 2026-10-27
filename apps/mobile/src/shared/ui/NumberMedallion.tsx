import { View } from 'react-native';

import { formatNumber } from '@/core/i18n';
import { useTheme } from '@/core/theme';

import { UiText } from './UiText';

const MEDALLION = 38;
const SQUARE = 24;
const STROKE = 1.1;

// The surah index's number: Arabic-Indic digits in Amiri inside a gold eight-point star (two squares, one turned 45°).
// Decorative; the row around it carries the label.
export function NumberMedallion({ number, testID }: { number: number; testID?: string }) {
  const theme = useTheme();
  const square = {
    borderColor: theme.colors.gold,
    borderWidth: STROKE,
    height: SQUARE,
    position: 'absolute' as const,
    width: SQUARE,
  };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ alignItems: 'center', height: MEDALLION, justifyContent: 'center', width: MEDALLION }}
      testID={testID}
    >
      <View style={square} />
      <View style={[square, { transform: [{ rotate: '45deg' }] }]} />
      <UiText variant="numeral">{formatNumber(number, 'ar')}</UiText>
    </View>
  );
}
