import type { ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { FLOATING_TAB_BAR, TAB_RAIL } from '@/core/layout/tab-bar-clearance';
import { useScreenInsets } from '@/core/layout/useScreenInsets';
import { useIsShortWindow } from '@/core/layout/useWindowClass';
import { useTheme } from '@/core/theme';

import { GlassSurface } from './GlassSurface';

// The floating tab bar (ADR 0033 §2): a 64 pt capsule, 16 from each side, 12 above the system navigation inset.
// The side insets (a notch in landscape) push the capsule in from that edge, in reading direction. The surface is the
// solid glassFallback with a hairline and the token shadow (Android has no glass). Items sit in a row, so RTL mirrors
// their order: the first tab is the rightmost one in Arabic. `hidden` drops the bar on expanded windows, where the
// sidebar takes over.
//
// In a short window the same items stand in a vertical rail on the start edge, 12 past the start safe area, vertically
// centred (developer, 1 Nov 2026; ADR 0036). Items stack top to bottom; each keeps its icon over its label. The rail
// is drawn on both platforms; the items and their roles are the same.
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
  const insets = useScreenInsets();
  const short = useIsShortWindow();
  const { height } = useWindowDimensions();

  if (hidden) {
    return null;
  }

  if (short) {
    // The rail keeps 12 clear above and below, so a short window still shows it whole.
    const railHeight = Math.min(TAB_RAIL.height, height - TAB_RAIL.offset * 2);
    return (
      <View
        pointerEvents="box-none"
        style={{ bottom: 0, justifyContent: 'center', position: 'absolute', start: TAB_RAIL.offset + insets.start, top: 0 }}
        testID="floating-tab-bar-dock"
      >
        <GlassSurface
          accessibilityLabel={label}
          accessibilityRole="tablist"
          style={{
            borderRadius: FLOATING_TAB_BAR.radius,
            boxShadow: theme.shadows.glass,
            flexDirection: 'column',
            gap: FLOATING_TAB_BAR.gap,
            height: railHeight,
            padding: FLOATING_TAB_BAR.padding,
            width: TAB_RAIL.width,
          }}
          testID="floating-tab-bar"
        >
          {children}
        </GlassSurface>
      </View>
    );
  }

  return (
    <View
      pointerEvents="box-none"
      testID="floating-tab-bar-dock"
      style={{
        bottom: insets.bottom + FLOATING_TAB_BAR.offset,
        end: FLOATING_TAB_BAR.side + insets.end,
        position: 'absolute',
        start: FLOATING_TAB_BAR.side + insets.start,
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
