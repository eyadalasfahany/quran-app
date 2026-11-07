import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { AzkarSearchResultRow } from '@/features/azkar/components/AzkarSearchResultRow';
import { AzkarSectionTitle } from '@/features/azkar/components/AzkarSectionTitle';
import { AzkarTopicTile } from '@/features/azkar/components/AzkarTopicTile';
import { useAzkarCategories, useAzkarSearch } from '@/features/azkar/data';
import { EmptyState } from '@/shared/ui';

const SEARCH_ICON = { ios: 'magnifyingglass', android: 'search' } as const;

/**
 * The «الأذكار» scope of search (ADR 0031, screens/ #AzkarSearch): the chapters whose title matches,
 * then the dhikr whose text matches, each opened in the Azkar reader. Only text segments are searched, so no Quran
 * text appears here. Mount it only when Azkar content is installed; the search screen decides that.
 *
 * `pending` means the query is still debouncing. Stale results may stay on screen, but the empty state waits, so a
 * scope switch or a fast typist never flashes «لا توجد نتائج» for a query that has not settled yet.
 */
export function AzkarSearchResults({
  query,
  pending,
  onOpenChapter,
  onOpenEntry,
  testID = 'search-azkar-results',
}: {
  query: string;
  pending: boolean;
  onOpenChapter: (categoryId: string) => void;
  onOpenEntry: (entryKey: string) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const { entries, categoryIds } = useAzkarSearch(query);
  const categories = useAzkarCategories(locale);

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const chapters = categoryIds
    .map((id) => categoryById.get(id))
    .filter((category) => category !== undefined);

  if (chapters.length === 0 && entries.length === 0) {
    if (pending || query.trim().length === 0) {
      return null;
    }
    return (
      <View style={{ flex: 1, paddingTop: theme.space[8] }}>
        <EmptyState
          body={t('search.azkarNoResultsSuggestion')}
          icon={SEARCH_ICON}
          testID={`${testID}-empty`}
          title={t('search.azkarNoResultsTitle')}
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ gap: theme.space[5], paddingBottom: theme.space[8] }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ flex: 1 }}
      testID={testID}
    >
      {chapters.length > 0 ? (
        <View style={{ gap: theme.space[3] }}>
          <AzkarSectionTitle testID={`${testID}-chapters`} title={t('search.azkarChaptersHeading')} />
          {chapters.map((category) => (
            <AzkarTopicTile
              countText={t('azkar.browse.topicCount', {
                count: category.unitCount,
                number: formatNumber(category.unitCount, locale),
              })}
              key={category.id}
              onPress={() => onOpenChapter(category.id)}
              testID={`${testID}-chapter-${category.id}`}
              title={t(`azkar.categories.${category.id}` as never)}
            />
          ))}
        </View>
      ) : null}
      {entries.length > 0 ? (
        <View style={{ gap: theme.space[3] }}>
          <AzkarSectionTitle testID={`${testID}-entries`} title={t('search.azkarEntriesHeading')} />
          {entries.map((hit, index) => (
            <AzkarSearchResultRow
              highlight={hit.highlight}
              key={hit.entryKey}
              number={index + 1}
              onPress={() => onOpenEntry(hit.entryKey)}
              preview={hit.preview}
              testID={`${testID}-result-${index + 1}`}
            />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
