import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { arabicTextDirection, Icon, UiText, useContrastColors } from '@/shared/ui';

import { countHadith } from '../counts';
import { chapterTitle } from '../titles';

const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' } as const;
const CHEVRON_SIZE = 16;

/**
 * A chapter row. On hold (Open question 2): built and tested, not wired by any screen until the chapter frames are approved.
 * The title is Arabic in both languages (D14), so it is drawn right to left.
 */
export function ChapterRow({
  chapter,
  onPress,
  testID = 'chapter-row',
}: {
  chapter: { chapterNumber: number; titleAr: string | null; hadithCount: number };
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const colors = useContrastColors();
  const title = chapterTitle(chapter, locale, t);
  const count = countHadith(chapter.hadithCount, locale, t);

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
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <UiText style={arabicTextDirection} testID={`${testID}-title`} variant="headline">
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
