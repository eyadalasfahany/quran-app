import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';

// The root of a tab or stack screen: the screen surface below the status bar.
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
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={{ backgroundColor: theme.colors[surface], flex: 1, paddingTop: topInset ? insets.top : 0 }}
      testID={testID}
    >
      {children}
    </View>
  );
}
