import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ListRow, uiTextProps, useContrastColors } from '@/shared/ui';

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
  const colors = useContrastColors();

  if (queries.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <Text {...uiTextProps('headline')} style={[theme.text.headline, { color: theme.colors.ink }]}>
        {t('search.recentTitle')}
      </Text>
      {queries.map((query) => (
        <ListRow
          key={query}
          onPress={() => onSelect(query)}
          separator="line"
          testID={testID ? `${testID}-${query}` : undefined}
          title={query}
          trailing={
            <Pressable
              accessibilityLabel={t('search.removeRecent', { query })}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => onRemove(query)}
              style={{ alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44 }}
              testID={testID ? `${testID}-remove-${query}` : undefined}
            >
              <Text {...uiTextProps('headline')} style={[theme.text.headline, { color: colors.inkMuted }]}>
                ×
              </Text>
            </Pressable>
          }
        />
      ))}
    </View>
  );
}
