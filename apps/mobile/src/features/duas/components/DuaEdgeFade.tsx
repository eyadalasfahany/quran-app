import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/core/theme';

/**
 * A fade from the screen surface to clear, at the top or bottom edge of a scrolled region (screens/, #DuaHadithDetail).
 * Scrolled text fades out under the progress bar and above the actions, so it never collides with them. It takes no touch.
 */
export function DuaEdgeFade({
  edge,
  height,
  testID = 'dua-edge-fade',
}: {
  edge: 'top' | 'bottom';
  height: number;
  testID?: string;
}) {
  const theme = useTheme();
  const solidAtStart = edge === 'top';
  const id = `dua-fade-${edge}`;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ height, left: 0, position: 'absolute', right: 0, ...(solidAtStart ? { top: 0 } : { bottom: 0 }) }}
      testID={testID}
    >
      <Svg height="100%" width="100%">
        <Defs>
          <LinearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={theme.colors.surface} stopOpacity={solidAtStart ? 1 : 0} />
            <Stop offset="1" stopColor={theme.colors.surface} stopOpacity={solidAtStart ? 0 : 1} />
          </LinearGradient>
        </Defs>
        <Rect fill={`url(#${id})`} height="100%" width="100%" />
      </Svg>
    </View>
  );
}
