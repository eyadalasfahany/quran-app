import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { BackButton, UiText } from '@/shared/ui';

/**
 * Back + title for التنزيلات والمساحة (`#Downloads` frame). Same pattern as SettingsHeader.
 */
export function DownloadsHeader({
  onBack,
  title,
  testID = 'downloads-header',
}: {
  onBack: () => void;
  title: string;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: theme.space[2],
      }}
      testID={testID}
    >
      <BackButton onPress={onBack} testID="downloads-back" />
      <UiText accessibilityRole="header" variant="displayMd">
        {title}
      </UiText>
    </View>
  );
}
