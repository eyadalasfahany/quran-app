import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/core/theme';
import { Icon } from '@/shared/ui';

const CHECK = { ios: 'checkmark', android: 'check' } as const;
const STROKE = 3;

/**
 * A session's progress ring (screens/, #AzkarHome). A track with a brand arc for the share done; a
 * completed session draws a full ring with a check. Decorative: the row around it carries the progress text.
 */
export function AzkarProgressRing({
  fraction,
  completed = false,
  size = 44,
  testID = 'azkar-progress-ring',
}: {
  fraction: number;
  completed?: boolean;
  size?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const share = completed ? 1 : Math.min(Math.max(fraction, 0), 1);
  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ alignItems: 'center', height: size, justifyContent: 'center', width: size }}
      testID={testID}
    >
      <Svg height={size} style={{ position: 'absolute' }} width={size}>
        <Circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke={theme.colors.fillSecondary} strokeWidth={STROKE} />
        {share > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            fill="none"
            r={radius}
            stroke={theme.colors.brand}
            testID={`${testID}-arc`}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - share)}
            strokeLinecap="round"
            strokeWidth={STROKE}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      {completed ? <Icon color={theme.colors.brand} name={CHECK} size={18} testID={`${testID}-check`} /> : null}
    </View>
  );
}
