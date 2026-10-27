import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, ListRow, UiText } from '@/shared/ui';

const REMOVE = { ios: 'xmark', android: 'close' } as const;

export function RecentSearches({
  queries,
  onSelect,
  onRemove,
  testID,
}: {
  queries: readonly string[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (queries.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <UiText variant="headline">{t('search.recentTitle')}</UiText>
      {queries.map((query) => (
        <ListRow
          key={query}
          onPress={() => onSelect(query)}
          separator="line"
          testID={testID ? `${testID}-${query}` : undefined}
          title={query}
          trailing={
            <IconButton
              icon={REMOVE}
              label={t('search.removeRecent', { query })}
              onPress={() => onRemove(query)}
              testID={testID ? `${testID}-remove-${query}` : undefined}
            />
          }
        />
      ))}
    </View>
  );
}
