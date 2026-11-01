import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { AzkarSearchResultRow } from '@/features/azkar/components/AzkarSearchResultRow';
import { useAzkarSearch } from '@/features/azkar/data';

import { SearchMessage } from './SearchMessage';

/**
 * The «الأذكار» scope of search (ADR 0031): the Azkar entries whose text matches, one row each, opened in the Azkar
 * reader. Only text segments are searched, so no Quran text appears here. Mount it only when Azkar content is
 * installed; the search screen decides that.
 */
export function AzkarSearchResults({
  query,
  onOpen,
  testID = 'search-azkar-results',
}: {
  query: string;
  onOpen: (entryKey: string) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { entries } = useAzkarSearch(query);

  if (query.trim().length === 0) {
    return null;
  }
  if (entries.length === 0) {
    return (
      <View style={{ paddingTop: theme.space[4] }}>
        <SearchMessage message={t('search.noResults')} testID={`${testID}-empty`} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, minHeight: 240 }}>
      <FlashList
        data={entries}
        ItemSeparatorComponent={() => <View style={{ height: theme.space[2] }} />}
        keyExtractor={(hit) => hit.entryKey}
        renderItem={({ item, index }) => (
          <AzkarSearchResultRow
            highlight={item.highlight}
            number={index + 1}
            onPress={() => onOpen(item.entryKey)}
            preview={item.preview}
            testID={`${testID}-result-${index + 1}`}
          />
        )}
        showsVerticalScrollIndicator={false}
        testID={testID}
      />
    </View>
  );
}
