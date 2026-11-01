import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type LayoutChangeEvent } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useIsShortWindow } from '@/core/layout/useWindowClass';
import { useTheme } from '@/core/theme';
import { AyahMarker, highlightFill, useContrastColors, type HighlightColor } from '@/shared/ui';

import type { FollowedTextProps } from '../useWordFollow';
import { RecitedQuranText } from './RecitedQuranText';

// The Focus ayah shrinks to fit its stage. Its font factor steps down by FOCUS_FIT_STEP and never goes below
// FOCUS_FIT_MIN, so the smallest size is 60% of the reader's size (22.8 pt at the default 38 pt). A longer ayah than
// that scrolls in the stage instead.
export const FOCUS_FIT_MIN = 0.6;
export const FOCUS_FIT_STEP = 0.05;
// In a short window the ayah-number ornament is drawn at this share of its size.
const SHORT_MARKER_SCALE = 0.7;

/**
 * The next font factor for an ayah block measured at `measuredHeight` against `availableHeight`. A block that fits keeps
 * its factor. One that does not shrinks by at least one step, or straight to the size its height suggests, and never
 * below FOCUS_FIT_MIN.
 */
export function nextFocusFit(fit: number, measuredHeight: number, availableHeight: number): number {
  if (!(availableHeight > 0) || !(measuredHeight > 0) || measuredHeight <= availableHeight) {
    return fit;
  }
  const proportional = fit * (availableHeight / measuredHeight);
  const next = Math.max(FOCUS_FIT_MIN, Math.min(fit - FOCUS_FIT_STEP, proportional));
  return Math.round(next * 100) / 100;
}

// The current ayah of the Focus frame: centred Quran text over its active marker.
export function FocusAyah({
  verseNumber,
  textUthmani,
  textImlaei,
  fontScale = 1,
  fitHeight,
  highlightColor = null,
  recited = false,
  activeWord = null,
  onOpenActions,
  followedText,
  testID = 'focus-ayah',
}: {
  verseNumber: number;
  textUthmani: string;
  textImlaei: string | null;
  fontScale?: number;
  /** The height the ayah block must fit in (the stage). Undefined keeps the reader's size. */
  fitHeight?: number;
  highlightColor?: HighlightColor | null;
  /** The ayah the player is reciting: the neutral wash and the brand marker (ADR 0012). */
  recited?: boolean;
  /** The recited word (1-based), when the ayah has word segments. */
  activeWord?: number | null;
  onOpenActions?: () => void;
  /** The word follow-scroll's Text props, while Focus follows the recitation. */
  followedText?: FollowedTextProps;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const short = useIsShortWindow();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const labelText = textImlaei ?? textUthmani;
  const ayahLabel = t('ui.ayahNumber', { number: formatNumber(verseNumber, locale) });
  const accessibilityLabel =
    highlightColor === null
      ? `${labelText} ${ayahLabel}`
      : `${labelText} ${ayahLabel} ${t(`ui.highlight.${highlightColor}`)}`;
  // The user's colour fills the ayah; the recitation's wash shows only without one (ADR 0012).
  const background = highlightFill(colors, highlightColor) ?? (recited ? colors.highlightActive : undefined);

  // The fit is kept per budget (the stage's height and this block's width). A new budget starts at full size, and the
  // block's measured height then steps it down.
  const [width, setWidth] = useState(0);
  const [fitState, setFitState] = useState({ key: '', value: 1 });
  const budget = `${fitHeight ?? 'none'}:${width}`;
  const fit = fitHeight === undefined || fitState.key !== budget ? 1 : fitState.value;

  const onBlockLayout = (event: LayoutChangeEvent) => {
    const { height, width: laidOutWidth } = event.nativeEvent.layout;
    setWidth(laidOutWidth);
    if (fitHeight === undefined) {
      return;
    }
    const key = `${fitHeight}:${laidOutWidth}`;
    setFitState((previous) => {
      const base = previous.key === key ? previous.value : 1;
      return { key, value: nextFocusFit(base, height, fitHeight) };
    });
  };

  return (
    <View
      onLayout={onBlockLayout}
      style={{ alignItems: 'center', gap: short ? theme.space[2] : theme.space[4] }}
      testID={`${testID}-block`}
    >
      <RecitedQuranText
        {...followedText}
        accessibilityHint={recited ? t('player.nowPlaying') : undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="text"
        activeWord={recited ? activeWord : null}
        align="center"
        fontScale={fontScale * fit}
        style={background === undefined ? undefined : { backgroundColor: background }}
        testID={`${testID}-current`}
        text={textUthmani}
        variant="quranFocus"
        wordMotion="pill"
      />
      <AyahMarker
        active
        markerSize={short ? Math.round(theme.size.focusMarker * SHORT_MARKER_SCALE) : theme.size.focusMarker}
        number={verseNumber}
        onPress={onOpenActions}
        testID={`${testID}-marker`}
      />
    </View>
  );
}
