import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { formatNumber, formatPercent, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { Icon, UiText, useContrastColors } from '@/shared/ui';

const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' } as const;
// #Main khatma ring (quran-app-screens.html): 60×60, r=25, stroke 5.
const RING_SIZE = 60;
const RING_RADIUS = 25;
const RING_STROKE = 5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function computeAheadDays(
  pagesRead: number,
  pagesTotal: number,
  dayIndex: number,
  durationDays: number,
): number {
  const expected = (pagesTotal * dayIndex) / durationDays;
  return Math.floor(((pagesRead - expected) * durationDays) / pagesTotal);
}

export function HomeWirdCard({
  dayIndex,
  durationDays,
  pagesRead,
  pagesTotal,
  onPress,
  testID = 'home-wird-card',
}: {
  dayIndex: number;
  durationDays: number;
  pagesRead: number;
  pagesTotal: number;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const locale = useLocale();

  const fraction = pagesTotal > 0 ? Math.min(1, pagesRead / pagesTotal) : 0;
  const percent = Math.round(fraction * 100);
  const percentLabel = formatPercent(percent, locale);
  const dashOffset = RING_CIRCUMFERENCE * (1 - fraction);

  const aheadDays = useMemo(
    () => computeAheadDays(pagesRead, pagesTotal, dayIndex, durationDays),
    [dayIndex, durationDays, pagesRead, pagesTotal],
  );

  const dayFormatted = formatNumber(dayIndex, locale);
  const totalFormatted = formatNumber(durationDays, locale);
  const subtitleBase = t('khatma.home.subtitle', { day: dayFormatted, total: totalFormatted });
  const subtitle =
    aheadDays >= 1
      ? `${subtitleBase} · ${t('khatma.home.ahead', { count: aheadDays, formatted: formatNumber(aheadDays, locale) })}`
      : subtitleBase;
  const title = t('khatma.home.title');

  return (
    <Pressable
      accessibilityLabel={t('common.a11yTriple', { label: title, title: subtitle, detail: percentLabel })}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.lg,
        borderWidth: theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[4],
        opacity: pressed ? theme.opacity.pressed : 1,
        paddingHorizontal: theme.size.sectionGap,
        paddingVertical: theme.space[4],
      })}
      testID={testID}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ height: RING_SIZE, width: RING_SIZE }}
        testID={`${testID}-ring`}
      >
        <Svg height={RING_SIZE} viewBox="0 0 60 60" width={RING_SIZE}>
          {/* Track stroke: fillSecondary (Main frame bone track). */}
          <Circle
            cx={30}
            cy={30}
            fill="none"
            r={RING_RADIUS}
            stroke={theme.colors.fillSecondary}
            strokeWidth={RING_STROKE}
          />
          <Circle
            cx={30}
            cy={30}
            fill="none"
            r={RING_RADIUS}
            stroke={theme.colors.brand}
            strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            strokeWidth={RING_STROKE}
            transform="rotate(-90 30 30)"
          />
        </Svg>
        <View
          style={{
            alignItems: 'center',
            bottom: 0,
            justifyContent: 'center',
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
          }}
        >
          <UiText testID={`${testID}-percent`} variant="subhead" weight={700}>
            {percentLabel}
          </UiText>
        </View>
      </View>
      <View style={{ flex: 1, gap: theme.space[1] }}>
        <UiText testID={`${testID}-title`} variant="headline">
          {title}
        </UiText>
        <UiText testID={`${testID}-subtitle`} tone="muted" variant="caption">
          {subtitle}
        </UiText>
      </View>
      <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={theme.size.iconMd} testID={`${testID}-chevron`} />
    </Pressable>
  );
}
