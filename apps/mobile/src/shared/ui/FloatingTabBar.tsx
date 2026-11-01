import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FLOATING_TAB_BAR } from '@/core/layout/tab-bar-clearance';
import { useTheme } from '@/core/theme';

import { GlassSurface } from './GlassSurface';

// The Android tab bar (ADR 0033 §2): a 64 pt capsule, 16 from each side, 12 above the system navigation inset.
// The surface is the solid glassFallback with a hairline and the token shadow (Android has no glass). Items sit in
// a row, so RTL mirrors their order: the first tab is the rightmost one in Arabic. `hidden` drops the bar on
// expanded windows, where the sidebar takes over.
export function FloatingTabBar({
  label,
  hidden = false,
  children,
}: {
  label: string;
  hidden?: boolean;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  if (hidden) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      testID="floating-tab-bar-dock"
      style={{
        bottom: insets.bottom + FLOATING_TAB_BAR.offset,
        end: FLOATING_TAB_BAR.side,
        position: 'absolute',
        start: FLOATING_TAB_BAR.side,
      }}
    >
      <GlassSurface
        accessibilityLabel={label}
        accessibilityRole="tablist"
        style={{
          borderRadius: FLOATING_TAB_BAR.radius,
          boxShadow: theme.shadows.glass,
          flexDirection: 'row',
          gap: FLOATING_TAB_BAR.gap,
          height: FLOATING_TAB_BAR.height,
          padding: FLOATING_TAB_BAR.padding,
        }}
        testID="floating-tab-bar"
      >
        {children}
      </GlassSurface>
    </View>
  );
}
