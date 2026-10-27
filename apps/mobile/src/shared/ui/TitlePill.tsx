import { Text, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { displayText, maxFontScale, uiTextProps } from './textStyles';
import { useContrastColors } from './useContrastColors';

// The reader's top-bar title: not a control, so touches pass through to the page.
export function TitlePill({ title, subtitle, testID }: { title: string; subtitle?: string; testID?: string }) {
  const theme = useTheme();
  const colors = useContrastColors();
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
      <Text
        maxFontSizeMultiplier={maxFontScale.bar}
        numberOfLines={1}
        style={[displayText('displaySm'), { color: theme.colors.ink }]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          {...uiTextProps('caption', 'bar')}
          numberOfLines={1}
          style={[theme.text.caption, { color: colors.inkMuted }]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
