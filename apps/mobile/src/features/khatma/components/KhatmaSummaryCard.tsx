import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { EmptyState, Icon, UiText, useContrastColors } from '@/shared/ui';

const BOOK_ICON = { ios: 'book.closed', android: 'menu_book' } as const;
// Forward-in-reading-direction like ListRow: right in LTR, mirrored to left in RTL.
const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' } as const;
const TRACK_HEIGHT = 4;

export function KhatmaSummaryCard({
  active,
  durationDays,
  dayIndex,
  pagesLoggedToday,
  todayTarget,
  onPress,
  testID = 'khatma-summary-card',
}: {
  active: boolean;
  durationDays?: number;
  dayIndex?: number;
  pagesLoggedToday?: number;
  todayTarget?: number;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const locale = useLocale();

  if (!active || durationDays === undefined || dayIndex === undefined) {
    return (
      <EmptyState
        action={{ label: t('khatma.summary.start'), onPress }}
        body={t('khatma.summary.emptyBody')}
        icon={BOOK_ICON}
        testID={`${testID}-empty`}
        title={t('khatma.summary.emptyTitle')}
      />
    );
  }

  const title = t('khatma.summary.planName', {
    count: durationDays,
    formatted: formatNumber(durationDays, locale),
  });
  const subtitle = t('khatma.summary.dayProgress', {
    day: formatNumber(dayIndex, locale),
    total: formatNumber(durationDays, locale),
  });
  const logged = pagesLoggedToday ?? 0;
  const target = todayTarget ?? 0;
  const percent = target > 0 ? Math.min(100, Math.round((logged / target) * 100)) : 0;
  const track = { borderRadius: TRACK_HEIGHT / 2, height: TRACK_HEIGHT };

  return (
    <Pressable
      accessibilityLabel={t('common.a11yPair', { label: title, title: subtitle })}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.lg,
        borderWidth: theme.stroke.hairline,
        gap: theme.space[2],
        opacity: pressed ? theme.opacity.pressed : 1,
        padding: theme.space[4],
      })}
      testID={testID}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }}>
        <View style={{ flex: 1, gap: theme.space[1] }}>
          <UiText variant="headline">{title}</UiText>
          <UiText tone="muted" variant="caption">
            {subtitle}
          </UiText>
          <View style={[track, { marginTop: theme.space[1], overflow: 'hidden' }]} testID={`${testID}-track`}>
            <View style={[track, { backgroundColor: theme.colors.fillSecondary }, StyleSheet.absoluteFill]} />
            <View style={[track, { backgroundColor: theme.colors.brand, width: `${percent}%` }]} testID={`${testID}-fill`} />
          </View>
        </View>
        <Icon color={theme.colors.inkMuted} mirrorInRtl name={CHEVRON} size={theme.size.iconSm} testID={`${testID}-chevron`} />
      </View>
    </Pressable>
  );
}
