import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, QuranText, UiText, useContrastColors } from '@/shared/ui';

const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' } as const;

/**
 * One Quranic dua in a surah section: the full verse text in the Quran face (never truncated), its ayah label beneath,
 * and a chevron. The accessible name is the surah and the ayah label, not the verse (the verse is not read out as a name).
 */
export function DuaQuranListRow({
  text,
  surahName,
  ayahLabel,
  onPress,
  separator = true,
  testID = 'dua-quran-list-row',
}: {
  text: string;
  surahName: string;
  ayahLabel: string;
  onPress: () => void;
  separator?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <Pressable
      accessibilityLabel={t('duas.quran.rowLabel', { surah: surahName, ayah: ayahLabel })}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        borderBottomColor: colors.line,
        borderBottomWidth: separator ? theme.stroke.hairline : 0,
        flexDirection: 'row',
        gap: theme.space[3],
        minHeight: theme.size.touchTarget,
        opacity: pressed ? theme.opacity.pressed : 1,
        paddingHorizontal: theme.space[4],
        paddingVertical: theme.space[3],
      })}
      testID={testID}
    >
      <View style={{ flex: 1, gap: theme.space[1] }}>
        <QuranText align="start" variant="quranResult">
          {text}
        </QuranText>
        <UiText tone="muted" variant="caption">
          {ayahLabel}
        </UiText>
      </View>
      <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={16} />
    </Pressable>
  );
}
