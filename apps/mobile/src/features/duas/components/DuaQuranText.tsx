import { Fragment } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ORNATE_CLOSE, ORNATE_OPEN, QuranText } from '@/shared/ui';

/** One verse of a Quranic dua: its id, to find the verse being recited, and its stored text, exactly as stored. */
export type DuaQuranVerse = { id: number; textUthmani: string };

/**
 * Centred Quran text for a Quranic dua detail (screens/, #DuaQuranDetailAudio). Each verse is a nested span inside one
 * Quran text, with one space between verses outside the spans, so the text reads exactly as the verses joined with a
 * space (never trimmed or re-encoded). The verse being recited (`activeVerseId`) gets the reader's active-ayah wash
 * (ADR 0092 decision 3). No word is highlighted in v1.
 */
export function DuaQuranText({
  verses,
  activeVerseId = null,
  fontScale = 1,
  testID = 'dua-quran-text',
}: {
  verses: readonly DuaQuranVerse[];
  /** The verse being recited in this dua's range, or null when none is. */
  activeVerseId?: number | null;
  fontScale?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const body = verses.map((verse) => verse.textUthmani).join(' ');

  if (body.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: theme.space[4] }} testID={testID}>
      <QuranText align="center" fontScale={fontScale} variant="quranReading">
        {ORNATE_OPEN}
        {verses.map((verse, index) => (
          <Fragment key={verse.id}>
            {index > 0 ? ' ' : null}
            <Text style={verse.id === activeVerseId ? { backgroundColor: theme.colors.highlightActive } : undefined}>
              {verse.textUthmani}
            </Text>
          </Fragment>
        ))}
        {ORNATE_CLOSE}
      </QuranText>
    </View>
  );
}
