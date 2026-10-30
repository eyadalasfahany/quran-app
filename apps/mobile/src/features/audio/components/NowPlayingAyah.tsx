import { useEffect, useRef, useState } from 'react';
import { Text, View, type ScrollViewInstance } from 'react-native';

import { useTheme } from '@/core/theme';
import { QuranText } from '@/shared/ui/QuranText';
import { UiText } from '@/shared/ui/UiText';

import { useAyahCardFollow } from '../hooks/useAyahCardFollow';
import { AYAH_CARD_MIN_HEIGHT } from '../player-fit';
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
 * The card is as tall as its text unless `maxHeight` (the room the column leaves it) is smaller; then it fills that
 * room and its text scrolls inside it, while the counter stays pinned below. While `playing`, the text scrolls to
 * keep the recited word's line in view (useAyahCardFollow).
 */
export function NowPlayingAyah({
  words,
  counter,
  label,
  activeWord = null,
  playing = false,
  maxHeight,
  onNaturalHeight,
}: {
  words: AyahWord[];
  counter: string;
  label: string;
  /** The engine's 1-based word position, or null before the first word. */
  activeWord?: number | null;
  playing?: boolean;
  /** The height left for the card in its column, when the column is measured. */
  maxHeight?: number;
  /** Reports the card's height at its natural size (null until its text and counter are measured). */
  onNaturalHeight?: (height: number | null) => void;
}) {
  const theme = useTheme();
  const [textHeight, setTextHeight] = useState<number | null>(null);
  const [counterHeight, setCounterHeight] = useState<number | null>(null);
  const text = words.map((word) => word.text).join(' ');

  // The natural height comes from the text and the counter, which are measured whatever the card's size.
  const chrome = 2 * CARD_PADDING_VERTICAL + 2 * theme.stroke.hairline + CARD_GAP;
  const natural = textHeight === null || counterHeight === null ? null : chrome + textHeight + counterHeight;
  const fill = natural !== null && maxHeight !== undefined && natural > maxHeight;

  useEffect(() => {
    onNaturalHeight?.(natural);
  }, [natural, onNaturalHeight]);

  const scrollRef = useRef<ScrollViewInstance>(null);
  const follow = useAyahCardFollow({ activeWord, label, playing, scrollable: fill, scrollRef, text });

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
        fill ? { flexGrow: 1, flexShrink: 1, minHeight: AYAH_CARD_MIN_HEIGHT } : null,
      ]}
      testID="now-playing-ayah"
    >
      <AyahScrollView
        contentContainerStyle={{ alignItems: 'center' }}
        onLayout={follow.onViewportLayout}
        onScroll={follow.onScroll}
        onScrollBeginDrag={follow.onScrollBeginDrag}
        onScrollEndDrag={follow.onScrollEndDrag}
        ref={scrollRef}
        showsVerticalScrollIndicator={fill}
        style={[{ alignSelf: 'stretch', flexGrow: 0, flexShrink: 0 }, fill ? { flexBasis: 0, flexGrow: 1, flexShrink: 1 } : null]}
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
      <UiText
        onLayout={(event) => setCounterHeight(event.nativeEvent.layout.height)}
        style={{ color: theme.colors.playerMuted }}
        testID="now-playing-counter"
        variant="label"
        weight={400}
      >
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
