import type { RadiusToken } from '@quran/design-tokens';
import { GlassView, type GlassColorScheme } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useGlass, useTheme } from '@/core/theme';

import { useContrastColors } from './useContrastColors';

// Switches between native glass and the solid fallback; it never fades between them.
export function GlassSurface({
  children,
  radius = 'xl',
  colorScheme = 'auto',
  style,
  accessibilityLabel,
  accessibilityRole,
  testID,
}: {
  children?: ReactNode;
  radius?: RadiusToken;
  // The native glass's appearance. 'auto' follows the system; a surface that is always dark (the player) sets 'dark'.
  colorScheme?: GlassColorScheme;
  style?: StyleProp<ViewStyle>;
} & Pick<ViewProps, 'accessibilityLabel' | 'accessibilityRole' | 'testID'>) {
  const theme = useTheme();
  const colors = useContrastColors();
  const nativeGlass = useGlass();
  const shape = { borderRadius: theme.radius[radius] };

  if (nativeGlass) {
    // The glass is a background layer that never receives touches. With the controls as its children,
    // the native glass view sat between the finger and the Pressable on iOS 26.
    return (
      <View accessibilityLabel={accessibilityLabel} accessibilityRole={accessibilityRole} style={[shape, style]} testID={testID}>
        <GlassView
          colorScheme={colorScheme}
          glassEffectStyle="regular"
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, shape]}
          testID={testID === undefined ? undefined : `${testID}-glass`}
        />
        {children}
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      style={[
        shape,
        {
          backgroundColor: theme.colors.glassFallback,
          borderColor: colors.line,
          borderWidth: StyleSheet.hairlineWidth,
        },
        style,
      ]}
      testID={testID}
    >
      {children}
    </View>
  );
}
