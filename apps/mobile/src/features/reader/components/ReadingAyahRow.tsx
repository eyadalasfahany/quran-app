import { useTranslation } from 'react-i18next';
import { Pressable, View, type HostInstance } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { Divider, highlightFill, useContrastColors, type HighlightColor } from '@/shared/ui';

import type { FollowedTextProps } from '../useWordFollow';
import { ReadingAyahHeader } from './ReadingAyahHeader';
import { RecitedQuranText } from './RecitedQuranText';

// The frame's article padding: 14 above the header, 16 above the hairline.
const ROW_PADDING_TOP = 14;

export function ReadingAyahRow({
  verseNumber,
  textUthmani,
  textImlaei,
  fontScale = 1,
  selected = false,
  recited = false,
  activeWord = null,
  audioAvailable = false,
  highlightColor = null,
  onPress,
  onLongPress,
  onOpenActions,
  onOpenTafsir,
  onPlay,
  followedText,
  rowRef,
  testID,
}: {
  verseNumber: number;
  textUthmani: string;
  textImlaei: string | null;
  fontScale?: number;
  selected?: boolean;
  /** The ayah the player is reciting: the neutral wash, the brand marker and rule (ADR 0012). */
  recited?: boolean;
  /** The recited word (1-based), when the ayah has word segments. */
  activeWord?: number | null;
  audioAvailable?: boolean;
  highlightColor?: HighlightColor | null;
  onPress?: () => void;
  onLongPress?: () => void;
  onOpenActions?: () => void;
  onOpenTafsir?: () => void;
  onPlay?: () => void;
  /** Set on the row the reader follows: its Text reports its lines for the word follow-scroll. */
  followedText?: FollowedTextProps;
  /** Set on the row the reader follows: the word follow-scroll measures the Text inside this row. */
  rowRef?: (node: HostInstance | null) => void;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const active = selected || recited;
  const labelText = textImlaei ?? textUthmani;
  const ayahLabel = t('ui.ayahNumber', { number: formatNumber(verseNumber, locale) });
  const accessibilityLabel =
    highlightColor === null
      ? `${labelText} ${ayahLabel}`
      : `${labelText} ${ayahLabel} ${t(`ui.highlight.${highlightColor}`)}`;

  // The user's colour wins the fill; the selection wash shows only on an ayah without one (ADR 0012).
  const quranBackground = highlightFill(colors, highlightColor) ?? (active ? colors.highlightActive : 'transparent');

  // The header's buttons sit outside the text's Pressable, so each one stays reachable by screen readers.
  return (
    <View ref={rowRef} style={{ gap: theme.space[2], paddingTop: ROW_PADDING_TOP }}>
      <ReadingAyahHeader
        active={active}
        audioAvailable={audioAvailable}
        fontScale={fontScale}
        onOpenActions={onOpenActions}
        onOpenTafsir={onOpenTafsir}
        onPlay={onPlay}
        testID={testID ? `${testID}-header` : undefined}
        verseNumber={verseNumber}
      />
      <Pressable
        accessibilityHint={recited ? t('player.nowPlaying') : undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onLongPress={onLongPress}
        onPress={onPress}
        testID={testID}
      >
        <View
          style={{
            backgroundColor: quranBackground,
            borderRadius: theme.radius.sm,
            borderStartColor: active ? colors.brand : 'transparent',
            borderStartWidth: active ? theme.stroke.activeRule : 0,
            paddingHorizontal: theme.space[1],
            paddingVertical: theme.space[1],
          }}
        >
          <RecitedQuranText
            {...followedText}
            activeWord={recited ? activeWord : null}
            fontScale={fontScale}
            text={textUthmani}
            variant="quranReading"
          />
        </View>
      </Pressable>
      <Divider style={{ marginTop: theme.space[4] }} testID={testID ? `${testID}-divider` : undefined} />
    </View>
  );
}
