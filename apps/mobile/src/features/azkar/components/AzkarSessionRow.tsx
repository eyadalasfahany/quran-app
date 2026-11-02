import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, UiText, useContrastColors } from '@/shared/ui';

import { AzkarProgressRing } from './AzkarProgressRing';

const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' } as const;

/**
 * One session category on Azkar home (quran-app-screens.html, #AzkarHome): its name, «١٢ من ٢٤», and a progress ring.
 * A completed session says so in its label.
 */
export function AzkarSessionRow({
  title,
  progressText,
  fraction,
  completed,
  separator = true,
  onPress,
  testID = 'azkar-session-row',
}: {
  title: string;
  progressText: string;
  fraction: number;
  completed: boolean;
  separator?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const label = completed
    ? t('common.a11yTriple', { label: title, title: progressText, detail: t('azkar.browse.completed') })
    : t('common.a11yPair', { label: title, title: progressText });

  return (
    <Pressable
      accessibilityLabel={label}
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
        <UiText variant="body" weight={600}>
          {title}
        </UiText>
        <UiText tone="muted" variant="caption">
          {progressText}
        </UiText>
      </View>
      <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={16} />
      <AzkarProgressRing completed={completed} fraction={fraction} testID={`${testID}-ring`} />
    </Pressable>
  );
}
