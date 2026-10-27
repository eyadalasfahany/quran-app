import { Text, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { quranText, uiTextProps } from './textStyles';
import { useContrastColors } from './useContrastColors';

export function WordMeaningChip({
  word,
  meaning,
  meaningDirection = 'ltr',
  fontScale = 1,
  testID,
}: {
  // Uthmani text, rendered exactly as stored.
  word: string;
  meaning: string;
  // Word meanings are English (LTR) unless the resource says otherwise.
  meaningDirection?: 'ltr' | 'rtl';
  fontScale?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View
      accessibilityLabel={`${word}, ${meaning}`}
      accessible
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderColor: colors.line,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        gap: 2,
        paddingHorizontal: theme.space[3],
        paddingVertical: theme.space[2],
      }}
      testID={testID}
    >
      <Text
        accessible={false}
        allowFontScaling={false}
        importantForAccessibility="no"
        style={[quranText('quranWord', fontScale), { color: theme.colors.ink, writingDirection: 'rtl' }]}
        testID={testID ? `${testID}-word` : undefined}
      >
        {word}
      </Text>
      <Text
        {...uiTextProps('caption')}
        accessible={false}
        importantForAccessibility="no"
        style={[
          theme.text.caption,
          { color: colors.inkMuted, textAlign: 'center', writingDirection: meaningDirection },
        ]}
        testID={testID ? `${testID}-meaning` : undefined}
      >
        {meaning}
      </Text>
    </View>
  );
}
