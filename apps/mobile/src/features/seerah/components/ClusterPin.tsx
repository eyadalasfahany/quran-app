import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { CountDisc } from './CountDisc';

const HALO_SIZE = 56;
const CITY_RING = 37;

export type ClusterPinVariant = 'cluster' | 'city';

/**
 * Several events at one spot, drawn as their count. `city` is a place with its own map: the extra gold ring says
 * «tap to open». A cluster of nearby pins uses `cluster`; a tap zooms to its bounds. 44 pt target.
 */
export function ClusterPin({
  count,
  label,
  variant = 'cluster',
  selected = false,
  dimmed = false,
  onPress,
  testID,
}: {
  count: number;
  label: string;
  variant?: ClusterPinVariant;
  selected?: boolean;
  dimmed?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityElementsHidden={dimmed}
      accessibilityLabel={label}
      accessibilityRole="button"
      importantForAccessibility={dimmed ? 'no-hide-descendants' : 'auto'}
      onPress={onPress}
      style={{
        alignItems: 'center',
        height: theme.size.touchTarget,
        justifyContent: 'center',
        opacity: dimmed ? theme.opacity.disabled : 1,
        width: theme.size.touchTarget,
      }}
      testID={testID}
    >
      {selected ? (
        <View
          pointerEvents="none"
          style={{
            backgroundColor: theme.colors.highlightActive,
            borderColor: theme.colors.brand,
            borderRadius: HALO_SIZE / 2,
            borderWidth: theme.stroke.focus,
            height: HALO_SIZE,
            position: 'absolute',
            width: HALO_SIZE,
          }}
          testID={testID ? `${testID}-halo` : undefined}
        />
      ) : null}
      {variant === 'city' ? (
        // The frame's gold ring sits right outside the disc's raised ring: 30 + 2 × 2 + 2 × 1.5.
        <View
          pointerEvents="none"
          style={{
            borderColor: theme.colors.gold,
            borderRadius: CITY_RING / 2,
            borderWidth: theme.stroke.frame,
            height: CITY_RING,
            position: 'absolute',
            width: CITY_RING,
          }}
          testID={testID ? `${testID}-ring` : undefined}
        />
      ) : null}
      <CountDisc count={count} />
    </Pressable>
  );
}
