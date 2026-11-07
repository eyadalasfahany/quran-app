import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { Icon, UiText, useContrastColors } from '@/shared/ui';

import { countHadith } from '../counts';
import { bookTitle } from '../titles';

import { HadithNumberBadge } from './HadithNumberBadge';

const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' } as const;
const CHEVRON_SIZE = 16;
const PADDING_Y = 10;
const PADDING_X = 16;
// Compact (the expanded start pane): 52 high, a 17 point title and a 12 point count.
const COMPACT_MIN_HEIGHT = 52;
const COMPACT_TITLE = { fontSize: 17, lineHeight: 30 } as const;
const DEFAULT_TITLE = { fontSize: 19, lineHeight: 33 } as const;

/** A book of a collection: a gold circle with the book number, the title, the hadith count and a chevron. */
export function BookRow({
  book,
  compact = false,
  selected = false,
  onPress,
  testID = 'book-row',
}: {
  book: { bookNumber: string; titleAr: string | null; titleEn: string | null; hadithCount: number };
  compact?: boolean;
  selected?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const colors = useContrastColors();
  const title = bookTitle(book, locale, t);
  const count = countHadith(book.hadithCount, locale, t);

  return (
    <Pressable
      accessibilityLabel={`${title}, ${count}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: selected ? theme.colors.glassSelected : theme.colors.surfaceRaised,
        borderRadius: theme.radius.lg,
        flexDirection: 'row',
        gap: compact ? 10 : 12,
        minHeight: compact ? COMPACT_MIN_HEIGHT : undefined,
        opacity: pressed ? theme.opacity.pressed : 1,
        paddingHorizontal: PADDING_X,
        paddingVertical: PADDING_Y,
      })}
      testID={testID}
    >
      <HadithNumberBadge number={book.bookNumber} size="circle" testID={`${testID}-badge`} />
      <UiText style={[{ flex: 1, minWidth: 0 }, compact ? COMPACT_TITLE : DEFAULT_TITLE]} testID={`${testID}-title`} variant="displaySm">
        {title}
      </UiText>
      {compact ? (
        <UiText style={{ flexShrink: 0 }} testID={`${testID}-count`} tone="muted" variant="label" weight={400}>
          {count}
        </UiText>
      ) : (
        <View style={{ alignItems: 'center', flexDirection: 'row', flexShrink: 0, gap: theme.space[2] }}>
          <UiText testID={`${testID}-count`} tone="muted" variant="caption">
            {count}
          </UiText>
          <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={CHEVRON_SIZE} testID={`${testID}-chevron`} />
        </View>
      )}
    </Pressable>
  );
}
