import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { displayText, maxFontScale } from './textStyles';

// The surah banner on the page: a double gold frame around the name in Amiri Bold.
export function SurahCartouche({ name, testID }: { name: string; testID?: string }) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={name}
      accessibilityRole="header"
      accessible
      style={{
        alignSelf: 'stretch',
        borderColor: theme.colors.gold,
        borderRadius: theme.radius.sm / 2,
        borderWidth: 1,
        padding: 3,
      }}
      testID={testID}
    >
      <View
        style={{
          alignItems: 'center',
          borderColor: theme.colors.gold,
          borderRadius: theme.radius.sm / 4,
          borderWidth: StyleSheet.hairlineWidth,
          justifyContent: 'center',
          minHeight: 44,
          paddingHorizontal: theme.space[4],
        }}
        testID={testID ? `${testID}-frame` : undefined}
      >
        <Text
          maxFontSizeMultiplier={maxFontScale.content}
          style={[displayText('displaySm'), { color: theme.colors.ink, textAlign: 'center' }]}
        >
          {name}
        </Text>
      </View>
    </View>
  );
}
