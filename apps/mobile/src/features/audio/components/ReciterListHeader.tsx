import { View } from 'react-native';

import { ScreenHeader } from '@/shared/ui';

import { ReciterFilterChips, type ReciterFilterOption } from './ReciterFilterChips';
import { ReciterSearchField } from './ReciterSearchField';

// The frame's column gap (12) between the title, search and chips, and the gap (12) between the chips and the
// first row. The header sits inside the list, so its bottom padding keeps that gap.
const FRAME_GAP = 12;

// The Listen tab's list header (quran-app-screens.html, #Reciters): the large title, the search field and the
// filter chips. It is the FlatList's ListHeaderComponent, so it scrolls with the rows.
export function ReciterListHeader<T extends string>({
  title,
  query,
  onQueryChange,
  searchPlaceholder,
  filterLabel,
  filterOptions,
  filter,
  onFilterChange,
  testID = 'reciter-list-header',
}: {
  title: string;
  query: string;
  onQueryChange: (text: string) => void;
  searchPlaceholder: string;
  filterLabel: string;
  filterOptions: readonly ReciterFilterOption<T>[];
  filter: T;
  onFilterChange: (value: T) => void;
  testID?: string;
}) {
  return (
    <View style={{ gap: FRAME_GAP, paddingBottom: FRAME_GAP }} testID={testID}>
      <ScreenHeader title={title} />
      <ReciterSearchField
        onChangeText={onQueryChange}
        placeholder={searchPlaceholder}
        testID="reciter-search"
        value={query}
      />
      <ReciterFilterChips<T> label={filterLabel} onSelect={onFilterChange} options={filterOptions} selected={filter} />
    </View>
  );
}
