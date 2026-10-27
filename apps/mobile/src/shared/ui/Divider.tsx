import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/core/theme';

import { useContrastColors } from './useContrastColors';

// The one separator line. 'strong' stays visible over fillSecondary or busy surfaces (ADR 0012).
export function Divider({
  strong = false,
  vertical = false,
  style,
  testID,
}: {
  strong?: boolean;
  vertical?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { backgroundColor: strong ? colors.lineStrong : colors.line },
        vertical ? { alignSelf: 'stretch', width: theme.stroke.hairline } : { height: theme.stroke.hairline },
        style,
      ]}
      testID={testID}
    />
  );
}
