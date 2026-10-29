import { Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { QuranText } from '@/shared/ui/QuranText';
import { UiText } from '@/shared/ui/UiText';

import type { WordState } from '../player-view';

export type AyahWord = { text: string; state: WordState };

// Amiri Quran at 25 pt with a 2.1 line height. The quranReading token is 27 pt, so scale it to 25; the line
// height follows the token's ratio. The Quran text is never truncated and never scales with the system size.
const AYAH_FONT_SCALE = 25 / 27;

// The ayah card while playing: words recited, the current word and the words still to come, each in its own
// player token. The ayah text is the stored Uthmani text, unchanged. Hidden until audio-to-ayah timings exist.
export function NowPlayingAyah({ words, counter, label }: { words: AyahWord[]; counter: string; label: string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        alignSelf: 'stretch',
        borderColor: theme.colors.playerLine,
        borderRadius: theme.radius.lg,
        borderWidth: theme.stroke.hairline,
        gap: 6,
        paddingHorizontal: theme.space[4],
        paddingVertical: 14,
      }}
      testID="now-playing-ayah"
    >
      <QuranText accessibilityLabel={label} align="center" fontScale={AYAH_FONT_SCALE} variant="quranReading">
        {words.map((word, index) => (
          <Text key={index} style={{ color: colorFor(word.state, theme) }}>
            {index > 0 ? ' ' : ''}
            {word.text}
          </Text>
        ))}
      </QuranText>
      <UiText style={{ color: theme.colors.playerMuted }} testID="now-playing-counter" variant="label" weight={400}>
        {counter}
      </UiText>
    </View>
  );
}

function colorFor(state: WordState, theme: ReturnType<typeof useTheme>): string {
  if (state === 'recited') {
    return theme.colors.playerInk;
  }
  return state === 'current' ? theme.colors.playerAccent : theme.colors.playerMuted;
}
