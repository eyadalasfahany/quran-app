import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTabBarHiddenOnScroll } from '@/core/layout/useTabBarHiddenOnScroll';
import { CONTENT_COLUMN_MAX_WIDTH } from '@/core/layout/ContentColumn';
import { FLOATING_TAB_BAR, TAB_RAIL } from '@/core/layout/tab-bar-clearance';
import { useScreenInsets } from '@/core/layout/useScreenInsets';
import { useTabRail } from '@/core/layout/useTabRail';
import { spring } from '@/core/theme/motion';
import { useTheme } from '@/core/theme';

import { GlassSurface } from './GlassSurface';

// The floating tab bar (ADR 0033 §2): a 64 pt capsule, 16 from each side, 12 above the system navigation inset.
// Scrolling down in a tab screen slides it off the bottom edge like a sheet (no fade); scrolling up brings it back.
//
// In a short or expanded window (a tablet) the same items stand in a vertical rail on the start edge (ADR 0036; ADR 0051 as
// amended 2 Nov 2026). A phone and a medium window keep the bottom bar, capped at the content column's width and centred.
export function FloatingTabBar({ label, children }: { label: string; children?: ReactNode }) {
  const theme = useTheme();
  const insets = useScreenInsets();
  const rail = useTabRail();
  const { height, width } = useWindowDimensions();
  const scrollHidden = useTabBarHiddenOnScroll();
  const slide = useSharedValue(0);
  const hideDistance = FLOATING_TAB_BAR.height + FLOATING_TAB_BAR.offset + insets.bottom + 16;

  useEffect(() => {
    slide.value = withSpring(scrollHidden ? 1 : 0, spring());
  }, [scrollHidden, slide]);

  const bottom = insets.bottom + FLOATING_TAB_BAR.offset;
  // A medium window wider than the content column (ADR 0051 §5) gets a capsule no wider than that column, centred.
  const centring = Math.max(0, (width - CONTENT_COLUMN_MAX_WIDTH) / 2);
  const fullStart = Math.max(FLOATING_TAB_BAR.side + insets.start, centring);
  const trailEnd = Math.max(FLOATING_TAB_BAR.side + insets.end, centring);

  const dockStyle = useAnimatedStyle(() => ({
    bottom,
    end: trailEnd,
    position: 'absolute' as const,
    start: fullStart,
    transform: [{ translateY: interpolate(slide.value, [0, 1], [0, hideDistance]) }],
  }));

  if (rail) {
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
    <Animated.View pointerEvents={scrollHidden ? 'none' : 'box-none'} testID="floating-tab-bar-dock" style={dockStyle}>
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
    </Animated.View>
  );
}
