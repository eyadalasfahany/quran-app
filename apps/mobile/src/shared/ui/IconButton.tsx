import { size } from '@quran/design-tokens';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { GlassSurface } from './GlassSurface';
import { Icon, type IconName } from './Icon';

export const ICON_BUTTON_SIZE = size.touchTarget;

export type IconButtonVariant = 'plain' | 'filled' | 'glass';

export function IconButton({
  icon,
  label,
  onPress,
  pressed,
  variant = 'plain',
  mirrorInRtl = false,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  pressed?: boolean;
  variant?: IconButtonVariant;
  mirrorInRtl?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const color = pressed ? theme.colors.brand : theme.colors.ink;
  const resting = variant === 'filled' ? theme.colors.fillSecondary : 'transparent';

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={pressed === undefined ? undefined : { selected: pressed }}
      onPress={onPress}
      style={({ pressed: touching }) => ({
        alignItems: 'center',
        backgroundColor: pressed || touching ? theme.colors.glassSelected : resting,
        borderRadius: theme.radius.pill,
        height: theme.size.touchTarget,
        justifyContent: 'center',
        width: theme.size.touchTarget,
      })}
      testID={testID}
    >
      {variant === 'glass' ? (
        // The glass is drawn inside the button and never takes a touch, so every tap on it lands in the
        // Pressable. With the button inside the glass, taps on the standalone glass buttons were lost on iOS 26.
        <View pointerEvents="none" style={StyleSheet.absoluteFill} testID={testID ? `${testID}-glass` : undefined}>
          <GlassSurface radius="pill" style={StyleSheet.absoluteFill} />
        </View>
      ) : null}
      <Icon color={color} mirrorInRtl={mirrorInRtl} name={icon} />
    </Pressable>
  );
}
