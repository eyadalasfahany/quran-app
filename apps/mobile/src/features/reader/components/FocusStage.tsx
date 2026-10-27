import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View, type NativeSyntheticEvent } from 'react-native';
import Animated, { LayoutAnimationConfig, useReducedMotion, useSharedValue } from 'react-native-reanimated';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { focusTurnAnimations, type FocusTurnDirection } from '../focus-turn';
import { FocusAside } from './FocusAside';
import { FocusAyah } from './FocusAyah';
import { FocusProgress } from './FocusProgress';
import { FocusTransport } from './FocusTransport';

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
  surahName,
  verseNumber,
  versesCount,
  textUthmani,
  textImlaei,
  previousText,
  previousNumber,
  nextText,
  nextNumber,
  fontScale = 1,
  topInset = 0,
  onPrevious,
  onNext,
  onSelectVerse,
  onOpenActions,
  testID = 'focus-stage',
}: {
  surahName: string;
  verseNumber: number;
  versesCount: number;
  textUthmani: string;
  textImlaei: string | null;
  previousText: string | null;
  previousNumber: number | null;
  nextText: string | null;
  nextNumber: number | null;
  fontScale?: number;
  /** Room for the reader toolbar, which floats over the top of Focus as it does over every mode. */
  topInset?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  onSelectVerse?: (verseNumber: number) => void;
  onOpenActions?: () => void;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const direction = useSharedValue<FocusTurnDirection>(1);
  const turn = useMemo(() => focusTurnAnimations(direction, reduceMotion), [direction, reduceMotion]);

  const position = t('reader.focus.position', {
    current: formatNumber(verseNumber, locale),
    surah: surahName,
    total: formatNumber(versesCount, locale),
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
    const way = focusPageFromDrag(event.nativeEvent);
    if (way !== null) {
      go(way);
    }
  };

  return (
    <View style={{ flex: 1, paddingBottom: theme.space[8], paddingTop: topInset }} testID={testID}>
      <UiText align="center" tone="muted" variant="caption">
        {position}
      </UiText>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <FocusProgress onSelect={onSelectVerse === undefined ? undefined : selectPage} verseNumber={verseNumber} versesCount={versesCount} />
        {/* The ayah shown when Focus opens is already in place; only a turn animates. */}
        <LayoutAnimationConfig skipEntering>
          <Animated.View entering={turn.entering} exiting={turn.exiting} key={verseNumber} style={{ flex: 1 }}>
            <ScrollView
              alwaysBounceVertical
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: 'space-evenly',
                paddingHorizontal: PAGE_GUTTER,
                paddingVertical: theme.space[4],
              }}
              onScrollEndDrag={onDragEnd}
              showsVerticalScrollIndicator={false}
              testID={`${testID}-scroll`}
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
                fontScale={fontScale}
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
            </ScrollView>
          </Animated.View>
        </LayoutAnimationConfig>
      </View>
      <UiText align="center" style={{ marginBottom: theme.space[3] }} tone="muted" variant="label">
        {t('reader.focus.nextHint')}
      </UiText>
      <FocusTransport onNext={onNext === undefined ? undefined : () => go('next')} onPrevious={onPrevious === undefined ? undefined : () => go('previous')} />
    </View>
  );
}
