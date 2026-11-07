import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, Icon, UiText, useContrastColors } from '@/shared/ui';

const CLOCK = { ios: 'clock', android: 'schedule' } as const;
const REMOVE = { ios: 'xmark', android: 'close' } as const;

// Frame HadithCollSearch: each row is at least 52 high, with a 14 inset and a hairline between rows.
const ROW_MIN_HEIGHT = 52;
// Frame HadithCollSearch: the query is Amiri 17 (the display face at body size).
const QUERY_SIZE = 17;
const QUERY_LINE_HEIGHT = 26;

/**
 * The idle search's history: a title, a «مسح السجل» button and one card of recent queries, newest first. Tapping a
 * query runs it; the remove button drops that query only. Renders nothing for an empty list.
 */
export function HadithRecentSearches({
  queries,
  onSelect,
  onRemove,
  onClear,
  testID = 'hadith-recent-searches',
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
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: theme.space[1] }}>
        <UiText accessibilityRole="header" tone="muted" variant="caption" weight={600}>
          {t('hadith.search.recentTitle')}
        </UiText>
        <Pressable
          accessibilityLabel={t('hadith.search.clearRecent')}
          accessibilityRole="button"
          onPress={onClear}
          style={({ pressed }) => ({
            justifyContent: 'center',
            minHeight: theme.size.touchTarget,
            opacity: pressed ? theme.opacity.pressed : 1,
          })}
          testID={`${testID}-clear`}
        >
          <UiText tone="brand" variant="caption" weight={600}>
            {t('hadith.search.clearRecent')}
          </UiText>
        </Pressable>
      </View>
      <View
        style={{
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: colors.line,
          borderRadius: theme.radius.lg,
          borderWidth: theme.stroke.hairline,
          overflow: 'hidden',
        }}
      >
        {queries.map((query, index) => (
          <Pressable
            accessibilityLabel={query}
            accessibilityRole="button"
            key={query}
            onPress={() => onSelect(query)}
            style={({ pressed }) => ({
              alignItems: 'center',
              borderBottomColor: colors.line,
              borderBottomWidth: index < queries.length - 1 ? theme.stroke.hairline : 0,
              flexDirection: 'row',
              gap: theme.space[3],
              minHeight: ROW_MIN_HEIGHT,
              opacity: pressed ? theme.opacity.pressed : 1,
              paddingHorizontal: theme.size.downloadRowInset,
            })}
            testID={`${testID}-row-${query}`}
          >
            <Icon color={colors.inkMuted} name={CLOCK} size={20} />
            <UiText
              style={{ flex: 1, fontSize: QUERY_SIZE, lineHeight: QUERY_LINE_HEIGHT }}
              variant="dhikrList"
            >
              {query}
            </UiText>
            <IconButton
              icon={REMOVE}
              iconSize={18}
              label={t('hadith.search.removeRecent', { query })}
              onPress={() => onRemove(query)}
              testID={`${testID}-remove-${query}`}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
