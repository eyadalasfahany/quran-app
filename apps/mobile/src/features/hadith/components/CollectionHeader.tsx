import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { CollectionCover, UiText } from '@/shared/ui';

import { collectionSummary } from '../counts';
import { collectionAuthor, collectionTitle, coverTitle } from '../titles';

import type { CollectionRowData } from './CollectionRow';

// The frames' gaps: 6 between the centred blocks, 2 between the inline text lines, 14 beside the cover.
const CENTRED_GAP = 6;
const INLINE_TEXT_GAP = 2;
const INLINE_GAP = 14;
const TITLE_SIZE_HEADER = 22;
const TITLE_LINE_HEIGHT_HEADER = 39;

/** The collection's identity block: the centred header of the collection screen, or the inline one for a single-book collection. */
export function CollectionHeader({
  collection,
  totalHadith,
  booksCount,
  soleBook,
  variant,
  testID = 'collection-header',
}: {
  collection: Pick<CollectionRowData, 'slug' | 'number' | 'titleAr' | 'titleEn' | 'authorAr' | 'authorEn'>;
  totalHadith: number;
  booksCount: number;
  soleBook: boolean;
  variant: 'centered' | 'inline';
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const title = collectionTitle(collection, locale, t);
  const author = collectionAuthor(collection, locale);
  const counts = collectionSummary(totalHadith, booksCount, soleBook, locale, t);
  const cover = (size: 'header' | 'compact') => (
    <CollectionCover size={size} slug={collection.slug} testID={`${testID}-cover`} title={coverTitle(collection, locale)} />
  );

  if (variant === 'inline') {
    return (
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: INLINE_GAP }} testID={testID}>
        {cover('compact')}
        <View style={{ flex: 1, gap: INLINE_TEXT_GAP, minWidth: 0 }}>
          <UiText
            accessibilityRole="header"
            style={{ fontSize: TITLE_SIZE_HEADER, lineHeight: TITLE_LINE_HEIGHT_HEADER }}
            testID={`${testID}-title`}
            variant="displaySm"
          >
            {title}
          </UiText>
          {author !== null ? (
            <UiText testID={`${testID}-author`} tone="muted" variant="subhead">
              {author}
            </UiText>
          ) : null}
          <UiText testID={`${testID}-counts`} tone="muted" variant="caption">
            {counts}
          </UiText>
        </View>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center', gap: CENTRED_GAP }} testID={testID}>
      {cover('header')}
      <UiText
        accessibilityRole="header"
        align="center"
        style={{ fontSize: TITLE_SIZE_HEADER, lineHeight: TITLE_LINE_HEIGHT_HEADER, marginTop: 4 }}
        testID={`${testID}-title`}
        variant="displaySm"
      >
        {title}
      </UiText>
      {author !== null ? (
        <UiText align="center" testID={`${testID}-author`} tone="muted" variant="subhead">
          {author}
        </UiText>
      ) : null}
      <UiText align="center" testID={`${testID}-counts`} tone="muted" variant="caption">
        {counts}
      </UiText>
    </View>
  );
}
