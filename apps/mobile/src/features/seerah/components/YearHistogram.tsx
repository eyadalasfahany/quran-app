import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

import { AGE_COUNT } from '../logic';

import type { TimelineOrientation } from './timeline-axis';

const MIN_BAR = 3;

/**
 * Events per age as a row of 64 bars (a column on the vertical bar). `heights` are fractions of the tallest year, from
 * `histogramHeights`. With a focus age the other bars fade and its bar turns brand. Decorative.
 */
export function YearHistogram({
  heights,
  orientation = 'horizontal',
  focusAge = null,
  thickness = 36,
  testID,
}: {
  heights: readonly number[];
  orientation?: TimelineOrientation;
  focusAge?: number | null;
  /** The longest bar, in points. */
  thickness?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const horizontal = orientation === 'horizontal';

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{
        alignItems: horizontal ? 'flex-end' : 'flex-start',
        flex: 1,
        flexDirection: horizontal ? 'row' : 'column',
      }}
      testID={testID}
    >
      {Array.from({ length: AGE_COUNT }, (_, age) => {
        const fraction = heights[age] ?? 0;
        const length = fraction > 0 ? Math.max(MIN_BAR, fraction * thickness) : 2;
        const selected = focusAge === age;
        return (
          <View
            key={age}
            style={{
              alignItems: horizontal ? 'center' : 'flex-start',
              flex: 1,
              justifyContent: horizontal ? 'flex-end' : 'center',
            }}
          >
            <View
              style={[
                {
                  backgroundColor: selected ? theme.colors.brand : fraction > 0 ? theme.colors.chartGray : colors.line,
                  opacity: focusAge !== null && !selected ? theme.opacity.focusAside + 0.15 : 0.9,
                },
                horizontal ? { height: length, width: '70%' } : { height: '70%', width: length },
              ]}
              testID={testID ? `${testID}-bar-${age}` : undefined}
            />
          </View>
        );
      })}
    </View>
  );
}
