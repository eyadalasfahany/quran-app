import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button, IconButton } from '@/shared/ui';

export function OnboardingTopBar({
  onBack,
  onSkip,
  skipLabel,
  backLabel,
  testID = 'onboarding-top-bar',
}: {
  onBack?: () => void;
  onSkip?: () => void;
  skipLabel: string;
  backLabel: string;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        minHeight: theme.size.touchTarget,
      }}
      testID={testID}
    >
      {onBack ? (
        <IconButton icon={{ ios: 'chevron.right', android: 'chevron_right' }} label={backLabel} mirrorInRtl onPress={onBack} variant="raised" />
      ) : (
        <View style={{ width: theme.size.touchTarget }} />
      )}
      {onSkip ? (
        <Button label={skipLabel} onPress={onSkip} size="small" testID="onboarding-skip" variant="ghost" />
      ) : (
        <View style={{ minWidth: theme.size.touchTarget }} />
      )}
    </View>
  );
}
