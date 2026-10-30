import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';

const MEDALLION = 38;
const SQUARE = 24;
const STROKE = 1.1;

// The gold eight-point star of the surah index: two squares, one turned 45°. Children (the number) sit
// in its centre. Decorative; the row around it carries the label.
export function MedallionOutline({
  children,
  opacity,
  testID,
}: {
  children?: ReactNode;
  /** Fades the star, as the loading skeleton does (0.35). */
  opacity?: number;
  testID?: string;
}) {
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
      style={{ alignItems: 'center', height: MEDALLION, justifyContent: 'center', opacity, width: MEDALLION }}
      testID={testID}
    >
      <View style={square} />
      <View style={[square, { transform: [{ rotate: '45deg' }] }]} />
      {children}
    </View>
  );
}
