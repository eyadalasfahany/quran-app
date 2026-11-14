import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';

/** The pin's drawn diameter: the solid dot of a single event. The touch target around it is `size.touchTarget`. */
export const DOT_SIZE = 18;
const EMPTY_SIZE = 12;
const HALO_SIZE = 56;
const UNCERTAIN_SIZE = 30;

export type MapPinVariant = 'single' | 'empty';

/**
 * One event (or a landmark with none) on the map, a 44 pt native target centred on its point. `uncertain` draws the
 * dashed gold edge of an approximate place or time; `selected` adds the halo; `dimmed` fades it and takes it out of the
 * screen-reader order (the timeline's focus year). The label is a separate MapLabel.
 */
export function MapPin({
  label,
  variant = 'single',
  uncertain = false,
  selected = false,
  dimmed = false,
  onPress,
  testID,
}: {
  label: string;
  variant?: MapPinVariant;
  uncertain?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const empty = variant === 'empty';

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
      {uncertain ? (
        <View
          pointerEvents="none"
          style={{
            borderColor: theme.colors.gold,
            borderRadius: UNCERTAIN_SIZE / 2,
            borderStyle: 'dashed',
            borderWidth: theme.stroke.focus,
            height: UNCERTAIN_SIZE,
            position: 'absolute',
            width: UNCERTAIN_SIZE,
          }}
          testID={testID ? `${testID}-uncertain` : undefined}
        />
      ) : null}
      <View
        style={
          empty
            ? {
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.inkMuted,
                borderRadius: EMPTY_SIZE / 2,
                borderWidth: theme.stroke.focus,
                height: EMPTY_SIZE,
                width: EMPTY_SIZE,
              }
            : {
                backgroundColor: theme.colors.brand,
                borderColor: theme.colors.surfaceRaised,
                borderRadius: DOT_SIZE / 2,
                borderWidth: theme.size.selectedRingGap,
                height: DOT_SIZE + theme.size.selectedRingGap * 2,
                width: DOT_SIZE + theme.size.selectedRingGap * 2,
              }
        }
        testID={testID ? `${testID}-dot` : undefined}
      />
    </Pressable>
  );
}
