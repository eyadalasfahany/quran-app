import { Text, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { quranText } from '@/shared/ui/textStyles';

export function BismillahLine({ text, fontScale = 1, testID }: { text: string; fontScale?: number; testID?: string }) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="text"
      style={{
        alignItems: 'center',
        paddingBottom: theme.space[3],
        paddingTop: theme.space[2],
      }}
      testID={testID}
    >
      <Text
        allowFontScaling={false}
        style={[quranText('quranReading', fontScale), { color: theme.colors.ink, textAlign: 'center', writingDirection: 'rtl' }]}
      >
        {text}
      </Text>
    </View>
  );
}
