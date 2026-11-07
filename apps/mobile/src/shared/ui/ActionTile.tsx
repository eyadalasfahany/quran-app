import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { BufferingRing } from './BufferingRing';
import { Icon, type IconName } from './Icon';
import { UiText } from './UiText';
import { useContrastColors } from './useContrastColors';

// Ayah actions frame (screens/): tile gap and horizontal padding. No space token
// matches these, so they stay local.
const TILE_GAP = 6;
const TILE_PADDING_HORIZONTAL = 2;
// The icon box, and the buffering ring drawn 5 pt outside it on every side (icon size + 10).
const ICON_SIZE = 22;
const RING_INSET = 5;
const RING_SIZE = ICON_SIZE + RING_INSET * 2;

export function ActionTile({
  icon,
  label,
  onPress,
  variant = 'default',
  mirrorInRtl = false,
  disabled = false,
  selected,
  busy = false,
  accessibilityHint,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'primary';
  mirrorInRtl?: boolean;
  disabled?: boolean;
  selected?: boolean;
  /** The tile's action is starting: the icon gets the buffering ring, and screen readers read the tile as busy. */
  busy?: boolean;
  accessibilityHint?: string;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const primary = variant === 'primary';
  const base = selected === undefined ? { disabled } : { disabled, selected };
  const state = busy ? { ...base, busy: true } : base;
  const glyphColor = primary ? theme.colors.onBrandSurface : theme.colors.brand;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={state}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: primary
          ? theme.colors.brandSurface
          : pressed
            ? theme.colors.fillSecondary
            : theme.colors.surfaceRaised,
        borderColor: primary ? theme.colors.brandSurface : colors.line,
        borderRadius: theme.radius.tile,
        borderWidth: theme.stroke.hairline,
        flex: 1,
        gap: TILE_GAP,
        justifyContent: 'center',
        opacity: disabled ? theme.opacity.disabled : 1,
        paddingHorizontal: TILE_PADDING_HORIZONTAL,
        paddingVertical: theme.space[3],
      })}
      testID={testID}
    >
      <View style={{ height: ICON_SIZE, width: ICON_SIZE }}>
        <Icon color={glyphColor} mirrorInRtl={mirrorInRtl} name={icon} size={ICON_SIZE} />
        {busy ? (
          // Absolute, so the icon box keeps its size and the tile does not move while the ring turns.
          <View pointerEvents="none" style={{ left: -RING_INSET, position: 'absolute', top: -RING_INSET }}>
            <BufferingRing active color={glyphColor} size={RING_SIZE} testID={testID ? `${testID}-buffering` : undefined}>
              {null}
            </BufferingRing>
          </View>
        ) : null}
      </View>
      <UiText
        align="center"
        style={primary ? { color: theme.colors.onBrandSurface } : null}
        variant="label"
        weight={primary ? 600 : undefined}
      >
        {label}
      </UiText>
    </Pressable>
  );
}
