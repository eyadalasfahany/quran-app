import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { ListRow } from './ListRow';
import { UiText } from './UiText';
import { useContrastColors } from './useContrastColors';

const CLOCK = { ios: 'clock', android: 'schedule' } as const;
const REMOVE = { ios: 'xmark', android: 'close' } as const;

/**
 * The empty-query state of a search screen: the recent queries, each one tappable and removable, with a clear action
 * to empty them all. Renders nothing when there are none. The labels come from the caller, so each search names its
 * own history in its own words.
 */
export function RecentSearches({
  queries,
  title,
  clearLabel,
  removeLabel,
  onSelect,
  onRemove,
  onClear,
  testID = 'recent-searches',
}: {
  queries: readonly string[];
  title: string;
  clearLabel: string;
  /** The remove button's label for one query, e.g. «إزالة الصباح». */
  removeLabel: (query: string) => string;
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  if (queries.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: theme.space[3] }} testID={testID}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <UiText accessibilityRole="header" tone="muted" variant="caption" weight={600}>
          {title}
        </UiText>
        <Button label={clearLabel} onPress={onClear} size="small" testID={`${testID}-clear`} variant="ghost" />
      </View>
      {/* The rows draw their own separators, so the card has no inner padding (its style is applied after the padding token). */}
      <Card padding={1} style={{ overflow: 'hidden', padding: 0 }} testID={`${testID}-list`}>
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
                label={removeLabel(query)}
                onPress={() => onRemove(query)}
                testID={`${testID}-remove-${index}`}
                tone="muted"
              />
            }
          />
        ))}
      </Card>
    </View>
  );
}
