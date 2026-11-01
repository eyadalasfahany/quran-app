import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { SIBHA_RING_SIZE } from '../data/ring-layout';
import { SibhaRoundsBadge } from './SibhaRoundsBadge';

const STROKE = 10;
// The Sibha frame sets the count at 120 with a line height of 1.
const COUNT_SIZE = 120;

/**
 * The misbaha's counter (quran-app-screens.html, #Sibha): a 280 pt ring toward the target, with the count in Amiri and
 * «من ١٠٠» under it. A completed round shows as a pill above the count. Without a target the ring stays empty, only the
 * count shows, and there are no rounds. The whole counter is one button with its value, so a screen reader hears the
 * count and can reset it. `size` is the ring's side; the count scales with it (ADR 0036).
 */
export function SibhaCounter({
  count,
  target,
  rounds = 0,
  onTap,
  onReset,
  size = SIBHA_RING_SIZE,
  testID = 'sibha-counter',
}: {
  count: number;
  target: number | null;
  rounds?: number;
  onTap: () => void;
  onReset: () => void;
  size?: number;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const countSize = Math.round((COUNT_SIZE * size) / SIBHA_RING_SIZE);
  const fraction = target === null ? 0 : Math.min(count / target, 1);
  const current = formatNumber(count, locale);
  const shownRounds = target === null ? 0 : rounds;
  const valueText = (() => {
    if (target === null) {
      return t('sibha.counter.plain', { current });
    }
    const total = formatNumber(target, locale);
    return shownRounds > 0
      ? t('sibha.counter.valueRound', { current, round: formatNumber(shownRounds, locale), total })
      : t('sibha.counter.value', { current, total });
  })();

  return (
    <Pressable
      accessibilityActions={[{ label: t('sibha.reset'), name: 'reset' }]}
      accessibilityHint={t('sibha.counter.hint')}
      accessibilityLabel={t('sibha.counter.label')}
      accessibilityRole="button"
      accessibilityValue={{ text: valueText }}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'reset') {
          onReset();
        }
      }}
      onPress={onTap}
      style={{ height: size, width: size }}
      testID={testID}
    >
      <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <Svg height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }} width={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            fill={theme.colors.surfaceRaised}
            r={radius}
            stroke={theme.colors.fillSecondary}
            strokeWidth={STROKE}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            fill="none"
            r={radius}
            stroke={theme.colors.brand}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fraction)}
            strokeLinecap="round"
            strokeWidth={STROKE}
            testID={`${testID}-ring`}
          />
        </Svg>
        <View style={{ alignItems: 'center', gap: theme.space[2] }}>
          <SibhaRoundsBadge rounds={shownRounds} testID={`${testID}-rounds`} />
          <UiText
            align="center"
            importantForAccessibility="no"
            style={{ fontSize: countSize, lineHeight: countSize }}
            testID={`${testID}-count`}
            variant="displayLg"
          >
            {current}
          </UiText>
        </View>
        {target === null ? null : (
          <UiText align="center" importantForAccessibility="no" tone="muted" variant="body">
            {t('sibha.counter.ofTarget', { total: formatNumber(target, locale) })}
          </UiText>
        )}
      </View>
    </Pressable>
  );
}
