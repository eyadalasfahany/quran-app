import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { arabicTextDirection } from './textStyles';
import { highlightFill } from './highlight';
import { Icon } from './Icon';
import { UiText } from './UiText';
import { useContrastColors } from './useContrastColors';

const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' } as const;

/**
 * A matching category in search (screens/, #AzkarSearch and #DuasSearch «التصنيفات»): the name with its match
 * highlighted, the count under it, and a trailing chevron that points forward in each direction.
 */
export function SearchCategoryRow({
  title,
  highlight,
  countText,
  onPress,
  testID = 'search-category-row',
}: {
  title: string;
  highlight: { start: number; end: number } | null;
  countText: string;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const fill = highlightFill(theme.colors, 'gold');

  const before = highlight ? title.slice(0, highlight.start) : title;
  const match = highlight ? title.slice(highlight.start, highlight.end) : '';
  const after = highlight ? title.slice(highlight.end) : '';

  return (
    <Pressable
      accessibilityLabel={t('common.a11yPair', { label: title, title: countText })}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: pressed ? theme.colors.fillSecondary : theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.card,
        borderWidth: theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[3],
        minHeight: theme.size.touchTarget,
        paddingHorizontal: theme.space[4],
        paddingVertical: theme.space[3],
      })}
      testID={testID}
    >
      <View style={{ flex: 1, gap: theme.space[1] }}>
        <UiText style={arabicTextDirection} variant="body" weight={600}>
          {before}
          {match ? <Text style={fill ? { backgroundColor: fill } : undefined}>{match}</Text> : null}
          {after}
        </UiText>
        <UiText style={{ color: colors.inkMuted }} testID={`${testID}-count`} variant="caption">
          {countText}
        </UiText>
      </View>
      <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={theme.size.iconMd} />
    </Pressable>
  );
}
