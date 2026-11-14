import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

const DIAMOND = 10;

/**
 * A key moment on the axis (المولد، الزواج، نزول الوحي، الهجرة، الوفاة): a gold diamond on the track (`part="diamond"`) or its
 * name above the histogram (`part="label"`). Marks are not the timeline's structure; they sit over the age axis. Decorative.
 */
export function MilestoneMark({
  label,
  part,
  dimmed = false,
  testID,
}: {
  label: string;
  part: 'diamond' | 'label';
  dimmed?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const opacity = dimmed ? theme.opacity.disabled : 1;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ alignItems: 'center', opacity }}
      testID={testID}
    >
      {part === 'diamond' ? (
        <View
          style={{
            backgroundColor: theme.colors.gold,
            height: DIAMOND,
            transform: [{ rotate: '45deg' }],
            width: DIAMOND,
          }}
          testID={testID ? `${testID}-diamond` : undefined}
        />
      ) : (
        <UiText align="center" numberOfLines={1} scale="bar" tone="goldInk" variant="label" weight={600}>
          {label}
        </UiText>
      )}
    </View>
  );
}
