import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

export const SIBHA_RING_SIZE = 280;
const STROKE = 10;
const RADIUS = (SIBHA_RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// The Sibha frame sets the count at 120 with a line height of 1.
const COUNT_SIZE = 120;

/**
 * The misbaha's counter (quran-app-screens.html, #Sibha): a 280 pt ring toward the target, with the count in Amiri and
 * «من ١٠٠» under it. Without a target the ring stays empty and only the count shows. The whole counter is one button
 * with its value, so a screen reader hears the count and can reset it.
 */
export function SibhaCounter({
  count,
  target,
  onTap,
  onReset,
  testID = 'sibha-counter',
}: {
  count: number;
  target: number | null;
  onTap: () => void;
  onReset: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const fraction = target === null ? 0 : Math.min(count / target, 1);
  const current = formatNumber(count, locale);
  const valueText =
    target === null
      ? t('sibha.counter.plain', { current })
      : t('sibha.counter.value', { current, total: formatNumber(target, locale) });

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
      style={{ height: SIBHA_RING_SIZE, width: SIBHA_RING_SIZE }}
      testID={testID}
    >
      <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <Svg height={SIBHA_RING_SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }} width={SIBHA_RING_SIZE}>
          <Circle
            cx={SIBHA_RING_SIZE / 2}
            cy={SIBHA_RING_SIZE / 2}
            fill={theme.colors.surfaceRaised}
            r={RADIUS}
            stroke={theme.colors.fillSecondary}
            strokeWidth={STROKE}
          />
          <Circle
            cx={SIBHA_RING_SIZE / 2}
            cy={SIBHA_RING_SIZE / 2}
            fill="none"
            r={RADIUS}
            stroke={theme.colors.brand}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
            strokeLinecap="round"
            strokeWidth={STROKE}
            testID={`${testID}-ring`}
          />
        </Svg>
        <UiText
          align="center"
          importantForAccessibility="no"
          style={{ fontSize: COUNT_SIZE, lineHeight: COUNT_SIZE }}
          testID={`${testID}-count`}
          variant="displayLg"
        >
          {current}
        </UiText>
        {target === null ? null : (
          <UiText align="center" importantForAccessibility="no" tone="muted" variant="body">
            {t('sibha.counter.ofTarget', { total: formatNumber(target, locale) })}
          </UiText>
        )}
      </View>
    </Pressable>
  );
}
