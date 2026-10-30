import { useRef, useState } from 'react';
import { Text, View, type ScrollViewInstance } from 'react-native';

import { useTheme } from '@/core/theme';
import { QuranText } from '@/shared/ui/QuranText';
import { UiText } from '@/shared/ui/UiText';

import { useAyahCardFollow } from '../hooks/useAyahCardFollow';
import type { WordState } from '../player-view';
import { AyahScrollView } from './AyahScrollView';

export type AyahWord = { text: string; state: WordState };

// Amiri Quran at 25 pt with a 2.1 line height. The quranReading token is 27 pt, so scale it to 25; the line
// height follows the token's ratio. The Quran text is never truncated and never scales with the system size.
const AYAH_FONT_SCALE = 25 / 27;
const CARD_PADDING_VERTICAL = 14;
const CARD_GAP = 6;

/**
 * The ayah card while playing: words recited, the current word and the words still to come, each in its own
 * player token. The ayah text is the stored Uthmani text, unchanged. Hidden until audio-to-ayah timings exist.
 *
 * With `height` (the room the column gives the card) the card is that tall: its text scrolls inside it when the text
 * is taller, and a shorter text sits centred. The counter stays pinned below. Without `height` the card is as tall as
 * its text. While `playing` and the text scrolls, the text follows the recited word's line (useAyahCardFollow).
 */
export function NowPlayingAyah({
  words,
  counter,
  label,
  activeWord = null,
  playing = false,
  height,
}: {
  words: AyahWord[];
  counter: string;
  label: string;
  /** The engine's 1-based word position, or null before the first word. */
  activeWord?: number | null;
  playing?: boolean;
  /** The card's height in its column, when the column gives it one. Unset, the card is as tall as its text. */
  height?: number;
}) {
  const theme = useTheme();
  const [textHeight, setTextHeight] = useState<number | null>(null);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const text = words.map((word) => word.text).join(' ');

  // The text scrolls when it is taller than the scroll view it sits in.
  const scrollable = textHeight !== null && viewportHeight !== null && textHeight > viewportHeight;

  const scrollRef = useRef<ScrollViewInstance>(null);
  const follow = useAyahCardFollow({ activeWord, label, playing, scrollable, scrollRef, text });

  return (
    <View
      style={[
        {
          alignItems: 'center',
          alignSelf: 'stretch',
          borderColor: theme.colors.playerLine,
          borderRadius: theme.radius.lg,
          borderWidth: theme.stroke.hairline,
          gap: CARD_GAP,
          paddingHorizontal: theme.space[4],
          paddingVertical: CARD_PADDING_VERTICAL,
        },
        height === undefined ? null : { height },
      ]}
      testID="now-playing-ayah"
    >
      <AyahScrollView
        contentContainerStyle={{ alignItems: 'center', flexGrow: 1, justifyContent: 'center' }}
        onLayout={(event) => {
          follow.onViewportLayout(event);
          setViewportHeight(event.nativeEvent.layout.height);
        }}
        onScroll={follow.onScroll}
        onScrollBeginDrag={follow.onScrollBeginDrag}
        onScrollEndDrag={follow.onScrollEndDrag}
        ref={scrollRef}
        showsVerticalScrollIndicator={scrollable}
        style={[
          { alignSelf: 'stretch', flexGrow: 0, flexShrink: 0 },
          height === undefined ? null : { flexBasis: 0, flexGrow: 1, flexShrink: 1 },
        ]}
        testID="now-playing-scroll"
      >
        <QuranText
          accessibilityLabel={label}
          align="center"
          fontScale={AYAH_FONT_SCALE}
          onLayout={(event) => setTextHeight(event.nativeEvent.layout.height)}
          onTextLayout={follow.onTextLayout}
          variant="quranReading"
        >
          {words.map((word, index) => (
            <Text key={index} style={{ color: colorFor(word.state, theme) }}>
              {index > 0 ? ' ' : ''}
              {word.text}
            </Text>
          ))}
        </QuranText>
      </AyahScrollView>
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
