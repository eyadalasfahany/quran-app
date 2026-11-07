import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

import { collectionTitle } from '../titles';
import type { HadithListItem, HadithSearchHit, HadithTextRange } from '../types';
import { hadithNumberText } from '../number-text';

import { HadithMeta } from './HadithMeta';
import { formatHadithNumber } from '../format';

// Merged-number bounds (step 6b). Read as optional: until the search query returns them, the plain number is shown.
type WithBounds = HadithListItem & { numberFirst?: string | null; numberLast?: string | null };

// Frame HadithCollSearchResults: the preview at 19 over 36 (see HadithText for the reason).
const HADITH_PREVIEW_LINE_HEIGHT = 36;
const PREVIEW_FONT_SIZE = 19;
const PREVIEW_LINES = 2;
const TEXT_DIRECTION = { textAlign: 'justify', writingDirection: 'rtl' } as const;

type Segment = { text: string; match: boolean };

/**
 * Splits the text at the ranges, by position. Ranges are clamped to the text, and a range that overlaps an earlier one
 * or is empty is skipped. The segments always join back into the exact original string.
 */
function splitAtRanges(text: string, ranges: readonly HadithTextRange[]): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  for (const range of sorted) {
    const start = Math.min(Math.max(range.start, 0), text.length);
    const end = Math.min(Math.max(range.end, 0), text.length);
    if (end <= start || start < cursor) {
      continue;
    }
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), match: false });
    }
    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false });
  }
  return segments;
}

/** A search hit: the preview with its matches filled, and the meta line under it. */
export function HadithSearchResultRow({
  hit,
  bookTitleText,
  onPress,
  testID = 'hadith-search-result-row',
}: {
  hit: Pick<HadithSearchHit, 'item' | 'collection' | 'ranges'>;
  /** The book title, resolved by the screen. */
  bookTitleText: string;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const colors = useContrastColors();
  const collection = collectionTitle(hit.collection, locale, t);
  const text = hit.item.textAr;
  const bounds = hit.item as WithBounds;
  const numberLabel = hadithNumberText({
    hadithNumber: hit.item.hadithNumber,
    numberFirst: bounds.numberFirst,
    numberLast: bounds.numberLast,
  });
  const meta = [collection, bookTitleText, formatHadithNumber(numberLabel, locale)].join(', ');

  return (
    <Pressable
      accessibilityLabel={`${meta}, ${text}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.lg,
        borderWidth: theme.stroke.hairline,
        gap: 6,
        opacity: pressed ? theme.opacity.pressed : 1,
        padding: theme.space[4],
      })}
      testID={testID}
    >
      <UiText
        numberOfLines={PREVIEW_LINES}
        style={{ fontSize: PREVIEW_FONT_SIZE, lineHeight: HADITH_PREVIEW_LINE_HEIGHT, ...TEXT_DIRECTION }}
        testID={`${testID}-text`}
        variant="dhikrList"
      >
        {splitAtRanges(text, hit.ranges).map((segment, index) =>
          segment.match ? (
            <Text key={index} style={{ backgroundColor: theme.colors.highlightGold, color: colors.ink }}>
              {segment.text}
            </Text>
          ) : (
            segment.text
          ),
        )}
      </UiText>
      <HadithMeta bookTitle={bookTitleText} collectionTitle={collection} hadithNumber={numberLabel} testID={`${testID}-meta`} />
    </Pressable>
  );
}
