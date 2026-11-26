import type { RadiusToken } from '@quran/design-tokens';
import { GlassView, type GlassColorScheme } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useGlass, useTheme } from '@/core/theme';

import { useContrastColors } from './useContrastColors';

// Switches between native glass and the solid fallback; it never fades between them.
/** The glass scheme that matches the app's theme (sepia is a light theme). */
export function glassSchemeFor(name: string): GlassColorScheme {
  return name === 'dark' ? 'dark' : 'light';
}

export function GlassSurface({
  children,
  radius = 'xl',
  colorScheme,
  interactive = false,
  style,
  accessibilityLabel,
  accessibilityRole,
  testID,
}: {
  children?: ReactNode;
  radius?: RadiusToken;
  // The native glass's appearance. Omitted, it follows the app's theme; a surface that is always dark (the player) sets 'dark'.
  colorScheme?: GlassColorScheme;
  /**
   * Tappable glass (iOS 26): the press bubble, the stretch that follows a held finger, and the glow. The glass is then
   * the container, so the finger lands inside it; a backdrop layer never sees the touch. expo-glass-effect mounts the
   * children in the effect's content view, so the controls inside still get their presses.
   */
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
} & Pick<ViewProps, 'accessibilityLabel' | 'accessibilityRole' | 'testID'>) {
  const theme = useTheme();
  const colors = useContrastColors();
  const nativeGlass = useGlass();
  const shape = { borderRadius: theme.radius[radius] };

  if (nativeGlass && interactive) {
    return (
      <GlassView
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        colorScheme={colorScheme ?? glassSchemeFor(theme.name)}
        glassEffectStyle="regular"
        isInteractive
        style={[shape, style]}
        testID={testID}
      >
        {children}
      </GlassView>
    );
  }

  if (nativeGlass) {
    // The glass is a background layer that never receives touches. With the controls as its children,
    // the native glass view sat between the finger and the Pressable on iOS 26.
    return (
      <View accessibilityLabel={accessibilityLabel} accessibilityRole={accessibilityRole} style={[shape, style]} testID={testID}>
        <GlassView
          // 'auto' follows the system appearance, not the app's theme: a Dark app on a light device drew light glass.
          colorScheme={colorScheme ?? glassSchemeFor(theme.name)}
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
