import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatHadithNumber } from '../format';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { Icon, UiText, useContrastColors } from '@/shared/ui';

import { bookTitle, collectionTitle } from '../titles';

import type { CollectionRowData } from './CollectionRow';
import { HadithMeta } from './HadithMeta';
import { HadithText } from './HadithText';

const BOOKMARK_FILLED = { ios: 'bookmark.fill', android: 'bookmark_added' } as const;

export type SavedHadithRowData = {
  collection: Pick<CollectionRowData, 'number' | 'titleAr' | 'titleEn'>;
  book: { bookNumber: string; titleAr: string | null; titleEn: string | null } | null;
  hadithNumber: string | null; // null when unverified
  textAr: string | null; // null when unverified: no preview
  unverified: boolean;
};

/**
 * A saved hadith. A verified item shows its meta line and a preview. An unverified one (the source changed) shows
 * the book only, with no number and no text, so nothing unverified is presented as the hadith.
 */
export function SavedHadithRow({
  saved,
  onPress,
  testID = 'saved-hadith-row',
}: {
  saved: SavedHadithRowData;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const colors = useContrastColors();
  const collection = collectionTitle(saved.collection, locale, t);
  const book = saved.book ? bookTitle(saved.book, locale, t) : null;
  const bookText = book ?? collection;
  const trailing = (
    <Icon color={theme.colors.brand} name={BOOKMARK_FILLED} size={theme.size.iconLg} testID={`${testID}-glyph`} />
  );

  const rowStyle = {
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: colors.line,
    borderRadius: theme.radius.lg,
    borderWidth: theme.stroke.hairline,
    flexDirection: 'row',
    gap: theme.space[3],
    padding: theme.space[4],
  } as const;

  if (saved.unverified || saved.hadithNumber === null) {
    const unverified = t('hadith.saved.unverified');
    const previous = t('hadith.saved.previouslySaved');
    return (
      <Pressable
        accessibilityLabel={`${bookText}, ${unverified}, ${previous}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({ ...rowStyle, opacity: pressed ? theme.opacity.pressed : 1 })}
        testID={testID}
      >
        <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
            <UiText testID={`${testID}-book`} variant="subhead">
              {bookText}
            </UiText>
            <View
              style={{
                backgroundColor: theme.colors.fillSecondary,
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 2,
              }}
            >
              <UiText testID={`${testID}-unverified`} variant="label" weight={600}>
                {unverified}
              </UiText>
            </View>
          </View>
          <UiText testID={`${testID}-previously`} tone="muted" variant="subhead">
            {previous}
          </UiText>
        </View>
        {trailing}
      </Pressable>
    );
  }

  const number = formatHadithNumber(saved.hadithNumber, locale);
  const meta = [collection, book, number].filter((part): part is string => part !== null && part !== '').join(', ');
  return (
    <Pressable
      accessibilityLabel={`${meta}, ${saved.textAr ?? ''}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ ...rowStyle, opacity: pressed ? theme.opacity.pressed : 1 })}
      testID={testID}
    >
      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        <HadithMeta bookTitle={book} collectionTitle={collection} hadithNumber={saved.hadithNumber} testID={`${testID}-meta`} />
        <HadithText numberOfLines={2} testID={`${testID}-text`} text={saved.textAr ?? ''} variant="preview" />
      </View>
      {trailing}
    </Pressable>
  );
}
