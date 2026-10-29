import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  View,
  type HostInstance,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';
import Animated, { LayoutAnimationConfig, useReducedMotion, useSharedValue } from 'react-native-reanimated';

import { useTheme } from '@/core/theme';
import { UiText, type HighlightColor } from '@/shared/ui';

import { focusTurnAnimations, type FocusTurnDirection } from '../focus-turn';
import { followedTextScreenTop } from '../follow-position';
import { measureWithin } from '../measure-within';
import { recitedWordOffset } from '../word-follow';
import { useWordFollow } from '../useWordFollow';
import { FocusAside } from './FocusAside';
import { FocusAyah } from './FocusAyah';
import { FocusProgress } from './FocusProgress';
import { FocusTransport, type RepeatTarget } from './FocusTransport';

const PULL = 36;
const PAGE_GUTTER = 28;

type PageDrag = {
  contentOffset: { y: number };
  contentSize: { height: number };
  layoutMeasurement: { height: number };
  velocity?: { y: number } | null;
};

/** A pull past the ayah, or a flick while already at that edge, turns the page. */
export function focusPageFromDrag(event: PageDrag): 'next' | 'previous' | null {
  const maxOffset = Math.max(0, event.contentSize.height - event.layoutMeasurement.height);
  const offset = event.contentOffset.y;
  const velocity = event.velocity?.y ?? 0;
  if (offset > maxOffset + PULL || (velocity < -0.25 && offset >= maxOffset - 1)) {
    return 'next';
  }
  if (offset < -PULL || (velocity > 0.25 && offset <= 1)) {
    return 'previous';
  }
  return null;
}

export function FocusStage({
  verseNumber,
  versesCount,
  textUthmani,
  textImlaei,
  previousText,
  previousNumber,
  nextText,
  nextNumber,
  fontScale = 1,
  highlightColor = null,
  recited = false,
  activeWord = null,
  following = false,
  playing = false,
  onPlay,
  onDragStart,
  onDragFinish,
  topInset = 0,
  onPrevious,
  onNext,
  onSelectVerse,
  onOpenActions,
  repeatTarget = null,
  testID = 'focus-stage',
}: {
  verseNumber: number;
  versesCount: number;
  textUthmani: string;
  textImlaei: string | null;
  previousText: string | null;
  previousNumber: number | null;
  nextText: string | null;
  nextNumber: number | null;
  fontScale?: number;
  /** The focused ayah and its surah, for the repeat control. */
  repeatTarget?: RepeatTarget | null;
  /** The reader's saved highlight for the current ayah. */
  highlightColor?: HighlightColor | null;
  /** The current ayah is the one being recited, and its recited word. */
  recited?: boolean;
  activeWord?: number | null;
  /** The reader follows the recitation: the recited word's line is kept in the stage's comfort band. */
  following?: boolean;
  /** Whether the player is playing, so the play control shows pause. */
  playing?: boolean;
  onPlay?: () => void;
  /** A swipe began: the reader is moving by hand, so following pauses. */
  onDragStart?: () => void;
  /** The swipe ended. */
  onDragFinish?: () => void;
  /** Room for FocusChrome, which floats over the top of Focus. */
  topInset?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  onSelectVerse?: (verseNumber: number) => void;
  onOpenActions?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const direction = useSharedValue<FocusTurnDirection>(1);
  const turn = useMemo(() => focusTurnAnimations(direction, reduceMotion), [direction, reduceMotion]);

  // The stage's scroll view starts at its top for each ayah (a turn remounts it), so the offset restarts there.
  // The scroll's content child (contentRef) holds the ayah and its neighbours, at the scroll content's top, so the
  // followed Text is measured inside it and its screen top is that offset minus the tracked scroll offset.
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollOffset = useRef(0);
  const contentRef = useRef<HostInstance>(null);
  useEffect(() => {
    scrollOffset.current = 0;
  }, [verseNumber]);
  const word = useWordFollow({
    bottomInset: 0,
    currentOffset: () => scrollOffset.current,
    fallbackHeight: 0,
    following,
    measureTextTop: (text, done) => {
      const content = contentRef.current;
      if (content === null) {
        done(null);
        return;
      }
      measureWithin(text, content, (textTopInContent) => {
        done(
          textTopInContent === null
            ? null
            : followedTextScreenTop({ rowTop: 0, scrollOffset: scrollOffset.current, textTopInRow: textTopInContent }),
        );
      });
    },
    offset: recited && activeWord !== null ? recitedWordOffset(textUthmani, activeWord) : null,
    reduceMotion,
    scrollTo: (offset, animated) => {
      scrollOffset.current = offset;
      scrollRef.current?.scrollTo({ animated, y: offset });
    },
    textKey: String(verseNumber),
  });

  const turnTo = (way: 'next' | 'previous', move: () => void) => {
    direction.set(way === 'next' ? 1 : -1);
    move();
  };

  const go = (way: 'next' | 'previous') => {
    const move = way === 'next' ? onNext : onPrevious;
    if (move !== undefined) {
      turnTo(way, move);
    }
  };

  const selectPage = (number: number) => {
    if (onSelectVerse === undefined || number === verseNumber) {
      return;
    }
    turnTo(number > verseNumber ? 'next' : 'previous', () => onSelectVerse(number));
  };

  const onDragEnd = (event: NativeSyntheticEvent<PageDrag>) => {
    onDragFinish?.();
    const way = focusPageFromDrag(event.nativeEvent);
    if (way !== null) {
      go(way);
    }
  };

  return (
    <View style={{ flex: 1, paddingBottom: theme.space[8], paddingTop: topInset }} testID={testID}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <FocusProgress onSelect={onSelectVerse === undefined ? undefined : selectPage} verseNumber={verseNumber} versesCount={versesCount} />
        {/* The ayah shown when Focus opens is already in place; only a turn animates. */}
        <LayoutAnimationConfig skipEntering>
          <Animated.View entering={turn.entering} exiting={turn.exiting} key={verseNumber} style={{ flex: 1 }}>
            <View {...word.viewportProps} style={{ flex: 1 }}>
              <ScrollView
                alwaysBounceVertical
                contentContainerStyle={{ flexGrow: 1, paddingHorizontal: PAGE_GUTTER }}
                onScroll={(event) => {
                  scrollOffset.current = event.nativeEvent.contentOffset.y;
                }}
                onScrollBeginDrag={onDragStart}
                onScrollEndDrag={onDragEnd}
                ref={scrollRef}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                testID={`${testID}-scroll`}
              >
                {/* The content child: it fills the scroll content from its top, so the spacing lives here. */}
                <View
                  ref={contentRef}
                  style={{ flex: 1, justifyContent: 'space-evenly', paddingVertical: theme.space[4] }}
                >
                  {previousText !== null && previousNumber !== null ? (
                    <FocusAside
                      fontScale={fontScale}
                      testID={`${testID}-previous`}
                      textUthmani={previousText}
                      verseNumber={previousNumber}
                    />
                  ) : (
                    <View />
                  )}
                  <FocusAyah
                    activeWord={activeWord}
                    followedText={word.textProps(String(verseNumber))}
                    fontScale={fontScale}
                    highlightColor={highlightColor}
                    recited={recited}
                    onOpenActions={onOpenActions}
                    testID={testID}
                    textImlaei={textImlaei}
                    textUthmani={textUthmani}
                    verseNumber={verseNumber}
                  />
                  {nextText !== null && nextNumber !== null ? (
                    <FocusAside fontScale={fontScale} testID={`${testID}-next`} textUthmani={nextText} verseNumber={nextNumber} />
                  ) : (
                    <View />
                  )}
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </LayoutAnimationConfig>
      </View>
      <UiText align="center" style={{ marginBottom: theme.size.focusHintGap }} tone="muted" variant="label" weight={400}>
        {t('reader.focus.nextHint')}
      </UiText>
      <FocusTransport
        onNext={onNext === undefined ? undefined : () => go('next')}
        onPlay={onPlay}
        onPrevious={onPrevious === undefined ? undefined : () => go('previous')}
        playing={playing}
        repeatTarget={repeatTarget}
      />
    </View>
  );
}
