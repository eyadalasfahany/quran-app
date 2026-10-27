import type { QuranTypeToken } from '@quran/design-tokens';
import { Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ORNATE_CLOSE, ORNATE_OPEN, QuranText } from '@/shared/ui';

// Keeps the ornaments off the first and last letters. Kept outside the stored text.
const WORD_SPACE = ' ';

// The Basmala between the gold ornate parentheses of the end-of-ayah mark. The app draws the ornaments;
// they are never part of the stored text, and screen readers hear only the text.
export function BismillahLine({
  text,
  fontScale = 1,
  typeToken = 'quranReading',
  testID,
}: {
  text: string;
  fontScale?: number;
  typeToken?: Extract<QuranTypeToken, 'quranReading' | 'quranMushaf'>;
  testID?: string;
}) {
  const theme = useTheme();
  const ornament = { color: theme.colors.gold };

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
      <QuranText
        accessibilityLabel={text}
        align="center"
        fontScale={fontScale}
        testID={testID ? `${testID}-text` : undefined}
        variant={typeToken}
      >
        <Text style={ornament}>{ORNATE_OPEN}</Text>
        {WORD_SPACE}
        <Text>{text}</Text>
        {WORD_SPACE}
        <Text style={ornament}>{ORNATE_CLOSE}</Text>
      </QuranText>
    </View>
  );
}
