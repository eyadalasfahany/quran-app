import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

// The Home frame's progress ring: 64 pt, stroke 5 (screens/, #Main «تقدّم اليوم»).
const RING_SIZE = 64;
const STROKE = 5;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Today's total as a ring, with the percent in its centre. `percent` is 0 to 100. */
export function DailyProgressRing({
  percent,
  label,
  testID = 'daily-progress-ring',
}: {
  percent: number;
  label: string;
  testID?: string;
}) {
  const theme = useTheme();
  const fraction = Math.min(Math.max(percent, 0), 100) / 100;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ alignItems: 'center', height: RING_SIZE, justifyContent: 'center', width: RING_SIZE }}
      testID={testID}
    >
      <Svg height={RING_SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }} width={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="none"
          r={RADIUS}
          stroke={theme.colors.fillSecondary}
          strokeWidth={STROKE}
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="none"
          r={RADIUS}
          stroke={theme.colors.brand}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          strokeLinecap="round"
          strokeWidth={STROKE}
          testID={`${testID}-arc`}
        />
      </Svg>
      <UiText testID={`${testID}-label`} variant="subhead" weight={700}>
        {label}
      </UiText>
    </View>
  );
}
