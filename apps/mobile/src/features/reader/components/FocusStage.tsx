import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  I18nManager,
  ScrollView,
  View,
  type HostInstance,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { GestureDetector, GestureHandlerRootView, useNativeGesture, usePanGesture } from 'react-native-gesture-handler';
import Animated, { LayoutAnimationConfig, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { screenInsetsFor, type ScreenInsets } from '@/core/layout/useScreenInsets';
import { useIsShortWindow } from '@/core/layout/useWindowClass';
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

const PAGE_GUTTER = 28;
// A vertical swipe covers this much height to turn the page, or is a flick of this speed over the minimum travel.
export const FOCUS_SWIPE_DISTANCE = 60;
export const FOCUS_SWIPE_FLICK = 600;
export const FOCUS_SWIPE_MIN_TRAVEL = 16;

export type FocusSwipe = { translationY: number; velocityY: number };
export type FocusEdges = { atStart: boolean; atEnd: boolean };

/**
 * A vertical swipe turns the page: up to the next ayah, down to the previous one. A scrolled ayah (a long one in a short
 * window) turns only from its own edge, so the swipe never fights its scroll.
 */
export function focusSwipeTurn(swipe: FocusSwipe, edges: FocusEdges): 'next' | 'previous' | null {
  const { translationY: y, velocityY: v } = swipe;
  if (y <= -FOCUS_SWIPE_MIN_TRAVEL && (y <= -FOCUS_SWIPE_DISTANCE || v <= -FOCUS_SWIPE_FLICK)) {
    return edges.atEnd ? 'next' : null;
  }
  if (y >= FOCUS_SWIPE_MIN_TRAVEL && (y >= FOCUS_SWIPE_DISTANCE || v >= FOCUS_SWIPE_FLICK)) {
    return edges.atStart ? 'previous' : null;
  }
  return null;
}

const NO_INSETS = { bottom: 0, left: 0, right: 0, top: 0 };

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
  /** A swipe began, or a scroll: the reader is moving by hand, so following pauses. */
  onDragStart?: () => void;
  /** The swipe or scroll ended. */
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
  const short = useIsShortWindow();
  // The side insets (a camera cutout in landscape) keep the stage, the progress marks and the transport clear.
  const insets: ScreenInsets = screenInsetsFor(
    useContext(SafeAreaInsetsContext) ?? NO_INSETS,
    I18nManager.isRTL,
  );
  const direction = useSharedValue<FocusTurnDirection>(1);
  const turn = useMemo(() => focusTurnAnimations(direction, reduceMotion), [direction, reduceMotion]);

  // The stage's scroll view starts at its top for each ayah (a turn remounts it), so the offset restarts there.
  // The scroll's content child (contentRef) holds the ayah and its neighbours, at the scroll content's top, so the
  // followed Text is measured inside it and its screen top is that offset minus the tracked scroll offset.
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollOffset = useRef(0);
  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);
  const contentRef = useRef<HostInstance>(null);
  // The viewport's height, as state, so the ayah can fit it once it is measured.
  const [viewport, setViewport] = useState(0);
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

  // Runs on the JS thread once the swipe is released. The edges are read from the tracked scroll state.
  const finishSwipe = (translationY: number, velocityY: number) => {
    const maxOffset = Math.max(0, contentHeight.current - viewportHeight.current);
    const way = focusSwipeTurn(
      { translationY, velocityY },
      { atEnd: scrollOffset.current >= maxOffset - 1, atStart: scrollOffset.current <= 1 },
    );
    if (way !== null) {
      go(way);
    }
  };
  // Only a mostly vertical drag starts the swipe; a horizontal one (the progress marks) fails it.
  const swipe = usePanGesture({
    activeOffsetY: [-10, 10],
    failOffsetX: [-20, 20],
    onDeactivate: (event) => {
      'worklet';
      scheduleOnRN(finishSwipe, event.translationY, event.velocityY);
    },
  });
  // The scroll's native gesture runs alongside the swipe, so a drag that scrolls a long ayah also counts as a swipe
  // only at the scroll's edge.
  const scrollGesture = useNativeGesture({ simultaneousWith: swipe });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <View style={{ flex: 1, paddingBottom: theme.space[8], paddingTop: topInset }} testID={testID}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <FocusProgress onSelect={onSelectVerse === undefined ? undefined : selectPage} verseNumber={verseNumber} versesCount={versesCount} />
        {/* The ayah shown when Focus opens is already in place; only a turn animates. */}
        <LayoutAnimationConfig skipEntering>
          <Animated.View entering={turn.entering} exiting={turn.exiting} key={verseNumber} style={{ flex: 1 }}>
            <GestureDetector gesture={swipe}>
              <View
                {...word.viewportProps}
                accessibilityHint={short ? t('reader.focus.nextHint') : undefined}
                onLayout={(event) => {
                  word.viewportProps.onLayout(event);
                  viewportHeight.current = event.nativeEvent.layout.height;
                  setViewport(event.nativeEvent.layout.height);
                }}
                style={{ flex: 1, paddingEnd: insets.end, paddingStart: insets.start }}
                testID={`${testID}-viewport`}
              >
                <GestureDetector gesture={scrollGesture}>
                  <ScrollView
                    alwaysBounceVertical
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: PAGE_GUTTER }}
                    onContentSizeChange={(_width, height) => {
                      contentHeight.current = height;
                    }}
                    onScroll={(event) => {
                      scrollOffset.current = event.nativeEvent.contentOffset.y;
                    }}
                    onScrollBeginDrag={onDragStart}
                    onScrollEndDrag={() => onDragFinish?.()}
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
                      {/* A short window has no room for the neighbours: only the current ayah is drawn. */}
                      {!short && previousText !== null && previousNumber !== null ? (
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
                        fitHeight={viewport > 0 ? viewport - theme.space[4] * 2 : undefined}
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
                      {!short && nextText !== null && nextNumber !== null ? (
                        <FocusAside fontScale={fontScale} testID={`${testID}-next`} textUthmani={nextText} verseNumber={nextNumber} />
                      ) : (
                        <View />
                      )}
                    </View>
                  </ScrollView>
                </GestureDetector>
              </View>
            </GestureDetector>
          </Animated.View>
        </LayoutAnimationConfig>
      </View>
      {short ? null : (
        <UiText align="center" style={{ marginBottom: theme.size.focusHintGap }} tone="muted" variant="label" weight={400}>
          {t('reader.focus.nextHint')}
        </UiText>
      )}
      <View style={{ paddingEnd: insets.end, paddingStart: insets.start }} testID={`${testID}-transport`}>
        <FocusTransport
          onNext={onNext === undefined ? undefined : () => go('next')}
          onPlay={onPlay}
          onPrevious={onPrevious === undefined ? undefined : () => go('previous')}
          playing={playing}
          repeatTarget={repeatTarget}
        />
      </View>
    </View>
    </GestureHandlerRootView>
  );
}
