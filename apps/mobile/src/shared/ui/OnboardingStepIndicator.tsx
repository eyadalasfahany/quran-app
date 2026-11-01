import { View } from 'react-native';

import { useTheme } from '@/core/theme';

/** Three-step onboarding progress (quran-app-screens.html, OnboardLanguage–OnboardReciter). */
export function OnboardingStepIndicator({
  step,
  accessibilityLabel,
  testID = 'onboarding-step-indicator',
}: {
  /** 1-based active step. */
  step: 1 | 2 | 3;
  accessibilityLabel: string;
  testID?: string;
}) {
  const theme = useTheme();
  const activeW = 22;
  const dot = 6;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
      style={{ flexDirection: 'row', gap: 6 }}
      testID={testID}
    >
      {[1, 2, 3].map((index) => (
        <View
          key={index}
          style={{
            backgroundColor: index === step ? theme.colors.brand : theme.colors.fillTrack,
            borderRadius: dot / 2,
            height: dot,
            width: index === step ? activeW : dot,
          }}
        />
      ))}
    </View>
  );
}
