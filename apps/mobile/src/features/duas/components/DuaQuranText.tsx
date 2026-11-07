import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ORNATE_CLOSE, ORNATE_OPEN, QuranText } from '@/shared/ui';

/** Centred Quran text for a Quranic dua detail (screens/, #DuaQuranDetail). */
export function DuaQuranText({
  verses,
  fontScale = 1,
  testID = 'dua-quran-text',
}: {
  verses: readonly string[];
  fontScale?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const body = verses.join(' ');

  if (body.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: theme.space[4] }} testID={testID}>
      <QuranText align="center" fontScale={fontScale} variant="quranReading">
        {`${ORNATE_OPEN}${body}${ORNATE_CLOSE}`}
      </QuranText>
    </View>
  );
}
