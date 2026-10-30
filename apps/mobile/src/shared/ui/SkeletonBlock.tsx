import { useContext } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useTheme } from '@/core/theme';

import { SkeletonPulseContext } from './skeleton-context';
import { useContrastColors } from './useContrastColors';

// The brand card's track is onBrand at 20%, as in ContinueReadingCard.
const ON_BRAND_OPACITY = 0.2;

export type SkeletonTone = 'default' | 'onBrand' | 'raised';

// One placeholder bar: fillSecondary, or onBrand at 20% on the brand card. `raised` stands in for a round button:
// surfaceRaised with a line hairline, as the button itself. Its radius is half its height unless given. Hidden from accessibility; the SkeletonGroup around it carries the label.
export function SkeletonBlock({
  width,
  height,
  radius,
  tone = 'default',
  style,
  testID,
}: {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  tone?: SkeletonTone;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const theme = useTheme();
  const pulse = useContext(SkeletonPulseContext);
  const animated = useAnimatedStyle(() => ({ opacity: pulse === null ? 1 : pulse.value }));
  const colors = useContrastColors();
  const onBrand = tone === 'onBrand';
  const raised = tone === 'raised';

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { borderRadius: radius ?? height / 2, height, overflow: 'hidden', width },
        raised ? { borderColor: colors.line, borderWidth: theme.stroke.hairline } : null,
        animated,
        style,
      ]}
      testID={testID}
    >
      <View
        style={{
          backgroundColor: onBrand ? theme.colors.onBrandSurface : raised ? theme.colors.surfaceRaised : theme.colors.fillSecondary,
          flex: 1,
          opacity: onBrand ? ON_BRAND_OPACITY : 1,
        }}
      />
    </Animated.View>
  );
}
