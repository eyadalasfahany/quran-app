import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTabRailSideInset } from '@/core/layout/TabRailContext';
import { useScreenInsets } from '@/core/layout/useScreenInsets';
import { useTheme } from '@/core/theme';

// The root of a tab or stack screen: the screen surface inside the safe area. The side insets (a notch in landscape)
// are reading-direction aware, so the content clears them on either side.
export function Screen({
  children,
  surface = 'surface',
  topInset = true,
  accessibilityLabel,
  testID,
}: {
  children?: ReactNode;
  // The reader sits on surfacePage; every other screen on surface.
  surface?: 'surface' | 'surfacePage';
  topInset?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}) {
  const theme = useTheme();
  const insets = useScreenInsets();
  // A tab screen keeps clear of the rail on the start side in a short window (ADR 0036); other screens read 0.
  const railSide = useTabRailSideInset();

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={{
        backgroundColor: theme.colors[surface],
        flex: 1,
        paddingEnd: insets.end,
        paddingStart: insets.start + railSide,
        paddingTop: topInset ? insets.top : 0,
      }}
      testID={testID}
    >
      {children}
    </View>
  );
}
