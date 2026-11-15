import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

const DIAMOND = 7;

/**
 * A key moment on the axis (المولد، الزواج، نزول الوحي، الهجرة، الوفاة): a gold diamond on the track (`part="diamond"`) or its
 * name above the histogram (`part="label"`). Marks are not the timeline's structure; they sit over the age axis. Decorative.
 */
export function MilestoneMark({
  label,
  part,
  dimmed = false,
  selected = false,
  testID,
}: {
  label: string;
  part: 'diamond' | 'label';
  /** With an age selected the other names fade to 55% and the selected age's milestone turns bold (frame SeerahMapRegionYear). */
  dimmed?: boolean;
  selected?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const opacity = dimmed ? 0.55 : 1;

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
            boxShadow: `0 0 0 1.5px ${theme.colors.surfaceRaised}`,
            height: DIAMOND,
            transform: [{ rotate: '45deg' }],
            width: DIAMOND,
          }}
          testID={testID ? `${testID}-diamond` : undefined}
        />
      ) : (
        <UiText align="center" numberOfLines={1} scale="bar" style={{ fontSize: 11, lineHeight: 14 }} tone="goldInk" variant="label" weight={selected ? 700 : 500}>
          {label}
        </UiText>
      )}
    </View>
  );
}
