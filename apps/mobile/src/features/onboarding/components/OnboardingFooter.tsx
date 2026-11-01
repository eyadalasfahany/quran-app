import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button, OnboardingStepIndicator } from '@/shared/ui';

export function OnboardingFooter({
  step,
  stepLabel,
  continueLabel,
  onContinue,
  testID = 'onboarding-footer',
}: {
  step: 1 | 2 | 3;
  stepLabel: string;
  continueLabel: string;
  onContinue: () => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        gap: theme.space[4],
        paddingBottom: theme.space[6],
        paddingHorizontal: step === 1 ? theme.space[6] : theme.space[5],
      }}
      testID={testID}
    >
      <OnboardingStepIndicator accessibilityLabel={stepLabel} step={step} />
      <Button label={continueLabel} onPress={onContinue} stretch testID="onboarding-continue" variant="primary" />
    </View>
  );
}
