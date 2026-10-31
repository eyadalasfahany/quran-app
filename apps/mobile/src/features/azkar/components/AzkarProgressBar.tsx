import { View } from 'react-native';

import { useTheme } from '@/core/theme';

export const PROGRESS_BAR_HEIGHT = 4;

/** The reader's progress along the category. `fraction` is clamped to 0–1. */
export function AzkarProgressBar({ fraction, testID = 'azkar-progress-bar' }: { fraction: number; testID?: string }) {
  const theme = useTheme();
  const clamped = Math.min(1, Math.max(0, fraction));
  const percent = Math.round(clamped * 100);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: percent }}
      accessible
      style={{
        backgroundColor: theme.colors.line,
        borderRadius: PROGRESS_BAR_HEIGHT / 2,
        height: PROGRESS_BAR_HEIGHT,
        overflow: 'hidden',
        width: '100%',
      }}
      testID={testID}
    >
      <View
        style={{
          backgroundColor: theme.colors.brand,
          borderRadius: PROGRESS_BAR_HEIGHT / 2,
          height: PROGRESS_BAR_HEIGHT,
          width: `${percent}%`,
        }}
        testID={`${testID}-fill`}
      />
    </View>
  );
}
