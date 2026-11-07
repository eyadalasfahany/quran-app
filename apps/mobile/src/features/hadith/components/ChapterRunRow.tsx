import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { Icon, type IconName, UiText, useContrastColors } from '@/shared/ui';

import { countHadith } from '../counts';
import { runTitle } from '../titles';

const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' } as const;
const CHEVRON_SIZE = 16;
const LIST_ICON: IconName = { ios: 'list.bullet', android: 'format_list_bulleted' };
const LIST_ICON_SIZE = 20;

/**
 * A run of hadith that belong to no chapter (ADR 0076, option B). It sits in the chapter list in place and opens those
 * hadith. Same card as `ChapterRow`, with a small muted list icon instead of a number.
 */
export function ChapterRunRow({
  run,
  onPress,
  testID = 'chapter-run-row',
}: {
  run: { firstNumber: string; lastNumber: string; count: number };
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const colors = useContrastColors();
  const title = runTitle(run, locale, t);
  const count = countHadith(run.count, locale, t);

  return (
    <Pressable
      accessibilityLabel={`${title}, ${count}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderRadius: theme.radius.lg,
        flexDirection: 'row',
        gap: theme.space[3],
        minHeight: theme.size.indexRowMinHeight,
        opacity: pressed ? theme.opacity.pressed : 1,
        padding: theme.space[4],
      })}
      testID={testID}
    >
      <Icon color={colors.inkMuted} name={LIST_ICON} size={LIST_ICON_SIZE} testID={`${testID}-icon`} />
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <UiText tone="muted" testID={`${testID}-title`} variant="headline">
          {title}
        </UiText>
        <UiText testID={`${testID}-count`} tone="muted" variant="label" weight={400}>
          {count}
        </UiText>
      </View>
      <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={CHEVRON_SIZE} testID={`${testID}-chevron`} />
    </Pressable>
  );
}
