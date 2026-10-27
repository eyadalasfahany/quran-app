import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { UiText } from './UiText';

export function TitlePill({ title, subtitle, testID }: { title: string; subtitle?: string; testID?: string }) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityRole="header"
      accessible
      style={{
        alignItems: 'center',
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.space[4],
        paddingVertical: theme.space[1],
        pointerEvents: 'none',
      }}
      testID={testID}
    >
      <UiText numberOfLines={1} scale="bar" variant="displaySm">
        {title}
      </UiText>
      {subtitle ? (
        <UiText numberOfLines={1} scale="bar" tone="muted" variant="caption">
          {subtitle}
        </UiText>
      ) : null}
    </View>
  );
}
