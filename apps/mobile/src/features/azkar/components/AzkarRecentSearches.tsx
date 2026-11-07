import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button, Icon, IconButton, ListRow, UiText, useContrastColors } from '@/shared/ui';
import { AzkarListCard } from './AzkarListCard';

const CLOCK = { ios: 'clock', android: 'schedule' } as const;
const REMOVE = { ios: 'xmark', android: 'close' } as const;

/**
 * The empty-query state of Azkar search (screens/, #AzkarSearchEmpty): the recent queries, each one
 * tappable and removable, with «مسح السجل» to clear them all. Renders nothing when there are none.
 */
export function AzkarRecentSearches({
  queries,
  onSelect,
  onRemove,
  onClear,
  testID = 'azkar-recent-searches',
}: {
  queries: readonly string[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();

  if (queries.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: theme.space[3] }} testID={testID}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <UiText accessibilityRole="header" tone="muted" variant="caption" weight={600}>
          {t('azkar.search.recentTitle')}
        </UiText>
        <Button label={t('azkar.search.clear')} onPress={onClear} size="small" testID={`${testID}-clear`} variant="ghost" />
      </View>
      <AzkarListCard>
        {queries.map((query, index) => (
          <ListRow
            chevron={false}
            key={query}
            leading={<Icon color={colors.inkMuted} name={CLOCK} size={18} />}
            onPress={() => onSelect(query)}
            separator={index < queries.length - 1 ? 'line' : undefined}
            testID={`${testID}-${index}`}
            title={query}
            trailing={
              <IconButton
                icon={REMOVE}
                label={t('azkar.search.removeRecent', { query })}
                onPress={() => onRemove(query)}
                testID={`${testID}-remove-${index}`}
                tone="muted"
              />
            }
          />
        ))}
      </AzkarListCard>
    </View>
  );
}
