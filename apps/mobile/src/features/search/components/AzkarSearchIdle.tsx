import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { AzkarRecentSearches } from '@/features/azkar/components/AzkarRecentSearches';
import { UiText } from '@/shared/ui';

/**
 * The empty-query state of the Azkar scope (quran-app-screens.html, #AzkarSearchEmpty): the recent queries, each
 * tappable and removable, with «مسح السجل» to clear them, then the line that says what a search finds.
 */
export function AzkarSearchIdle({
  queries,
  onSelect,
  onRemove,
  onClear,
  testID = 'search-azkar-idle',
}: {
  queries: readonly string[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[4] }} testID={testID}>
      <AzkarRecentSearches
        onClear={onClear}
        onRemove={onRemove}
        onSelect={onSelect}
        queries={queries}
        testID={`${testID}-recent`}
      />
      <UiText testID={`${testID}-hint`} tone="muted" variant="caption">
        {t('search.azkarIdleHint')}
      </UiText>
    </View>
  );
}
