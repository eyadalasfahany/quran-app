import type { ReactNode } from 'react';

import { useTheme } from '@/core/theme';
import { View } from 'react-native';

/**
 * The raised card that groups the six time rows (quran-app-screens.html, #Salah):
 * 20 pt radius, hairline border, children clipped to the corners.
 */
export function PrayerTimesCard({ children, testID = 'salah-times' }: { children: ReactNode; testID?: string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: theme.colors.line,
        borderRadius: theme.radius.lg,
        borderWidth: theme.stroke.hairline,
        overflow: 'hidden',
      }}
      testID={testID}
    >
      {children}
    </View>
  );
}
